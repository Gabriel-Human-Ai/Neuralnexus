import { db } from "@/lib/db";
import { createProfileDecisionRecord } from "@/lib/decision-record";
import { pickMetaModel } from "@/lib/meta-model";
import { runChat, type ChatMsg } from "@/lib/providers";
import { estimateCost } from "@/lib/tokens";
import { getProfileSetting } from "@/lib/settings";
import { PROFILE_DIMENSIONS, type ProfileDimension } from "@/lib/profile-signals";
import { withProviderProfile } from "@/lib/provider-scope";

const SIGNAL_READER_PROMPT = `You are the Signal Reader inside a system that builds a person's portable AI-personality profile. You do not talk to the person. You read how they write and extract durable, useful truths about how they want AIs to treat them.

Language carries more than content. Read for the signal beneath the words:

- RESISTANCE: "but", "actually", "I don't think", "not quite", pushback, correction of the assistant → the person has a standard the assistant missed. What is it?
- UNFAMILIARITY: repeated "what does X mean", asking a term to be explained, simplified restatements → the person is not fluent in this domain's jargon. Note the domain and the direction (wants simpler).
- FLUENCY: correct use of specialized terms, shorthand, impatience with over-explanation → the person is expert here; wants density, not basics.
- DENSITY PREFERENCE: "shorter", "tl;dr", "just the answer", OR "explain more", "walk me through" → how much the person wants.
- TONE PREFERENCE: formality, slang, warmth, bluntness, humor in their own writing → mirror-worthy register.
- EMOTIONAL REGISTER: frustration, excitement, caution, overwhelm → how to meet them.
- DECISION STYLE: how they choose between options, what they reject and why, what they consistently value.
- VALUES & TASTE: recurring aesthetic or judgment patterns ("too generic", "I like it clean", "no buzzwords").
- IDENTITY & CONTEXT: stable facts they volunteer about themselves, their work, their goals — only if clearly stated, never guessed.

Rules of evidence:
- Extract only what THIS person's own words support. Never infer beyond the evidence. Never diagnose, label, or psychologize the person. Describe preferences and patterns, not character.
- Prefer durable patterns over one-off reactions. A single "make it shorter" is weak; a repeated pattern is strong.
- Ignore the topic they are discussing. You capture how they want to be communicated with, not what they happened to ask about.
- If nothing durable is present, return an empty list. Most messages yield nothing. That is correct.
- Each signal must be actionable: it should change how a future AI addresses, writes for, or creates for this person.

Return ONLY valid JSON:
{"signals":[
  {"dimension":"address_and_tone"|"answer_style"|"working_style"|"visual_taste",
   "insight":"<≤90 chars, second-person, plain language, e.g. 'You prefer plain language over technical jargon.'>",
   "evidence":"<≤120 chars: what in their words shows this>",
   "strength":"weak"|"moderate"|"strong",
   "direction":"<one of: prefers|avoids|is_expert_in|is_new_to|values|dislikes>"}
]}
Never include the person's private content in the insight text. Generalize the pattern.`;

type ReaderSignal = {
  dimension: ProfileDimension;
  insight: string;
  evidence: string;
  strength: "weak" | "moderate" | "strong";
  direction: "prefers" | "avoids" | "is_expert_in" | "is_new_to" | "values" | "dislikes";
};

export type SurfacedProfileMemory = {
  id: string;
  dimension: ProfileDimension;
  insight: string;
  evidence: string;
};

const ACTIVE_SOURCE = "signal-reader";
const EVIDENCE_SOURCE = "signal-reader-evidence";

function clean(value: string, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalize(value: string) {
  return clean(value, 160).toLowerCase().replace(/[^a-z0-9äöüß]+/gi, " ").trim();
}

function strengthToConfidence(strength: ReaderSignal["strength"]) {
  return strength === "strong" ? 3 : strength === "moderate" ? 2 : 1;
}

function isDimension(value: unknown): value is ProfileDimension {
  return typeof value === "string" && PROFILE_DIMENSIONS.includes(value as ProfileDimension);
}

function parseSignals(text: string): ReaderSignal[] {
  try {
    const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(json);
    const signals = Array.isArray(parsed?.signals) ? parsed.signals : [];
    return signals
      .filter((signal: any) => isDimension(signal.dimension))
      .filter((signal: any) => ["weak", "moderate", "strong"].includes(signal.strength))
      .map((signal: any) => ({
        dimension: signal.dimension,
        insight: clean(signal.insight, 90),
        evidence: clean(signal.evidence, 120),
        strength: signal.strength,
        direction: signal.direction,
      }))
      .filter((signal: ReaderSignal) => signal.insight && signal.evidence);
  } catch {
    return [];
  }
}

function shouldRunReader(userTurns: string[], latestInput: string) {
  const latest = clean(latestInput, 4000);
  return latest.length > 200 || userTurns.length % 3 === 0;
}

async function isLearningPaused(profileId: string) {
  return (await getProfileSetting(profileId, "PROFILE_LEARNING_PAUSED")) === "true";
}

async function similarRecord(profileId: string, dimension: ProfileDimension, insight: string, statuses: string[]) {
  const records = await db.decisionRecord.findMany({
    where: { profileId, source: { in: [ACTIVE_SOURCE, EVIDENCE_SOURCE] }, contextTag: dimension, status: { in: statuses } },
    orderBy: { updatedAt: "desc" },
    take: 120,
  });
  const wanted = normalize(insight);
  return records.find((record) => normalize(record.chosenDesc) === wanted) ?? null;
}

async function graduateSignal(profileId: string, signal: ReaderSignal): Promise<SurfacedProfileMemory | null> {
  const removed = await similarRecord(profileId, signal.dimension, signal.insight, ["removed"]);
  if (removed) return null;

  const active = await similarRecord(profileId, signal.dimension, signal.insight, ["active"]);
  if (active) {
    await db.decisionRecord.update({
      where: { id: active.id },
      data: {
        confidence: Math.min(5, active.confidence + 1),
        evidence: signal.evidence,
        note: signal.direction,
      },
    });
    return null;
  }

  if (signal.strength === "weak") {
    await createProfileDecisionRecord({
      profileId,
      contextTag: signal.dimension,
      chosenDesc: signal.insight,
      evidence: signal.evidence,
      confidence: 1,
      status: "evidence",
      medium: "text",
      source: EVIDENCE_SOURCE,
      note: signal.direction,
    });
    const evidenceCount = await db.decisionRecord.count({
      where: {
        profileId,
        source: EVIDENCE_SOURCE,
        status: "evidence",
        contextTag: signal.dimension,
        chosenDesc: signal.insight,
      },
    });
    if (evidenceCount < 3) return null;
  }

  const record = await createProfileDecisionRecord({
    profileId,
    contextTag: signal.dimension,
    chosenDesc: signal.insight,
    evidence: signal.evidence,
    confidence: strengthToConfidence(signal.strength === "weak" ? "moderate" : signal.strength),
    status: "active",
    medium: "text",
    source: ACTIVE_SOURCE,
    note: signal.direction,
  });

  return { id: record.id, dimension: signal.dimension, insight: signal.insight, evidence: signal.evidence };
}

export async function runSignalReader(args: {
  profileId: string;
  latestInput: string;
  history: { role: "user" | "assistant"; content: string }[];
}) {
  if (await isLearningPaused(args.profileId)) return { memories: [] as SurfacedProfileMemory[], skipped: "paused" as const };

  const userTurns = [
    ...args.history.filter((message) => message.role === "user").map((message) => message.content),
    args.latestInput,
  ].filter(Boolean);
  if (!shouldRunReader(userTurns, args.latestInput)) return { memories: [] as SurfacedProfileMemory[], skipped: "batch" as const };

  const meta = await withProviderProfile(args.profileId, () => pickMetaModel());
  if (!meta) return { memories: [] as SurfacedProfileMemory[], skipped: "no_model" as const };

  const recentUserText = userTurns.slice(-3).map((turn, index, arr) => `User turn ${index + 1} of ${arr.length}: ${clean(turn, 600)}`).join("\n\n");
  const messages: ChatMsg[] = [
    { role: "system", content: SIGNAL_READER_PROMPT },
    { role: "user", content: recentUserText },
  ];

  const result = await withProviderProfile(args.profileId, () => runChat(meta.provider, meta.id, messages, { temperature: 0, maxTokens: 500 }));
  const project = await db.project.findFirst({ where: { profileId: args.profileId }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (project) {
    await db.modelRun.create({
      data: {
        profileId: args.profileId,
        projectId: project.id,
        provider: meta.provider,
        model: meta.id,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: estimateCost(meta.id, result.inputTokens, result.outputTokens),
        purpose: "signal-reader",
      },
    }).catch(() => {});
  }

  const candidates = parseSignals(result.text);
  const memories: SurfacedProfileMemory[] = [];
  for (const signal of candidates) {
    const memory = await graduateSignal(args.profileId, signal);
    if (memory && signal.dimension !== "address_and_tone") memories.push(memory);
    if (memory && signal.dimension === "address_and_tone" && !/frustrat|overwhelm|excited|caution|emotional/i.test(signal.insight)) memories.push(memory);
  }
  return { memories };
}

export async function runSignalReaderForNotice(args: {
  profileId: string;
  latestInput: string;
  history: { role: "user" | "assistant"; content: string }[];
}, timeoutMs = 1200) {
  const reader = runSignalReader(args).catch(() => ({ memories: [] as SurfacedProfileMemory[], skipped: "error" as const }));
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ memories: SurfacedProfileMemory[]; skipped: "timeout" }>((resolve) => {
    timeoutId = setTimeout(() => resolve({ memories: [], skipped: "timeout" }), timeoutMs);
  });
  const result = await Promise.race([reader, timeout]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
}

export async function buildProfileDirective(profileId: string) {
  const rows = await db.decisionRecord.findMany({
    where: { profileId, source: ACTIVE_SOURCE, status: "active" },
    orderBy: [{ confidence: "desc" }, { updatedAt: "desc" }],
    take: 12,
    select: { contextTag: true, chosenDesc: true },
  });
  if (!rows.length) return "";

  return [
    "Adapt to the user's kept NeuralNexus profile:",
    ...rows.map((row) => `- ${row.contextTag.replaceAll("_", " ")}: ${clean(row.chosenDesc, 140)}`),
    "Use only these kept preferences. Do not mention that you are using them unless asked.",
  ].join("\n");
}

export async function listLivingProfileMemories(profileId: string) {
  return db.decisionRecord.findMany({
    where: { profileId, source: ACTIVE_SOURCE, status: "active" },
    orderBy: [{ confidence: "desc" }, { updatedAt: "desc" }],
    select: { id: true, contextTag: true, chosenDesc: true, evidence: true, confidence: true, updatedAt: true },
  });
}

export async function removeLivingProfileMemory(profileId: string, id: string) {
  return db.decisionRecord.updateMany({
    where: { id, profileId, source: ACTIVE_SOURCE },
    data: { status: "removed" },
  });
}

export async function clearLivingProfile(profileId: string) {
  return db.decisionRecord.updateMany({
    where: { profileId, source: { in: [ACTIVE_SOURCE, EVIDENCE_SOURCE] } },
    data: { status: "removed" },
  });
}

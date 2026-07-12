import crypto from "crypto";
import { db } from "@/lib/db";
import { AMBIENT_CONSENT_KEY } from "@/lib/living-profile";
import { resolveProfileId } from "@/lib/scope";
import { getProfileSetting, setProfileSetting } from "@/lib/settings";

export const CONSENT_PERSONAL_KEY = AMBIENT_CONSENT_KEY;
export const CONSENT_NETWORK_KEY = "CONSENT_NETWORK";
export const CONSENT_RESEARCH_KEY = "CONSENT_RESEARCH";
export const JUDGMENT_CONTRIBUTION_STORE_KEY = "JUDGMENT_CONTRIBUTIONS_LOCAL";
export const JUDGMENT_MIN_LOCAL_FREQUENCY = 2;

export const JUDGMENT_CONSENT_COPY = {
  network: "Contribute anonymized patterns of how you judge and correct AI — never your content, names, or words. In return, you get collective intelligence: what professionals in your field consistently prefer. Off by default.",
  research: "Allow your anonymized patterns to become part of the aggregated judgment dataset that helps train better, more human-aligned AI. Fully anonymous. You can withdraw anytime, and your patterns are removed.",
} as const;

export type JudgmentContribution = {
  anonId: string;
  domainTag: string;
  patternType: string;
  patternHash: string;
  dimension: string;
  strength: number;
  ts: string;
};

export type JudgmentContributionReport = {
  contributions: JudgmentContribution[];
  withheld: number;
  minLocalFrequency: number;
  endpointConfigured: boolean;
  consent: {
    personal: boolean;
    network: boolean;
    research: boolean;
  };
};

type ContributionCandidate = {
  domainTag: string;
  patternType: "correction" | "preference" | "rejection" | "taste";
  dimension: "address_and_tone" | "answer_style" | "working_style" | "visual_taste";
  strength: number;
  seed: string;
};

type StoredContributionSet = {
  network: JudgmentContribution[];
  research: JudgmentContribution[];
  updatedAt: string;
};

export async function getJudgmentConsent(profileId: string) {
  const [personal, network, research] = await Promise.all([
    getProfileSetting(profileId, CONSENT_PERSONAL_KEY),
    getProfileSetting(profileId, CONSENT_NETWORK_KEY),
    getProfileSetting(profileId, CONSENT_RESEARCH_KEY),
  ]);
  return {
    personal: personal === "true",
    network: personal === "true" && network === "true",
    research: personal === "true" && network === "true" && research === "true",
  };
}

export async function updateJudgmentConsent(profileId: string, patch: Partial<{ personal: boolean; network: boolean; research: boolean }>) {
  const current = await getJudgmentConsent(profileId);
  const next = {
    personal: patch.personal ?? current.personal,
    network: patch.network ?? current.network,
    research: patch.research ?? current.research,
  };

  if (!next.personal) {
    next.network = false;
    next.research = false;
  }
  if (!next.network) next.research = false;
  if (next.research) {
    next.personal = true;
    next.network = true;
  }
  if (next.network) next.personal = true;

  await Promise.all([
    setProfileSetting(profileId, CONSENT_PERSONAL_KEY, next.personal ? "true" : ""),
    setProfileSetting(profileId, CONSENT_NETWORK_KEY, next.network ? "true" : ""),
    setProfileSetting(profileId, CONSENT_RESEARCH_KEY, next.research ? "true" : ""),
  ]);

  if (!next.network) await withdrawJudgmentContributions(profileId, "network");
  else if (!next.research) await withdrawJudgmentContributions(profileId, "research");

  return next;
}

export async function withdrawJudgmentContributions(profileId: string, level: "network" | "research") {
  const stored = await readStoredContributions(profileId);
  const next: StoredContributionSet = level === "network"
    ? { network: [], research: [], updatedAt: new Date().toISOString() }
    : { ...stored, research: [], updatedAt: new Date().toISOString() };
  await writeStoredContributions(profileId, next);
  return { deleted: level === "network" ? stored.network.length + stored.research.length : stored.research.length };
}

export async function toContribution(profileIdArg?: string): Promise<JudgmentContribution[]> {
  const report = await prepareJudgmentContributionReport(profileIdArg);
  return report.contributions;
}

export async function prepareJudgmentContributionReport(profileIdArg?: string): Promise<JudgmentContributionReport> {
  const profileId = await resolveProfileId(profileIdArg);
  const consent = await getJudgmentConsent(profileId);
  const candidates = await collectCandidates(profileId);
  const frequencies = new Map<string, number>();
  candidates.forEach((candidate) => frequencies.set(candidate.seed, (frequencies.get(candidate.seed) ?? 0) + 1));

  const contributions = candidates
    .filter((candidate) => (frequencies.get(candidate.seed) ?? 0) >= JUDGMENT_MIN_LOCAL_FREQUENCY)
    .map((candidate) => contributionFromCandidate(profileId, candidate));

  await assertContributionSafe(contributions, profileId);
  return {
    contributions,
    withheld: candidates.length - contributions.length,
    minLocalFrequency: JUDGMENT_MIN_LOCAL_FREQUENCY,
    endpointConfigured: Boolean(process.env.INDEX_ENDPOINT),
    consent,
  };
}

export async function syncJudgmentLayer(reason = "finalize", profileIdArg?: string) {
  const profileId = await resolveProfileId(profileIdArg);
  const consent = await getJudgmentConsent(profileId);
  if (!consent.personal) return { skipped: true, reason: "personal_consent_off" };
  if (!consent.network) return { skipped: true, reason: "network_consent_off" };

  const endpoint = process.env.INDEX_ENDPOINT;
  const report = await prepareJudgmentContributionReport(profileId);
  await storeLocalContributions(profileId, report.contributions, consent.research);

  if (!endpoint) return { skipped: true, reason: "endpoint_unset", contributions: report.contributions.length, withheld: report.withheld };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, contributions: report.contributions }),
  });
  if (!response.ok) throw new Error(`Judgment layer sync failed: ${response.status}`);
  const payload = await response.json().catch(() => ({}));
  const guards = await ingestCollectivePayload(payload);
  return { skipped: false, contributions: report.contributions.length, guards };
}

export async function judgmentAssetStats(profileId: string) {
  const stored = await readStoredContributions(profileId);
  const domains = new Set([...stored.network, ...stored.research].map((item) => item.domainTag));
  const report = await prepareJudgmentContributionReport(profileId);
  return {
    contributed: stored.network.length,
    research: stored.research.length,
    domains: domains.size,
    pending: report.contributions.length,
    withheld: report.withheld,
    minLocalFrequency: report.minLocalFrequency,
    endpointConfigured: report.endpointConfigured,
    consent: report.consent,
  };
}

export async function assertContributionSafe(contribution: JudgmentContribution | JudgmentContribution[], profileId: string) {
  const serialized = JSON.stringify(contribution).toLowerCase();
  const forbiddenKeys = [
    "claimText",
    "correctionText",
    "draftContent",
    "finalContent",
    "prompt",
    "content",
    "instructions",
    "name",
    "goal",
    "rules",
    "email",
    "userId",
    "projectId",
    "outputId",
    "profileId",
  ];
  for (const key of forbiddenKeys) {
    if (serialized.includes(`"${key.toLowerCase()}":`)) throw new Error(`Judgment payload contains forbidden key: ${key}`);
  }
  for (const fragment of await sensitiveFragments(profileId)) {
    if (fragment.length >= 40 && serialized.includes(fragment.toLowerCase())) {
      console.error("Judgment payload redaction guard blocked a content leak.");
      throw new Error(`Judgment payload redaction guard blocked a content leak: ${fragment.slice(0, 24)}...`);
    }
  }
}

async function collectCandidates(profileId: string): Promise<ContributionCandidate[]> {
  const [decisions, corrections, tasteRules, skillRules] = await Promise.all([
    db.decisionRecord.findMany({ where: { profileId, status: "active" }, orderBy: { createdAt: "desc" }, take: 300, select: { contextTag: true, medium: true, source: true, confidence: true, rejectedDesc: true } }),
    db.correctionRecord.findMany({ where: { profileId, warning: { not: "" } }, orderBy: { createdAt: "desc" }, take: 300, select: { domainTag: true, source: true } }),
    db.tasteRule.findMany({ where: { profileId, status: "active" }, orderBy: { createdAt: "desc" }, take: 300, select: { contextTag: true, confidence: true } }),
    db.skillRule.findMany({ where: { profileId, status: "active" }, orderBy: { createdAt: "desc" }, take: 300, select: { source: true } }),
  ]);

  return [
    ...decisions.map((record): ContributionCandidate => {
      const domainTag = domainFromText(record.contextTag);
      const patternType = record.rejectedDesc ? "rejection" : "preference";
      const dimension = dimensionFromContext(record.contextTag, record.medium);
      const strength = normalizeStrength(record.confidence);
      return {
        domainTag,
        patternType,
        dimension,
        strength,
        seed: [domainTag, patternType, dimension, mediumBucket(record.medium), strengthBucket(strength), sourceBucket(record.source)].join(":"),
      };
    }),
    ...corrections.map((record): ContributionCandidate => {
      const domainTag = domainFromText(record.domainTag);
      return {
        domainTag,
        patternType: "correction",
        dimension: dimensionFromContext(record.domainTag, "text"),
        strength: 4,
        seed: [domainTag, "correction", dimensionFromContext(record.domainTag, "text"), sourceBucket(record.source)].join(":"),
      };
    }),
    ...tasteRules.map((record): ContributionCandidate => {
      const domainTag = domainFromText(record.contextTag);
      const dimension = dimensionFromContext(record.contextTag, "image");
      const strength = normalizeStrength(record.confidence);
      return {
        domainTag,
        patternType: "taste",
        dimension,
        strength,
        seed: [domainTag, "taste", dimension, strengthBucket(strength)].join(":"),
      };
    }),
    ...skillRules.map((record): ContributionCandidate => ({
      domainTag: "general",
      patternType: "preference",
      dimension: "working_style",
      strength: 3,
      seed: ["general", "preference", "working_style", sourceBucket(record.source)].join(":"),
    })),
  ];
}

function contributionFromCandidate(profileId: string, candidate: ContributionCandidate): JudgmentContribution {
  const day = new Date().toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const salt = process.env.JUDGMENT_SALT || process.env.NEXTAUTH_SECRET || "local-judgment-layer-v1";
  const anonId = `anon_${hash([profileId, month, salt].join(":")).slice(0, 32)}`;
  return {
    anonId,
    domainTag: candidate.domainTag,
    patternType: candidate.patternType,
    patternHash: hash(candidate.seed),
    dimension: candidate.dimension,
    strength: candidate.strength,
    ts: day,
  };
}

async function storeLocalContributions(profileId: string, contributions: JudgmentContribution[], research: boolean) {
  const existing = await readStoredContributions(profileId);
  const uniqueNetwork = uniqueByHash([...existing.network, ...contributions]);
  const uniqueResearch = research ? uniqueByHash([...existing.research, ...contributions]) : existing.research;
  await writeStoredContributions(profileId, { network: uniqueNetwork, research: uniqueResearch, updatedAt: new Date().toISOString() });
}

async function readStoredContributions(profileId: string): Promise<StoredContributionSet> {
  const raw = await getProfileSetting(profileId, JUDGMENT_CONTRIBUTION_STORE_KEY);
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      network: Array.isArray(parsed.network) ? parsed.network : [],
      research: Array.isArray(parsed.research) ? parsed.research : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return { network: [], research: [], updatedAt: "" };
  }
}

async function writeStoredContributions(profileId: string, data: StoredContributionSet) {
  await setProfileSetting(profileId, JUDGMENT_CONTRIBUTION_STORE_KEY, JSON.stringify(data));
}

function uniqueByHash(items: JudgmentContribution[]) {
  const map = new Map<string, JudgmentContribution>();
  for (const item of items) map.set(`${item.patternHash}:${item.ts}:${item.domainTag}`, item);
  return Array.from(map.values());
}

async function sensitiveFragments(profileId: string) {
  const [projects, memories, outputs, corrections, skills, tasteRules, decisions, captures] = await Promise.all([
    db.project.findMany({ where: { profileId }, select: { name: true, goal: true, rules: true, description: true } }),
    db.memory.findMany({ where: { profileId }, select: { content: true } }),
    db.output.findMany({ where: { profileId }, select: { prompt: true, draftContent: true, finalContent: true, stepName: true } }),
    db.correctionRecord.findMany({ where: { profileId }, select: { claimText: true, correctionText: true, warning: true } }),
    db.skill.findMany({ where: { profileId }, select: { name: true, description: true, instructions: true } }),
    db.tasteRule.findMany({ where: { profileId }, select: { text: true } }),
    db.decisionRecord.findMany({ where: { profileId }, select: { chosenDesc: true, rejectedDesc: true, evidence: true, note: true } }),
    db.captureRecord.findMany({ where: { profileId }, select: { title: true, sourceUrl: true, text: true, summary: true, decisionNote: true } }),
  ]);
  return [
    ...projects.flatMap((item) => [item.name, item.goal, item.rules, item.description]),
    ...memories.map((item) => item.content),
    ...outputs.flatMap((item) => [item.prompt, item.draftContent, item.finalContent, item.stepName]),
    ...corrections.flatMap((item) => [item.claimText, item.correctionText, item.warning]),
    ...skills.flatMap((item) => [item.name, item.description, item.instructions]),
    ...tasteRules.map((item) => item.text),
    ...decisions.flatMap((item) => [item.chosenDesc, item.rejectedDesc, item.evidence, item.note]),
    ...captures.flatMap((item) => [item.title, item.sourceUrl, item.text, item.summary, item.decisionNote]),
  ].map((value) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 40)).filter((value) => value.length >= 40);
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeStrength(value: number) {
  return Math.min(5, Math.max(1, Math.round(value || 1)));
}

function strengthBucket(value: number) {
  if (value >= 4) return "strong";
  if (value >= 2) return "medium";
  return "light";
}

function sourceBucket(source: string) {
  const text = String(source ?? "").toLowerCase();
  if (text.includes("ambient")) return "ambient";
  if (text.includes("reader")) return "reader";
  if (text.includes("final") || text.includes("edit")) return "edit";
  if (text.includes("manual")) return "manual";
  return "system";
}

function mediumBucket(medium: string) {
  const text = String(medium ?? "").toLowerCase();
  if (text.includes("image") || text.includes("visual")) return "visual";
  if (text.includes("mixed")) return "mixed";
  return "text";
}

function domainFromText(value: string) {
  const text = String(value ?? "").toLowerCase();
  return ["design", "copy", "code", "brand", "content", "review", "coaching", "audit", "research", "general"].find((tag) => text.includes(tag)) ?? "general";
}

function dimensionFromContext(context: string, medium: string): ContributionCandidate["dimension"] {
  const text = `${context} ${medium}`.toLowerCase();
  if (/tone|address|voice|communication/.test(text)) return "address_and_tone";
  if (/visual|image|design|brand/.test(text)) return "visual_taste";
  if (/workflow|method|skill|process|working|code/.test(text)) return "working_style";
  return "answer_style";
}

async function ingestCollectivePayload(payload: unknown) {
  const guards = Array.isArray((payload as any)?.guards) ? (payload as any).guards : [];
  let count = 0;
  for (const guard of guards.slice(0, 20)) {
    const model = String(guard?.model ?? "").slice(0, 120);
    const domainTag = domainFromText(String(guard?.domainTag ?? "general"));
    const warning = String(guard?.warning ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
    const guardCount = Math.max(0, Number(guard?.count ?? 0));
    if (!model || !warning || guardCount < 25) continue;
    await db.collectiveGuard.upsert({
      where: { model_domainTag_warning: { model, domainTag, warning } },
      update: { count: guardCount, updatedAt: new Date() },
      create: { model, domainTag, warning, count: guardCount },
    });
    count++;
  }
  return count;
}

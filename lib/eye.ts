import { db } from "@/lib/db";
import { pickMetaModel, pickVisionModel } from "@/lib/meta-model";
import { runChat, type ChatBlock } from "@/lib/providers";
import { parseModelJson } from "@/lib/safe-parse";
import { estimateCost } from "@/lib/tokens";
import { resolveProfileId } from "@/lib/scope";
import { getProfileSetting, setProfileSetting } from "@/lib/settings";

export const EYE_CONTEXTS = ["design", "copy", "product", "content", "brand", "review", "coaching", "audit", "research", "general"] as const;
export type EyeContext = (typeof EYE_CONTEXTS)[number];

const TEXT_LIMIT = 1500;

export function clampDesc(value: string, limit = TEXT_LIMIT) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

export function normalizeContext(value?: string | null): EyeContext {
  const tag = String(value ?? "general").toLowerCase();
  return (EYE_CONTEXTS as readonly string[]).includes(tag) ? tag as EyeContext : "general";
}

export function domainFromProject(project?: { goal?: string | null; rules?: string | null; name?: string | null } | null) {
  const text = `${project?.goal ?? ""} ${project?.rules ?? ""} ${project?.name ?? ""}`.toLowerCase();
  return normalizeContext(EYE_CONTEXTS.find((context) => text.includes(context)) ?? "general");
}

export async function eyeProjectId(profileId: string) {
  const existing = await db.project.findFirst({ where: { profileId, name: "The Eye System" } });
  if (existing) return existing.id;
  const created = await db.project.create({ data: { profileId, name: "The Eye System", description: "Internal usage ledger for Eye model calls." } });
  return created.id;
}

export async function describeImageArtifact(args: { profileId?: string; imageData: string; mediaType: string }) {
  const profileId = await resolveProfileId(args.profileId);
  if (!["image/jpeg", "image/png", "image/webp"].includes(args.mediaType)) {
    throw Object.assign(new Error("Unsupported image type."), { status: 415 });
  }
  const bytes = Buffer.byteLength(args.imageData, "base64");
  if (bytes > 6 * 1024 * 1024) throw Object.assign(new Error("Image too large (max 6MB)."), { status: 413 });
  const vision = await pickVisionModel();
  if (!vision) throw Object.assign(new Error("Image judgment needs a vision-capable key (Anthropic, OpenAI, OpenRouter or Google)."), { status: 409 });
  const result = await runChat(vision.provider, vision.id, [
    {
      role: "system",
      content: "You describe a visual artifact for a taste-analysis system. Return ONLY valid JSON:\n{\"medium\":\"ui\"|\"graphic\"|\"photo\"|\"product\"|\"document\",\n \"layout\":\"<≤80 chars: composition, alignment, grid>\",\n \"palette\":[\"<up to 5 dominant colors as hex or names>\"],\n \"typography\":\"<≤60 chars: faces feel, weights, case, tracking>\",\n \"density\":\"minimal\"|\"balanced\"|\"dense\",\n \"mood\":\"<≤50 chars>\",\n \"notable\":[\"<≤3 items, ≤60 chars each: the choices a trained eye would notice>\"]}\nDescribe only what is visible. No judgment, no quality words.",
    },
    { role: "user", content: [{ type: "image", data: args.imageData, mediaType: args.mediaType } as ChatBlock, { type: "text", text: "Describe this artifact." }] },
  ], { maxTokens: 700, temperature: 0 });
  await db.modelRun.create({ data: { profileId, projectId: await eyeProjectId(profileId), provider: vision.provider, model: vision.id, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: estimateCost(vision.id, result.inputTokens, result.outputTokens), purpose: "eye" } });
  const parsed = parseModelJson<Record<string, unknown>>(result.text);
  if (!parsed) throw Object.assign(new Error("Could not describe image."), { status: 422 });
  return clampDesc(JSON.stringify(parsed));
}

export async function recordDecision(args: {
  profileId: string;
  contextTag: string;
  chosenDesc: string;
  rejectedDesc?: string;
  medium: string;
  source: string;
  projectId?: string | null;
  outputId?: string | null;
  note?: string;
}) {
  const contextTag = normalizeContext(args.contextTag);
  const record = await db.decisionRecord.create({
    data: {
      contextTag,
      profileId: args.profileId,
      chosenDesc: clampDesc(args.chosenDesc),
      rejectedDesc: clampDesc(args.rejectedDesc ?? ""),
      medium: ["text", "image", "mixed-url"].includes(args.medium) ? args.medium : "text",
      source: args.source,
      projectId: args.projectId ?? null,
      outputId: args.outputId ?? null,
      note: clampDesc(args.note ?? "", 500),
    },
  });
  const totalForContext = await db.decisionRecord.count({ where: { profileId: args.profileId, contextTag } });
  void maybeSynthesizeTasteRules(args.profileId, contextTag).catch((error) => console.error("eye synthesis failed", error));
  return { record, totalForContext };
}

export async function maybeSynthesizeTasteRules(profileId: string, contextTag: string) {
  const tag = normalizeContext(contextTag);
  const total = await db.decisionRecord.count({ where: { profileId, contextTag: tag } });
  const key = `EYE_SYNTH_${tag}`;
  const last = Number(await getProfileSetting(profileId, key) || "0");
  if (total < last + 5) return 0;
  await setProfileSetting(profileId, key, String(total));
  const meta = await pickMetaModel();
  if (!meta) return 0;
  const decisions = await db.decisionRecord.findMany({ where: { profileId, contextTag: tag }, orderBy: { createdAt: "desc" }, take: 24 });
  const user = decisions.map((decision, index) => `${index + 1}. SOURCE: ${decision.source}\nCHOSEN: ${decision.chosenDesc.slice(0, 400)}\nREJECTED: ${(decision.rejectedDesc || "(single artifact signal)").slice(0, 400)}`).join("\n\n");
  const result = await runChat(meta.provider, meta.id, [
    {
      role: "system",
      content: "You analyze a professional's real creative decisions (CHOSEN vs REJECTED pairs and kept-vs-draft edits) and extract at most 3 durable TASTE RULES this person implicitly applies. Rules must be general, imperative, specific enough to act on, ≤140 chars, and must describe preference patterns — not the individual artifacts. Ignore one-off topical differences.\nReturn ONLY valid JSON: {\"rules\":[{\"text\":\"...\",\"supportCount\":<integer, how many provided decisions support it>}]}\nOnly include rules supported by at least 2 decisions.",
    },
    { role: "user", content: user },
  ], { maxTokens: 900, temperature: 0 });
  await db.modelRun.create({ data: { profileId, projectId: decisions[0]?.projectId ?? await eyeProjectId(profileId), provider: meta.provider, model: meta.id, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: estimateCost(meta.id, result.inputTokens, result.outputTokens), purpose: "eye" } });
  const parsed = parseModelJson<{ rules: { text: string; supportCount: number }[] }>(result.text);
  if (!parsed?.rules?.length) return 0;
  const existing = await db.tasteRule.findMany({ where: { profileId, contextTag: tag } });
  const seen = new Set(existing.map((rule) => rule.text.toLowerCase()));
  let inserted = 0;
  for (const rule of parsed.rules.slice(0, 3)) {
    const text = clampDesc(rule.text, 140);
    const support = Math.max(2, Number(rule.supportCount || 2));
    if (!text || seen.has(text.toLowerCase()) || support < 2) continue;
    await db.tasteRule.create({ data: { profileId, contextTag: tag, text, confidence: support, status: "proposed" } });
    seen.add(text.toLowerCase());
    inserted++;
  }
  if (inserted > 0) await setProfileSetting(profileId, `EYE_SEEN_${tag}`, "0");
  return inserted;
}

export async function captureEyeDecisionsFromFinalize(outputId: string) {
  const output = await db.output.findUnique({ where: { id: outputId } });
  if (!output?.profileId || output.status !== "final") return 0;
  const project = await db.project.findUnique({ where: { id: output.projectId } });
  const contextTag = domainFromProject(project);
  const created: string[] = [];
  const finalText = clampDesc(output.finalContent);
  const draftText = clampDesc(output.draftContent);
  const normalized = (text: string) => text.replace(/\s+/g, " ").trim();

  if (created.length < 2 && output.parentOutputId) {
    const parent = await db.output.findUnique({ where: { id: output.parentOutputId } });
    if (parent && parent.status !== "final") {
      const exists = await db.decisionRecord.findFirst({ where: { profileId: output.profileId, outputId, source: "fork-final" } });
      if (!exists) {
        await recordDecision({ profileId: output.profileId, contextTag, chosenDesc: finalText, rejectedDesc: parent.finalContent || parent.draftContent, medium: "text", source: "fork-final", projectId: output.projectId, outputId });
        created.push("fork-final");
      }
    }
  }

  if (created.length < 2) {
    const sibling = await db.output.findFirst({
      where: { profileId: output.profileId, projectId: output.projectId, stepName: output.stepName, id: { not: output.id }, status: { not: "final" } },
      orderBy: { createdAt: "desc" },
    });
    const exists = await db.decisionRecord.findFirst({ where: { profileId: output.profileId, outputId, source: "regen-final" } });
    if (sibling && !exists) {
      await recordDecision({ profileId: output.profileId, contextTag, chosenDesc: finalText, rejectedDesc: sibling.finalContent || sibling.draftContent, medium: "text", source: "regen-final", projectId: output.projectId, outputId });
      created.push("regen-final");
    }
  }

  if (created.length < 2 && normalized(output.draftContent) !== normalized(output.finalContent)) {
    const exists = await db.decisionRecord.findFirst({ where: { profileId: output.profileId, outputId, source: "edit-final" } });
    if (!exists) {
      await recordDecision({ profileId: output.profileId, contextTag, chosenDesc: finalText, rejectedDesc: draftText, medium: "text", source: "edit-final", projectId: output.projectId, outputId });
      created.push("edit-final");
    }
  }

  return created.length;
}

export async function assertEyeMature(profileId: string, contextTag: string) {
  const tag = normalizeContext(contextTag);
  const [decisions, activeRules] = await Promise.all([
    db.decisionRecord.count({ where: { profileId, contextTag: tag } }),
    db.tasteRule.findMany({ where: { profileId, contextTag: tag, status: "active" }, orderBy: { createdAt: "desc" } }),
  ]);
  if (decisions < 20 || activeRules.length < 1) {
    throw Object.assign(new Error("eye_immature"), { status: 409, decisions, needed: 20 });
  }
  return { decisions, activeRules };
}

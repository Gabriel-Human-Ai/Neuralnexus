import { db } from "@/lib/db";
import { pickMetaModel } from "@/lib/meta-model";
import { runChat } from "@/lib/providers";
import { parseModelJson } from "@/lib/safe-parse";
import { estimateCost } from "@/lib/tokens";

function normalized(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export async function extractSkillRulesFromOutput(outputId: string) {
  const output = await db.output.findUnique({ where: { id: outputId } });
  if (!output?.skillId) return 0;
  if (!output.profileId) return 0;
  const [project, skill] = await Promise.all([
    db.project.findUnique({ where: { id: output.projectId } }),
    db.skill.findUnique({ where: { id: output.skillId } }),
  ]);
  if (!project || !skill || project.profileId !== output.profileId || skill.profileId !== output.profileId) {
    console.error("Genome extraction aborted: profile mismatch");
    return 0;
  }
  if (normalized(output.draftContent) === normalized(output.finalContent)) return 0;
  if (output.finalContent.length < 40) return 0;
  const proposedCount = await db.skillRule.count({ where: { profileId: output.profileId, skillId: output.skillId, status: "proposed" } });
  if (proposedCount >= 5) return 0;
  const meta = await pickMetaModel();
  if (!meta) return 0;
  const result = await runChat(meta.provider, meta.id, [
    { role: "system", content: "You compare an AI DRAFT with the human's FINAL edited version and extract at most 2 durable style or method rules the human implicitly applied. Rules must be general (apply to future outputs), imperative, specific, and non-obvious. Ignore one-off factual edits.\nReturn ONLY valid JSON: {\"rules\":[\"...\",\"...\"]} or {\"rules\":[]}.\nEach rule max 140 characters." },
    { role: "user", content: `DRAFT:\n${output.draftContent.slice(0, 4000)}\n\nFINAL:\n${output.finalContent.slice(0, 4000)}` },
  ], { maxTokens: 800, temperature: 0 });
  await db.modelRun.create({ data: { profileId: output.profileId, projectId: output.projectId, provider: meta.provider, model: meta.id, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: estimateCost(meta.id, result.inputTokens, result.outputTokens), purpose: "genome" } });
  const parsed = parseModelJson<{ rules: string[] }>(result.text);
  if (!parsed?.rules?.length) return 0;
  let created = 0;
  const existing = await db.skillRule.findMany({ where: { profileId: output.profileId, skillId: output.skillId } });
  const existingTexts = new Set(existing.map((rule) => rule.text.toLowerCase()));
  for (const text of parsed.rules.slice(0, 2).map((rule) => rule.slice(0, 140).trim()).filter(Boolean)) {
    if (existingTexts.has(text.toLowerCase())) continue;
    await db.skillRule.create({ data: { profileId: output.profileId, skillId: output.skillId, text, source: "learned", sourceOutputId: output.id, status: "proposed" } });
    created++;
  }
  return created;
}

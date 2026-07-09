import { db } from "@/lib/db";
import { pickMetaModel } from "@/lib/meta-model";
import { MODELS, runChat, runChatWithFallback } from "@/lib/providers";
import { parseModelJson } from "@/lib/safe-parse";
import { estimateCost } from "@/lib/tokens";
import type { QualityReport } from "@/lib/types";

type JudgeResult = { results: { check: string; passed: boolean; reason: string }[] };

export async function runQualityGates(args: {
  projectId: string;
  content: string;
  checklist: string[];
  systemPrompt: string;
  primaryModel: string;
}) {
  const checklist = args.checklist.slice(0, 5).map((item) => item.slice(0, 120)).filter(Boolean);
  if (!checklist.length) return { content: args.content, report: null as QualityReport | null, extraCost: 0, extraInputTokens: 0, extraOutputTokens: 0 };
  const meta = await pickMetaModel();
  if (!meta) return { content: args.content, report: null as QualityReport | null, extraCost: 0, extraInputTokens: 0, extraOutputTokens: 0 };

  let content = args.content;
  let revisions = 0;
  let extraCost = 0;
  let extraInputTokens = 0;
  let extraOutputTokens = 0;
  const failedEarlier = new Set<string>();
  let finalResults: JudgeResult["results"] = checklist.map((check) => ({ check, passed: false, reason: "Not judged" }));

  for (let attempt = 0; attempt <= 2; attempt++) {
    const judge = await runChat(meta.provider, meta.id, [
      { role: "system", content: "You are a strict quality judge. Evaluate the TEXT against each CHECK.\nReturn ONLY valid JSON, no markdown, in this exact shape:\n{\"results\":[{\"check\":\"<verbatim check text>\",\"passed\":true|false,\"reason\":\"<max 15 words>\"}]}\nA check passes only if the text clearly and fully satisfies it. When uncertain, fail it." },
      { role: "user", content: `CHECKS:\n${checklist.map((check, index) => `${index + 1}. ${check}`).join("\n")}\n\nTEXT:\n${content.slice(0, 6000)}` },
    ], { maxTokens: 800, temperature: 0 });
    const judgeCost = estimateCost(meta.id, judge.inputTokens, judge.outputTokens);
    extraCost += judgeCost;
    extraInputTokens += judge.inputTokens;
    extraOutputTokens += judge.outputTokens;
    await db.modelRun.create({ data: { projectId: args.projectId, provider: meta.provider, model: meta.id, inputTokens: judge.inputTokens, outputTokens: judge.outputTokens, costUsd: judgeCost, purpose: "judge" } });
    const parsed = parseModelJson<JudgeResult>(judge.text);
    if (!parsed?.results) break;
    finalResults = parsed.results.map((result) => ({ check: result.check, passed: Boolean(result.passed), reason: result.reason || "" }));
    const failed = finalResults.filter((result) => !result.passed);
    if (!failed.length || attempt === 2) break;
    failed.forEach((result) => failedEarlier.add(result.check));

    const revision = await runChatWithFallback(args.primaryModel, [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: `Your previous output failed these quality checks:\n${failed.map((result) => `- ${result.check}: ${result.reason}`).join("\n")}\n\nPrevious output:\n${content}\n\nRewrite the output so every failed check passes. Keep everything that already worked. Output only the revised text.` },
    ]);
    const provider = MODELS.find((model) => model.id === revision.usedModel)?.provider ?? "unknown";
    const revisionCost = estimateCost(revision.usedModel, revision.inputTokens, revision.outputTokens);
    extraCost += revisionCost;
    extraInputTokens += revision.inputTokens;
    extraOutputTokens += revision.outputTokens;
    await db.modelRun.create({ data: { projectId: args.projectId, provider, model: revision.usedModel, inputTokens: revision.inputTokens, outputTokens: revision.outputTokens, costUsd: revisionCost, purpose: "user" } });
    content = revision.text;
    revisions++;
  }

  return {
    content,
    report: {
      checks: finalResults.map((result) => ({ check: result.check, passed: result.passed, fixed: result.passed && failedEarlier.has(result.check), reason: result.reason })),
      revisions,
    },
    extraCost,
    extraInputTokens,
    extraOutputTokens,
  };
}

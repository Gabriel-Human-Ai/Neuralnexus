import { db } from "@/lib/db";
import { MODELS, pickModelForTask, runChatWithFallback } from "@/lib/providers";
import { estimateCost } from "@/lib/tokens";
import { runQualityGates } from "@/lib/judge";
import { parseModelJson } from "@/lib/safe-parse";

export type RunOutputRequest = {
  projectId: string;
  stepName: string;
  stepDescription: string;
  userInput: string;
  skillId?: string;
  model?: string;
  checklist: string[];
  parentOutputId?: string;
  forkChangedVariable?: string;
};

export async function resolveModel(projectId: string, stepName: string, explicit?: string) {
  if (explicit) return explicit;
  const exact = await db.modelPolicy.findUnique({ where: { projectId_stepName: { projectId, stepName } } });
  if (exact) return exact.model;
  const star = await db.modelPolicy.findUnique({ where: { projectId_stepName: { projectId, stepName: "*" } } });
  if (star) return star.model;
  return pickModelForTask(`${stepName} strategic workspace step`);
}

export async function runWorkspaceStep(body: RunOutputRequest) {
  const { projectId, stepName, stepDescription, userInput } = body;
  if (!projectId || !stepName || !stepDescription) throw new Error("missing_fields");
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("project_not_found");

  const skill = body.skillId ? await db.skill.findUnique({ where: { id: body.skillId } }) : null;
  const activeRules = skill ? await db.skillRule.findMany({ where: { skillId: skill.id, status: "active" }, orderBy: { createdAt: "asc" } }) : [];
  const knowledge = await db.memory.findMany({ where: { projectId, kind: "knowledge" }, orderBy: { createdAt: "desc" }, take: 8 });
  const model = await resolveModel(projectId, stepName, body.model);

  const systemPrompt = [
    "You are executing one step of a reusable AI workspace.",
    "",
    `WORKSPACE: ${project.name}`,
    `PURPOSE: ${project.goal.slice(0, 400)}`,
    "",
    `STEP: ${stepName}`,
    `STEP GOAL: ${stepDescription}`,
    "",
    skill ? `METHOD (Skill: ${skill.name} v${skill.version}):\n${skill.instructions}` : "",
    activeRules.length ? `LEARNED RULES — follow every rule strictly:\n${activeRules.map((rule) => `- ${rule.text}`).join("\n")}` : "",
    knowledge.length ? `KNOWLEDGE SOURCES:\n${knowledge.map((item) => `--- ${item.content.slice(0, 1200)}`).join("\n")}` : "",
    "Produce the step output directly. No preamble, no meta commentary.",
  ].filter(Boolean).join("\n");
  const prompt = userInput?.trim() || "Execute this step now.";

  const result = await runChatWithFallback(model, [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ]);
  const provider = MODELS.find((item) => item.id === result.usedModel)?.provider ?? "unknown";
  const primaryCost = estimateCost(result.usedModel, result.inputTokens, result.outputTokens);
  await db.modelRun.create({ data: { projectId, provider, model: result.usedModel, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: primaryCost, purpose: "user" } });

  const gated = await runQualityGates({ projectId, content: result.text, checklist: body.checklist ?? [], systemPrompt, primaryModel: result.usedModel });
  const totalCost = primaryCost + gated.extraCost;
  const output = await db.output.create({
    data: {
      projectId,
      stepName,
      prompt,
      draftContent: gated.content,
      skillId: skill?.id,
      skillVersion: skill?.version ?? 1,
      model: result.usedModel,
      provider,
      inputTokens: result.inputTokens + gated.extraInputTokens,
      outputTokens: result.outputTokens + gated.extraOutputTokens,
      costUsd: totalCost,
      knowledgeIds: knowledge.map((item) => item.id).join(","),
      parentOutputId: body.parentOutputId,
      forkChangedVariable: body.forkChangedVariable,
      qualityReport: gated.report ? JSON.stringify(gated.report) : "",
    },
  });
  return { output, content: gated.content, model: result.usedModel, provider, costUsd: totalCost, qualityReport: gated.report, systemPrompt };
}

type StreamEvent =
  | { type: "generating" }
  | { type: "draft"; content: string }
  | { type: "judging"; round: number }
  | { type: "verdict"; round: number; checks: { check: string; passed: boolean; reason: string }[] }
  | { type: "revising"; round: number; failed: string[] }
  | { type: "final"; outputId: string; content: string; qualityReport: any; model: string; provider: string; costUsd: number }
  | { type: "error"; message: string };

type JudgeResult = { results: { check: string; passed: boolean; reason: string }[] };

export async function runWorkspaceStepStreaming(body: RunOutputRequest, emit: (event: StreamEvent) => void) {
  const { projectId, stepName, stepDescription, userInput } = body;
  if (!projectId || !stepName || !stepDescription) throw new Error("missing_fields");
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("project_not_found");

  const skill = body.skillId ? await db.skill.findUnique({ where: { id: body.skillId } }) : null;
  const activeRules = skill ? await db.skillRule.findMany({ where: { skillId: skill.id, status: "active" }, orderBy: { createdAt: "asc" } }) : [];
  const knowledge = await db.memory.findMany({ where: { projectId, kind: "knowledge" }, orderBy: { createdAt: "desc" }, take: 8 });
  const model = await resolveModel(projectId, stepName, body.model);

  const systemPrompt = [
    "You are executing one step of a reusable AI workspace.",
    "",
    `WORKSPACE: ${project.name}`,
    `PURPOSE: ${project.goal.slice(0, 400)}`,
    "",
    `STEP: ${stepName}`,
    `STEP GOAL: ${stepDescription}`,
    "",
    skill ? `METHOD (Skill: ${skill.name} v${skill.version}):\n${skill.instructions}` : "",
    activeRules.length ? `LEARNED RULES — follow every rule strictly:\n${activeRules.map((rule) => `- ${rule.text}`).join("\n")}` : "",
    knowledge.length ? `KNOWLEDGE SOURCES:\n${knowledge.map((item) => `--- ${item.content.slice(0, 1200)}`).join("\n")}` : "",
    "Produce the step output directly. No preamble, no meta commentary.",
  ].filter(Boolean).join("\n");
  const prompt = userInput?.trim() || "Execute this step now.";
  emit({ type: "generating" });
  const result = await runChatWithFallback(model, [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ]);
  emit({ type: "draft", content: result.text });
  const provider = MODELS.find((item) => item.id === result.usedModel)?.provider ?? "unknown";
  const primaryCost = estimateCost(result.usedModel, result.inputTokens, result.outputTokens);
  await db.modelRun.create({ data: { projectId, provider, model: result.usedModel, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: primaryCost, purpose: "user" } });

  const checklist = (body.checklist ?? []).slice(0, 5).map((item) => item.slice(0, 120)).filter(Boolean);
  let content = result.text;
  let revisions = 0;
  let extraCost = 0;
  let extraInputTokens = 0;
  let extraOutputTokens = 0;
  const failedEarlier = new Set<string>();
  let finalResults: JudgeResult["results"] = checklist.map((check) => ({ check, passed: false, reason: "Not judged" }));
  const meta = checklist.length ? await import("@/lib/meta-model").then((module) => module.pickMetaModel()) : null;

  if (checklist.length && meta) {
    for (let attempt = 0; attempt <= 2; attempt++) {
      const round = attempt + 1;
      emit({ type: "judging", round });
      const judge = await import("@/lib/providers").then((module) => module.runChat(meta.provider, meta.id, [
        { role: "system", content: "You are a strict quality judge. Evaluate the TEXT against each CHECK.\nReturn ONLY valid JSON, no markdown, in this exact shape:\n{\"results\":[{\"check\":\"<verbatim check text>\",\"passed\":true|false,\"reason\":\"<max 15 words>\"}]}\nA check passes only if the text clearly and fully satisfies it. When uncertain, fail it." },
        { role: "user", content: `CHECKS:\n${checklist.map((check, index) => `${index + 1}. ${check}`).join("\n")}\n\nTEXT:\n${content.slice(0, 6000)}` },
      ], { maxTokens: 800, temperature: 0 }));
      const judgeCost = estimateCost(meta.id, judge.inputTokens, judge.outputTokens);
      extraCost += judgeCost;
      extraInputTokens += judge.inputTokens;
      extraOutputTokens += judge.outputTokens;
      await db.modelRun.create({ data: { projectId, provider: meta.provider, model: meta.id, inputTokens: judge.inputTokens, outputTokens: judge.outputTokens, costUsd: judgeCost, purpose: "judge" } });
      const parsed = parseModelJson<JudgeResult>(judge.text);
      if (!parsed?.results) break;
      finalResults = parsed.results.map((item) => ({ check: item.check, passed: Boolean(item.passed), reason: item.reason || "" }));
      emit({ type: "verdict", round, checks: finalResults });
      const failed = finalResults.filter((item) => !item.passed);
      if (!failed.length || attempt === 2) break;
      failed.forEach((item) => failedEarlier.add(item.check));
      emit({ type: "revising", round, failed: failed.map((item) => item.check) });
      const revision = await runChatWithFallback(result.usedModel, [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Your previous output failed these quality checks:\n${failed.map((item) => `- ${item.check}: ${item.reason}`).join("\n")}\n\nPrevious output:\n${content}\n\nRewrite the output so every failed check passes. Keep everything that already worked. Output only the revised text.` },
      ]);
      const revisionProvider = MODELS.find((item) => item.id === revision.usedModel)?.provider ?? "unknown";
      const revisionCost = estimateCost(revision.usedModel, revision.inputTokens, revision.outputTokens);
      extraCost += revisionCost;
      extraInputTokens += revision.inputTokens;
      extraOutputTokens += revision.outputTokens;
      await db.modelRun.create({ data: { projectId, provider: revisionProvider, model: revision.usedModel, inputTokens: revision.inputTokens, outputTokens: revision.outputTokens, costUsd: revisionCost, purpose: "user" } });
      content = revision.text;
      revisions++;
      emit({ type: "draft", content });
    }
  }

  const qualityReport = checklist.length && meta ? {
    checks: finalResults.map((item) => ({ check: item.check, passed: item.passed, fixed: item.passed && failedEarlier.has(item.check), reason: item.reason })),
    revisions,
  } : null;
  const totalCost = primaryCost + extraCost;
  const output = await db.output.create({
    data: {
      projectId,
      stepName,
      prompt,
      draftContent: content,
      skillId: skill?.id,
      skillVersion: skill?.version ?? 1,
      model: result.usedModel,
      provider,
      inputTokens: result.inputTokens + extraInputTokens,
      outputTokens: result.outputTokens + extraOutputTokens,
      costUsd: totalCost,
      knowledgeIds: knowledge.map((item) => item.id).join(","),
      parentOutputId: body.parentOutputId,
      forkChangedVariable: body.forkChangedVariable,
      qualityReport: qualityReport ? JSON.stringify(qualityReport) : "",
    },
  });
  emit({ type: "final", outputId: output.id, content, qualityReport, model: result.usedModel, provider, costUsd: totalCost });
  return { output, content, model: result.usedModel, provider, costUsd: totalCost, qualityReport, systemPrompt };
}

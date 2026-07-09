import { db } from "@/lib/db";
import { CHALLENGERS, providerKeyName } from "@/lib/autopilot";
import { getAllSettings } from "@/lib/db-helpers";
import { pickMetaModel } from "@/lib/meta-model";
import { MODELS, runChat, runChatWithFallback } from "@/lib/providers";
import { parseModelJson } from "@/lib/safe-parse";
import { estimateCost } from "@/lib/tokens";

export async function maybeRunAutopilotBenchmark(outputId: string) {
  if (Math.random() >= 0.25) return;
  const output = await db.output.findUnique({ where: { id: outputId } });
  if (!output) return;
  const challengers = CHALLENGERS[output.model] ?? [];
  if (!challengers.length) return;
  const settings = await getAllSettings();
  const eligible = challengers.find((item) => settings[providerKeyName(item.provider)] || process.env[providerKeyName(item.provider)]);
  if (!eligible) return;
  const meta = await pickMetaModel();
  if (!meta) return;
  const day = new Date().toISOString().slice(0, 10);
  const key = `AUTOPILOT_COUNT_${day}`;
  const row = await db.setting.findUnique({ where: { key } });
  const count = Number(row?.value ?? "0");
  if (count >= 10) return;
  await db.setting.upsert({ where: { key }, create: { key, value: "1" }, update: { value: String(count + 1) } });

  const challenger = await runChatWithFallback(eligible.model, [
    { role: "system", content: "You are executing one step of a reusable AI workspace. Produce the step output directly. No preamble, no meta commentary." },
    { role: "user", content: output.prompt || "Execute this step now." },
  ]);
  const provider = MODELS.find((model) => model.id === challenger.usedModel)?.provider ?? eligible.provider;
  const challengerCost = estimateCost(challenger.usedModel, challenger.inputTokens, challenger.outputTokens);
  await db.modelRun.create({ data: { projectId: output.projectId, provider, model: challenger.usedModel, inputTokens: challenger.inputTokens, outputTokens: challenger.outputTokens, costUsd: challengerCost, purpose: "benchmark" } });

  const judge = await runChat(meta.provider, meta.id, [
    { role: "system", content: "You compare two answers to the same task. Score how well ANSWER_B matches ANSWER_A in quality, completeness and usefulness for the task. Formatting differences do not matter.\nReturn ONLY valid JSON: {\"score\": <integer 0-10>, \"reason\": \"<max 12 words>\"}.\n10 = equal or better. 7 = minor losses. <=5 = clearly worse." },
    { role: "user", content: `TASK:\n${output.stepName}: ${output.prompt}\n\nANSWER_A (${output.model}):\n${(output.finalContent || output.draftContent).slice(0, 4000)}\n\nANSWER_B (${challenger.usedModel}):\n${challenger.text.slice(0, 4000)}` },
  ], { maxTokens: 800, temperature: 0 });
  await db.modelRun.create({ data: { projectId: output.projectId, provider: meta.provider, model: meta.id, inputTokens: judge.inputTokens, outputTokens: judge.outputTokens, costUsd: estimateCost(meta.id, judge.inputTokens, judge.outputTokens), purpose: "judge" } });
  const parsed = parseModelJson<{ score: number }>(judge.text);
  await db.benchmarkRun.create({ data: { projectId: output.projectId, stepName: output.stepName, primaryModel: output.model, challengerModel: challenger.usedModel, similarityScore: Math.max(0, Math.min(10, Number(parsed?.score ?? 0))), primaryCostUsd: output.costUsd, challengerCostUsd: challengerCost } });
}

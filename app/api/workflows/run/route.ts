export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runChatWithFallback, pickModelForTask, MODELS } from "@/lib/providers";
import { estimateCost } from "@/lib/tokens";

export async function POST(req: Request) {
  try {
    const { agentIds, prompt, projectId } = await req.json();
    if (!Array.isArray(agentIds) || !prompt?.trim()) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

    // ModelRun needs a real projectId — reuse the active chat if given, else a dedicated Workroom log project.
    let realProjectId = projectId as string | undefined;
    if (!realProjectId) {
      const existing = await db.project.findFirst({ where: { name: "Workroom-Log" } });
      realProjectId = existing?.id ?? (await db.project.create({ data: { name: "Workroom-Log", archived: true } })).id;
    }

    const steps: { agentId: string; agentName: string; workroomRole: string | null; model: string; output: string; costUsd: number }[] = [];
    let handoff = prompt as string;
    let totalCost = 0;

    for (const id of agentIds) {
      const agent = await db.agent.findUnique({ where: { id } });
      if (!agent) continue;
      const skillIds = agent.skillIds ? agent.skillIds.split(",").filter(Boolean) : [];
      const skills = skillIds.length ? await db.skill.findMany({ where: { id: { in: skillIds } } }) : [];
      const skillText = skills.map(k => `## Skill: ${k.name}\n${k.instructions}`).join("\n\n");
      const system = `# Rolle: ${agent.name}\n${agent.systemPrompt}\n\n${skillText}`;
      const model = agent.preferredModel && agent.preferredModel !== "auto" ? agent.preferredModel : pickModelForTask(handoff);

      const result = await runChatWithFallback(model, [
        { role: "system", content: system },
        { role: "user", content: handoff },
      ]);
      const cost = estimateCost(result.usedModel, result.inputTokens, result.outputTokens);
      totalCost += cost;
      const provider = MODELS.find(m => m.id === result.usedModel)?.provider ?? "unknown";

      await db.modelRun.create({ data: {
        projectId: realProjectId, provider, model: result.usedModel,
        inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: cost,
      }});

      steps.push({ agentId: agent.id, agentName: agent.name, workroomRole: agent.workroomRole, model: result.usedModel, output: result.text, costUsd: cost });
      handoff = result.text; // next agent gets previous output as input
    }

    return NextResponse.json({ steps, final: handoff, totalCost });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Workflow fehlgeschlagen" }, { status: 500 });
  }
}

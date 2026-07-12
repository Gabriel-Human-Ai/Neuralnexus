import { db } from "@/lib/db";
import { prepareJudgmentContributionReport, syncJudgmentLayer } from "@/lib/judgment-layer";

type GuardPayload = { guards?: { model?: string; domainTag?: string; warning?: string; count?: number }[] };

export async function ensureIndexInstanceId() {
  return "judgment-layer-rotating-anon-id";
}

export async function toContribution(profileIdArg?: string) {
  return prepareJudgmentContributionReport(profileIdArg);
}

export async function syncIndexProtocol(reason = "finalize", profileIdArg?: string) {
  const result = await syncJudgmentLayer(reason, profileIdArg);
  return result.skipped ? result : { ...result, guards: result.guards ?? 0 };
}

export async function ingestCollectiveGuards(payload: GuardPayload) {
  const guards = Array.isArray(payload.guards) ? payload.guards : [];
  let count = 0;
  for (const guard of guards.slice(0, 20)) {
    const model = String(guard.model ?? "").slice(0, 120);
    const domainTag = domainFromText(String(guard.domainTag ?? "general"));
    const warning = String(guard.warning ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
    const guardCount = Math.max(0, Number(guard.count ?? 0));
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

export async function collectiveGuardLines(model: string, domainTag: string) {
  const guards = await db.collectiveGuard.findMany({
    where: { model, domainTag, count: { gte: 25 } },
    orderBy: { count: "desc" },
    take: 2,
  });
  return guards.map((guard) => `- Professionals corrected this ${guard.count}x: ${guard.warning}`);
}

function domainFromText(value: string) {
  const text = String(value ?? "").toLowerCase();
  return ["design", "copy", "code", "brand", "content", "review", "coaching", "audit", "research", "general"].find((tag) => text.includes(tag)) ?? "general";
}

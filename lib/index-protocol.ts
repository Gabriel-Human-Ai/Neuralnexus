import crypto from "crypto";
import { db } from "@/lib/db";
import { resolveProfileId } from "@/lib/scope";

export type Contribution = {
  instanceId: string;
  ts: string;
  corrections: { model: string; provider: string; domainTag: string; warning: string }[];
  verdicts: { model: string; domainTag: string; passed: number; fixed: number; failed: number }[];
  taste: { contextTag: string; ruleTextHash: string; confidence: number }[];
  reliability: { model: string; domainTag: string; runs: number; disputes: number; correctionsCount: number }[];
};

type GuardPayload = { guards?: { model?: string; domainTag?: string; warning?: string; count?: number }[] };

export async function ensureIndexInstanceId() {
  const existing = await db.setting.findUnique({ where: { key: "INDEX_INSTANCE_ID" } });
  if (existing?.value) return existing.value;
  const id = crypto.randomUUID();
  await db.setting.upsert({ where: { key: "INDEX_INSTANCE_ID" }, update: { value: id }, create: { key: "INDEX_INSTANCE_ID", value: id } });
  return id;
}

export async function toContribution(profileIdArg?: string): Promise<Contribution> {
  const profileId = await resolveProfileId(profileIdArg);
  const instanceId = await ensureIndexInstanceId();
  const [corrections, outputs, tasteRules] = await Promise.all([
    db.correctionRecord.findMany({ where: { profileId, warning: { not: "" } } }),
    db.output.findMany({ where: { profileId }, select: { model: true, claimsJson: true, qualityReport: true, stepName: true } }),
    db.tasteRule.findMany({ where: { profileId, status: "active" } }),
  ]);

  const verdictMap = new Map<string, { model: string; domainTag: string; passed: number; fixed: number; failed: number }>();
  const reliabilityMap = new Map<string, { model: string; domainTag: string; runs: number; disputes: number; correctionsCount: number }>();
  const correctionCounts = new Map<string, number>();
  corrections.forEach((record) => {
    const key = `${record.model}::${record.domainTag}`;
    correctionCounts.set(key, (correctionCounts.get(key) ?? 0) + 1);
  });

  for (const output of outputs) {
    const domainTag = domainFromText(output.stepName);
    const key = `${output.model}::${domainTag}`;
    const claims = parseClaimsLocal(output.claimsJson);
    const disputes = claims.filter((claim) => claim.status === "disputed" || claim.status === "corrected").length;
    const reliability = reliabilityMap.get(key) ?? { model: output.model, domainTag, runs: 0, disputes: 0, correctionsCount: 0 };
    reliability.runs += 1;
    reliability.disputes += disputes;
    reliability.correctionsCount = correctionCounts.get(key) ?? 0;
    reliabilityMap.set(key, reliability);

    try {
      const report = JSON.parse(output.qualityReport || "{}");
      const checks = Array.isArray(report.checks) ? report.checks : [];
      if (checks.length) {
        const verdict = verdictMap.get(key) ?? { model: output.model, domainTag, passed: 0, fixed: 0, failed: 0 };
        checks.forEach((check: any) => {
          if (check?.fixed) verdict.fixed += 1;
          else if (check?.passed) verdict.passed += 1;
          else verdict.failed += 1;
        });
        verdictMap.set(key, verdict);
      }
    } catch {
      // Quality reports are optional legacy JSON; invalid rows simply do not contribute verdicts.
    }
  }

  const contribution: Contribution = {
    instanceId,
    ts: new Date().toISOString(),
    corrections: corrections.map((record) => ({
      model: record.model,
      provider: record.provider,
      domainTag: record.domainTag,
      warning: record.warning.slice(0, 140),
    })),
    verdicts: Array.from(verdictMap.values()),
    taste: tasteRules.map((rule) => ({
      contextTag: rule.contextTag,
      ruleTextHash: crypto.createHash("sha256").update(rule.text).digest("hex"),
      confidence: rule.confidence,
    })),
    reliability: Array.from(reliabilityMap.values()),
  };
  await assertContributionSafe(contribution, profileId);
  return contribution;
}

export async function assertContributionSafe(contribution: Contribution, profileId: string) {
  const serialized = JSON.stringify(contribution).toLowerCase();
  const leaked = await sensitiveFragments(profileId);
  for (const fragment of leaked) {
    if (fragment.length >= 40 && serialized.includes(fragment.toLowerCase())) {
      throw new Error(`Index payload redaction guard blocked a content leak: ${fragment.slice(0, 24)}...`);
    }
  }
  const forbiddenKeys = ["claimText", "correctionText", "draftContent", "finalContent", "prompt", "content", "instructions", "name", "goal", "rules"];
  for (const key of forbiddenKeys) {
    if (serialized.includes(`"${key.toLowerCase()}":`)) throw new Error(`Index payload contains forbidden key: ${key}`);
  }
}

export async function syncIndexProtocol(reason = "finalize", profileIdArg?: string) {
  const profileId = await resolveProfileId(profileIdArg);
  const endpoint = process.env.INDEX_ENDPOINT;
  const consent = await db.profileSetting.findUnique({ where: { profileId_key: { profileId, key: "INDEX_CONSENT" } } });
  if (consent?.value !== "on" || !endpoint) return { skipped: true, reason: consent?.value !== "on" ? "consent_off" : "endpoint_unset" };
  const last = await db.setting.findUnique({ where: { key: "INDEX_LAST_SYNC" } });
  const lastMs = Number(last?.value || "0");
  if (Date.now() - lastMs < 6 * 60 * 60 * 1000) return { skipped: true, reason: "rate_limited" };
  const contribution = await toContribution(profileId);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...contribution, reason }),
  });
  if (!res.ok) throw new Error(`Index sync failed: ${res.status}`);
  const payload = await res.json() as GuardPayload;
  await ingestCollectiveGuards(payload);
  await db.setting.upsert({ where: { key: "INDEX_LAST_SYNC" }, update: { value: String(Date.now()) }, create: { key: "INDEX_LAST_SYNC", value: String(Date.now()) } });
  return { skipped: false, guards: payload.guards?.length ?? 0 };
}

export async function ingestCollectiveGuards(payload: GuardPayload) {
  const guards = Array.isArray(payload.guards) ? payload.guards : [];
  let count = 0;
  for (const guard of guards.slice(0, 20)) {
    const model = String(guard.model ?? "").slice(0, 120);
    const domainTag = domainFromText(String(guard.domainTag ?? "general"));
    const warning = String(guard.warning ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
    const guardCount = Math.max(0, Number(guard.count ?? 0));
    if (!model || !warning) continue;
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
  return guards.map((guard) => `- Professionals corrected this ${guard.count}×: ${guard.warning}`);
}

async function sensitiveFragments(profileId: string) {
  const [projects, memories, outputs, corrections, skills, tasteRules] = await Promise.all([
    db.project.findMany({ where: { profileId }, select: { name: true, goal: true, rules: true, description: true } }),
    db.memory.findMany({ where: { profileId }, select: { content: true } }),
    db.output.findMany({ where: { profileId }, select: { prompt: true, draftContent: true, finalContent: true } }),
    db.correctionRecord.findMany({ where: { profileId }, select: { claimText: true, correctionText: true } }),
    db.skill.findMany({ where: { profileId }, select: { name: true, description: true, instructions: true } }),
    db.tasteRule.findMany({ where: { profileId }, select: { text: true } }),
  ]);
  return [
    ...projects.flatMap((item) => [item.name, item.goal, item.rules, item.description]),
    ...memories.map((item) => item.content),
    ...outputs.flatMap((item) => [item.prompt, item.draftContent, item.finalContent]),
    ...corrections.flatMap((item) => [item.claimText, item.correctionText]),
    ...skills.flatMap((item) => [item.name, item.description, item.instructions]),
    ...tasteRules.map((item) => item.text),
  ].map((value) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 40)).filter((value) => value.length >= 40);
}

function domainFromText(value: string) {
  const text = String(value ?? "").toLowerCase();
  return ["content", "brand", "review", "coaching", "audit", "research", "general"].find((tag) => text.includes(tag)) ?? "general";
}

function parseClaimsLocal(claimsJson: string): { status?: string }[] {
  try {
    const parsed = JSON.parse(claimsJson || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

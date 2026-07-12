export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { judgmentAssetStats, JUDGMENT_CONSENT_COPY } from "@/lib/judgment-layer";
import { resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request) {
  const profileId = await resolveRequestProfileId(req);
  const profile = await db.profile.findUnique({ where: { id: profileId } });
  const [decisions, activeSkillRules, activeTasteRules, corrections, personalWarnings, collectiveGuards, skills, tasteByContext, modelPolicies, firstRecords, topSkillRule, judgmentAsset] = await Promise.all([
    db.decisionRecord.count({ where: { profileId } }),
    db.skillRule.count({ where: { profileId, status: "active" } }),
    db.tasteRule.count({ where: { profileId, status: "active" } }),
    db.correctionRecord.count({ where: { profileId } }),
    db.correctionRecord.findMany({ where: { profileId, warning: { not: "" } }, select: { warning: true, model: true, domainTag: true } }),
    db.collectiveGuard.findMany({ where: { count: { gte: 25 } }, orderBy: { count: "desc" }, take: 20 }),
    db.skill.findMany({ where: { profileId }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.decisionRecord.findMany({ where: { profileId }, select: { contextTag: true } }),
    db.modelPolicy.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } }),
    db.$transaction([
      db.decisionRecord.findFirst({ where: { profileId }, orderBy: { createdAt: "asc" } }),
      db.correctionRecord.findFirst({ where: { profileId }, orderBy: { createdAt: "asc" } }),
      db.skillRule.findFirst({ where: { profileId }, orderBy: { createdAt: "asc" } }),
      db.tasteRule.findFirst({ where: { profileId }, orderBy: { createdAt: "asc" } }),
    ]),
    db.skillRule.findFirst({ where: { profileId, status: "active" }, orderBy: { createdAt: "desc" } }),
    judgmentAssetStats(profileId),
  ]);
  const warningCounts = new Map<string, number>();
  personalWarnings.forEach((record) => warningCounts.set(record.warning, (warningCounts.get(record.warning) ?? 0) + 1));
  const activePersonalGuards = Array.from(warningCounts.values()).filter((count) => count >= 2).length;
  const topGuard = Array.from(warningCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? collectiveGuards[0]?.warning ?? "";
  const contextCounts = tasteByContext.reduce<Record<string, number>>((acc, item) => {
    acc[item.contextTag] = (acc[item.contextTag] ?? 0) + 1;
    return acc;
  }, {});
  const oldest = firstRecords.filter(Boolean).map((row: any) => row.createdAt?.getTime?.() ?? Date.now()).sort((a, b) => a - b)[0];
  const days = oldest ? Math.max(1, Math.ceil((Date.now() - oldest) / 86400000)) : 0;
  return NextResponse.json({
    profile: profile ? { id: profile.id, name: profile.name, type: profile.type } : null,
    asset: {
      decisions,
      rules: activeSkillRules + activeTasteRules,
      corrections,
      guardsActive: activePersonalGuards + collectiveGuards.length,
      days,
    },
    engines: {
      method: {
        skills: skills.length,
        versions: skills.reduce((sum, skill) => sum + (skill.version ?? 1), 0),
        topRule: topSkillRule?.text ?? "",
      },
      truth: {
        corrections,
        topGuard,
        modelsCovered: new Set(personalWarnings.map((record) => record.model)).size,
      },
      taste: {
        decisions,
        activeRules: activeTasteRules,
        maturity: Object.entries(contextCounts).map(([contextTag, count]) => ({ contextTag, count, unlocked: count >= 20 })),
      },
    },
    index: {
      endpointConfigured: Boolean(process.env.INDEX_ENDPOINT),
      globalCollectiveGuards: collectiveGuards.length,
      judgmentAsset,
      consentCopy: JUDGMENT_CONSENT_COPY,
      message: collectiveGuards.length ? "" : "The collective layer activates as the network grows.",
    },
    globalCollectiveData: { guards: collectiveGuards.length },
    modelPolicies,
  });
}

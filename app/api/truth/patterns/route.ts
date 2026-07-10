export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ totalCorrections: 0, byModel: [], activeGuards: 0 });
  const records = await db.correctionRecord.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
  const byModel = Array.from(new Set(records.map((record) => record.model))).slice(0, 4).map((model) => {
    const modelRecords = records.filter((record) => record.model === model);
    const warningCounts = new Map<string, number>();
    modelRecords.forEach((record) => {
      if (record.warning) warningCounts.set(record.warning, (warningCounts.get(record.warning) ?? 0) + 1);
    });
    return {
      model,
      count: modelRecords.length,
      topWarnings: Array.from(warningCounts.entries()).filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([warning]) => warning),
    };
  });
  const activeWarnings = new Set<string>();
  records.forEach((record) => {
    if (!record.warning) return;
    const count = records.filter((item) => item.warning === record.warning && item.model === record.model && item.domainTag === record.domainTag).length;
    if (count >= 2) activeWarnings.add(`${record.model}:${record.domainTag}:${record.warning}`);
  });
  return NextResponse.json({ totalCorrections: records.length, byModel, activeGuards: activeWarnings.size });
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const [skillRules, tasteRules, correctionRecords, decisionRecords, modelPolicies] = await Promise.all([
    db.skillRule.findMany({ orderBy: { createdAt: "desc" } }),
    db.tasteRule.findMany({ orderBy: { createdAt: "desc" } }),
    db.correctionRecord.findMany({ orderBy: { createdAt: "desc" } }),
    db.decisionRecord.findMany({ orderBy: { createdAt: "desc" } }),
    db.modelPolicy.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ exportedAt: new Date().toISOString(), skillRules, tasteRules, correctionRecords, decisionRecords, modelPolicies });
}

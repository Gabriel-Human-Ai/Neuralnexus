export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const rules = await db.skillRule.findMany({ where: { skillId: params.id }, orderBy: { createdAt: "desc" } });
  const outputs = await db.output.findMany({ where: { id: { in: rules.map((rule) => rule.sourceOutputId).filter(Boolean) as string[] } } });
  return NextResponse.json(rules.map((rule) => {
    const output = outputs.find((item) => item.id === rule.sourceOutputId);
    return { ...rule, provenance: output ? { stepName: output.stepName, createdAt: output.createdAt } : null };
  }));
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const output = await db.output.findUnique({ where: { id: params.id } });
  if (!output) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const parent = output.parentOutputId ? await db.output.findUnique({ where: { id: output.parentOutputId } }) : null;
  return NextResponse.json({
    ...output,
    parent: parent ? { id: parent.id, model: parent.model, skillVersion: parent.skillVersion, content: parent.finalContent || parent.draftContent, costUsd: parent.costUsd } : null,
  });
}

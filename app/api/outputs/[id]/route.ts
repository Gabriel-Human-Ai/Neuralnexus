export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const profileId = await resolveRequestProfileId(req);
  const output = await db.output.findUnique({ where: { id: params.id } });
  if (!output) return NextResponse.json({ error: "not_found" }, { status: 404 });
  assertRecordProfile(output.profileId, profileId);
  const parent = output.parentOutputId ? await db.output.findUnique({ where: { id: output.parentOutputId } }) : null;
  return NextResponse.json({
    ...output,
    parent: parent ? { id: parent.id, model: parent.model, skillVersion: parent.skillVersion, content: parent.finalContent || parent.draftContent, costUsd: parent.costUsd } : null,
  });
}

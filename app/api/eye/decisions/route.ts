export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clampDesc, normalizeContext, recordDecision } from "@/lib/eye";
import { resolveRequestProfileId } from "@/lib/scope";

function artifactDesc(value: any) {
  if (!value) return "";
  return clampDesc(value.descriptor ?? value.text ?? "");
}

export async function GET(req: Request) {
  const contextTag = normalizeContext(new URL(req.url).searchParams.get("contextTag"));
  const profileId = await resolveRequestProfileId(req);
  const [total, rows, bySourceRows] = await Promise.all([
    db.decisionRecord.count({ where: { profileId, contextTag } }),
    db.decisionRecord.findMany({ where: { profileId, contextTag }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.decisionRecord.findMany({ where: { profileId, contextTag }, select: { source: true } }),
  ]);
  const bySource = bySourceRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.source] = (acc[row.source] ?? 0) + 1;
    return acc;
  }, {});
  return NextResponse.json({
    total,
    bySource,
    latest: rows.map((row) => ({ id: row.id, source: row.source, medium: row.medium, chosen: row.chosenDesc.slice(0, 120), rejected: row.rejectedDesc.slice(0, 120), createdAt: row.createdAt })),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = await resolveRequestProfileId(req, body.profileId);
    const chosenDesc = artifactDesc(body.chosen);
    if (!chosenDesc) return NextResponse.json({ error: "Missing chosen artifact." }, { status: 400 });
    const { record, totalForContext } = await recordDecision({
      profileId,
      contextTag: body.contextTag,
      chosenDesc,
      rejectedDesc: artifactDesc(body.rejected),
      medium: String(body.medium ?? "text"),
      source: String(body.source ?? "duel"),
      projectId: body.projectId ? String(body.projectId) : null,
      outputId: body.outputId ? String(body.outputId) : null,
      note: body.note ? String(body.note) : "",
    });
    return NextResponse.json({ id: record.id, totalForContext });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Could not record decision." }, { status: error.status || 500 });
  }
}

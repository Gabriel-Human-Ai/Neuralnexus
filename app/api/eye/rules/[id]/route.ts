export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { action } = await req.json();
  const profileId = await resolveRequestProfileId(req);
  if (action !== "accept" && action !== "reject") return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  const existing = await db.tasteRule.findUnique({ where: { id: params.id } });
  assertRecordProfile(existing?.profileId, profileId);
  const rule = await db.tasteRule.update({ where: { id: params.id }, data: { status: action === "accept" ? "active" : "rejected" } });
  return NextResponse.json({ rule });
}

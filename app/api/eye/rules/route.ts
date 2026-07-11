export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeContext } from "@/lib/eye";
import { resolveRequestProfileId } from "@/lib/scope";

export async function GET(req: Request) {
  const contextTag = normalizeContext(new URL(req.url).searchParams.get("contextTag"));
  const profileId = await resolveRequestProfileId(req);
  const rules = await db.tasteRule.findMany({ where: { profileId, contextTag }, orderBy: [{ status: "desc" }, { createdAt: "desc" }] });
  return NextResponse.json({ rules });
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveRequestProfileId } from "@/lib/scope";

export async function POST(req: Request) {
  try {
    const profileId = await resolveRequestProfileId(req);
    await db.memory.deleteMany({ where: { profileId } });
    return NextResponse.json({ ok: true });
  }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

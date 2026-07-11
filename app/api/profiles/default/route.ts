export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { ensureDefaultWorkProfile } from "@/lib/profiles";

export async function GET() {
  try {
    return NextResponse.json(await ensureDefaultWorkProfile());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

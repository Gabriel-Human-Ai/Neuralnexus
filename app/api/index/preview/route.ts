export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { toContribution } from "@/lib/index-protocol";

export async function GET() {
  try {
    return NextResponse.json(await toContribution());
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Could not prepare Index payload." }, { status: 500 });
  }
}

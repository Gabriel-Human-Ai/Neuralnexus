export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseClaims, verifyExternalClaims } from "@/lib/truth";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { claimIds } = await req.json();
  const profileId = await resolveRequestProfileId(req);
  if (!Array.isArray(claimIds) || claimIds.length < 1 || claimIds.length > 8) {
    return NextResponse.json({ error: "invalid_claim_ids" }, { status: 400 });
  }
  const output = await db.output.findUnique({ where: { id: params.id } });
  if (!output) return NextResponse.json({ error: "not_found" }, { status: 404 });
  assertRecordProfile(output.profileId, profileId);
  const claims = parseClaims(output.claimsJson);
  if (claimIds.some((id: string) => !claims.some((claim) => claim.id === id && claim.status === "external"))) {
    return NextResponse.json({ error: "invalid_claim_ids" }, { status: 400 });
  }
  try {
    const updated = await verifyExternalClaims({ output, claimIds });
    return NextResponse.json({ claims: updated });
  } catch (error: any) {
    if (error.message === "no_independent_verifier") return NextResponse.json({ error: "no_independent_verifier" }, { status: 409 });
    console.error("verify failed", error);
    return NextResponse.json({ error: "verify_failed" }, { status: 502 });
  }
}

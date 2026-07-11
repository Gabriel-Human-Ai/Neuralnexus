export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maybeRunAutopilotBenchmark } from "@/lib/benchmark";
import { extractSkillRulesFromOutput } from "@/lib/genome";
import { captureEditDiffCorrections } from "@/lib/truth";
import { captureEyeDecisionsFromFinalize } from "@/lib/eye";
import { syncIndexProtocol } from "@/lib/index-protocol";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { finalContent } = await req.json();
  const profileId = await resolveRequestProfileId(req);
  const output = await db.output.findUnique({ where: { id: params.id } });
  if (!output) return NextResponse.json({ error: "not_found" }, { status: 404 });
  assertRecordProfile(output.profileId, profileId);
  await db.output.update({ where: { id: params.id }, data: { finalContent: String(finalContent ?? ""), status: "final" } });
  void (async () => {
    try {
      await extractSkillRulesFromOutput(params.id);
      await captureEyeDecisionsFromFinalize(params.id);
      await captureEditDiffCorrections(params.id);
      await syncIndexProtocol("finalize", profileId);
      await maybeRunAutopilotBenchmark(params.id);
    } catch (error) {
      console.error("finalize background failed", error);
    }
  })();
  return NextResponse.json({ ok: true });
}

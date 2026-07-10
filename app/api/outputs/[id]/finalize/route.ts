export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maybeRunAutopilotBenchmark } from "@/lib/benchmark";
import { extractSkillRulesFromOutput } from "@/lib/genome";
import { captureEditDiffCorrections } from "@/lib/truth";
import { captureEyeDecisionsFromFinalize } from "@/lib/eye";
import { syncIndexProtocol } from "@/lib/index-protocol";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { finalContent } = await req.json();
  await db.output.update({ where: { id: params.id }, data: { finalContent: String(finalContent ?? ""), status: "final" } });
  void (async () => {
    try {
      await extractSkillRulesFromOutput(params.id);
      await captureEyeDecisionsFromFinalize(params.id);
      await captureEditDiffCorrections(params.id);
      await syncIndexProtocol("finalize");
      await maybeRunAutopilotBenchmark(params.id);
    } catch (error) {
      console.error("finalize background failed", error);
    }
  })();
  return NextResponse.json({ ok: true });
}

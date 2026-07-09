export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { runWorkspaceStep } from "@/lib/output-runner";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.projectId || !body.stepName || !body.stepDescription) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const result = await runWorkspaceStep({ ...body, checklist: Array.isArray(body.checklist) ? body.checklist : [] });
    return NextResponse.json({ outputId: result.output.id, content: result.content, model: result.model, provider: result.provider, costUsd: result.costUsd, qualityReport: result.qualityReport });
  } catch (error: any) {
    const message = error.message ?? "provider_failure";
    const status = message.includes("API-Key") || message.includes("Kein API") ? 402 : message === "missing_fields" ? 400 : 502;
    return NextResponse.json({ error: status === 402 ? "no_api_key" : message }, { status });
  }
}

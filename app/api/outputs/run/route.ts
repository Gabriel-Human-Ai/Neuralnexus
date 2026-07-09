export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { runWorkspaceStep, runWorkspaceStepStreaming } from "@/lib/output-runner";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.projectId || !body.stepName || !body.stepDescription) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    if (req.headers.get("accept")?.includes("application/x-ndjson")) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          try {
            await runWorkspaceStepStreaming({ ...body, checklist: Array.isArray(body.checklist) ? body.checklist : [] }, send as any);
          } catch (error: any) {
            send({ type: "error", message: error.message ?? "run_failed" });
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
    }
    const result = await runWorkspaceStep({ ...body, checklist: Array.isArray(body.checklist) ? body.checklist : [] });
    return NextResponse.json({ outputId: result.output.id, content: result.content, model: result.model, provider: result.provider, costUsd: result.costUsd, qualityReport: result.qualityReport });
  } catch (error: any) {
    const message = error.message ?? "provider_failure";
    const status = message.includes("API-Key") || message.includes("Kein API") ? 402 : message === "missing_fields" ? 400 : 502;
    return NextResponse.json({ error: status === 402 ? "no_api_key" : message }, { status });
  }
}

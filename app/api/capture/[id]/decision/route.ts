export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CAPTURE_DECISIONS, indexPreviewForCapture, scrubText } from "@/lib/capture-safety";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";

async function assertExtensionAuth(req: Request) {
  const configured = await db.setting.findUnique({ where: { key: "EXTENSION_CAPTURE_TOKEN" } });
  const token = req.headers.get("x-neuralnexus-extension-token") || "";
  if (!configured?.value || configured.value !== token) {
    return NextResponse.json({ error: "Extension token missing or invalid." }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const authError = await assertExtensionAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const profileId = await resolveRequestProfileId(req, body.profileId);
  const decision = CAPTURE_DECISIONS.includes(String(body.decision) as any) ? String(body.decision) : "";
  if (!decision) return NextResponse.json({ error: "Decision must be approve, reject, revise, keep or mark_wrong." }, { status: 400 });

  const note = scrubText(body.note ?? "").slice(0, 500);
  const existing = await db.captureRecord.findUnique({ where: { id: params.id } });
  assertRecordProfile(existing?.profileId, profileId);
  const capture = await db.captureRecord.update({
    where: { id: params.id },
    data: {
      decision,
      decisionNote: note,
      indexEligible: Boolean(body.indexEligible),
      decidedAt: new Date(),
    },
  });

  const descriptor = JSON.stringify({
    source: "browser_capture",
    action: capture.action,
    decision,
    captureType: capture.captureType,
    sourceHost: capture.sourceHost,
    summary: capture.summary.slice(0, 500),
  });

  await db.decisionRecord.create({
    data: {
      profileId,
      contextTag: capture.action === "review" || capture.action === "preflight" ? "review" : "general",
      chosenDesc: descriptor.slice(0, 1500),
      rejectedDesc: "",
      medium: capture.screenshotData ? "mixed-url" : "text",
      source: "browser-capture",
      note,
    },
  });

  return NextResponse.json({
    ok: true,
    captureId: capture.id,
    privateVaultSignal: true,
    indexEligible: capture.indexEligible,
    indexPreview: indexPreviewForCapture(capture),
  });
}

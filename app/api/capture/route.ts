export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { indexPreviewForCapture, sanitizeCaptureInput } from "@/lib/capture-safety";

async function assertExtensionAuth(req: Request) {
  const configured = await db.setting.findUnique({ where: { key: "EXTENSION_CAPTURE_TOKEN" } });
  const token = req.headers.get("x-neuralnexus-extension-token") || "";
  if (!configured?.value || configured.value !== token) {
    return NextResponse.json({ error: "Extension token missing or invalid." }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const captures = await db.captureRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      sourceHost: true,
      captureType: true,
      action: true,
      summary: true,
      decision: true,
      indexEligible: true,
      createdAt: true,
      decidedAt: true,
    },
  });
  return NextResponse.json({ captures });
}

export async function POST(req: Request) {
  const authError = await assertExtensionAuth(req);
  if (authError) return authError;

  const body = await req.json();
  const safe = sanitizeCaptureInput(body);
  if (!safe.text && !safe.screenshotData) {
    return NextResponse.json({ error: "Capture needs selected text, page text or a visible screenshot." }, { status: 400 });
  }

  const capture = await db.captureRecord.create({ data: safe });
  await db.memory.create({
    data: {
      kind: `capture:${safe.action}`,
      content: safe.summary,
      projectId: null,
    },
  });

  return NextResponse.json({
    capture: {
      id: capture.id,
      title: capture.title,
      sourceHost: capture.sourceHost,
      captureType: capture.captureType,
      action: capture.action,
      summary: capture.summary,
      createdAt: capture.createdAt,
    },
    nextActions: ["approve", "reject", "revise", "keep", "mark_wrong"],
    indexPreview: indexPreviewForCapture(capture),
  });
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createExtensionToken } from "@/lib/capture-safety";

export async function POST() {
  const token = createExtensionToken();
  await db.setting.upsert({
    where: { key: "EXTENSION_CAPTURE_TOKEN" },
    update: { value: token },
    create: { key: "EXTENSION_CAPTURE_TOKEN", value: token },
  });
  return NextResponse.json({
    token,
    note: "Store this token in the NeuralNexus Capture extension. Regenerating replaces the previous token.",
  });
}

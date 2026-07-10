export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { describeImageArtifact } from "@/lib/eye";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const raw = String(body.imageBase64 ?? "");
    const imageData = raw.includes(",") ? raw.split(",").pop() || "" : raw;
    const descriptor = await describeImageArtifact({ imageData, mediaType: String(body.mediaType ?? "") });
    return NextResponse.json({ descriptor });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Could not describe image." }, { status: error.status || 500 });
  }
}

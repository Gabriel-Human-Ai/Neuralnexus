export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { buildMemoryFiles } from "@/lib/context";

export async function GET(req: Request) {
  try {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId fehlt" }, { status: 400 });
  const files = await buildMemoryFiles(projectId);
  return NextResponse.json(files);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const projectId = new URL(req.url).searchParams.get("projectId");
    const runs = await db.modelRun.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: "desc" }, take: projectId ? 500 : 100, include: { project: true },
    });
    const total = runs.reduce((s, r) => s + r.costUsd, 0);
    return NextResponse.json({ runs, total });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

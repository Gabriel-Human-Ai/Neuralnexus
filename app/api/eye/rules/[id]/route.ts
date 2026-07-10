export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { action } = await req.json();
  if (action !== "accept" && action !== "reject") return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  const rule = await db.tasteRule.update({ where: { id: params.id }, data: { status: action === "accept" ? "active" : "rejected" } });
  return NextResponse.json({ rule });
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runChatWithFallback } from "@/lib/providers";

export async function POST(req: Request) {
  try {
    const { projectId, singleMessage } = await req.json();
    let sourceText = singleMessage as string | undefined;

    if (!sourceText) {
      if (!projectId) return NextResponse.json({ error: "projectId fehlt" }, { status: 400 });
      const msgs = await db.message.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, take: 20 });
      sourceText = msgs.reverse().map(m => `${m.role}: ${m.content}`).join("\n").slice(0, 6000);
    }
    if (!sourceText?.trim()) return NextResponse.json({ error: "Kein Chat-Inhalt zum Extrahieren" }, { status: 400 });

    const extraction = await runChatWithFallback("claude-haiku-4-5", [
      { role: "system", content: `Extrahiere aus diesem Chat-Verlauf eine wiederverwendbare Fähigkeit (Skill).
Antworte NUR als JSON, keine Erklärung, kein Markdown: {"name":"...", "description":"...", "instructions":"..."}
name: 2-4 Worte. description: 1 Satz. instructions: konkrete Anweisung, wie eine KI diese Aufgabe künftig lösen soll.` },
      { role: "user", content: sourceText },
    ]);

    let parsed: any;
    try { parsed = JSON.parse(extraction.text.trim().replace(/^```json\n?|```$/g, "")); }
    catch { return NextResponse.json({ error: "Extraktion fehlgeschlagen — Modell lieferte kein valides JSON." }, { status: 500 }); }

    const skill = await db.skill.create({ data: { name: parsed.name ?? "Neuer Skill", description: parsed.description ?? "", instructions: parsed.instructions ?? "" } });
    return NextResponse.json(skill);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

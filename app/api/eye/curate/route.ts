export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertEyeMature, clampDesc, eyeProjectId, normalizeContext } from "@/lib/eye";
import { pickMetaModel } from "@/lib/meta-model";
import { runChat } from "@/lib/providers";
import { parseModelJson } from "@/lib/safe-parse";
import { estimateCost } from "@/lib/tokens";
import { resolveRequestProfileId } from "@/lib/scope";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = await resolveRequestProfileId(req, body.profileId);
    const contextTag = normalizeContext(body.contextTag);
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length < 2 || items.length > 6) return NextResponse.json({ error: "Curation needs 2–6 options." }, { status: 400 });
    const types = new Set(items.map((item: any) => item.imageDescriptor ? "image" : item.text ? "text" : "missing"));
    if (types.size !== 1 || types.has("missing")) return NextResponse.json({ error: "Curation options must be the same type." }, { status: 400 });
    const artifacts: string[] = items.map((item: any) => clampDesc(item.imageDescriptor ?? item.text ?? "", 1500));
    const { decisions, activeRules } = await assertEyeMature(profileId, contextTag);
    const meta = await pickMetaModel();
    if (!meta) return NextResponse.json({ error: "The Eye needs a connected model." }, { status: 409 });
    const result = await runChat(meta.provider, meta.id, [
      {
        role: "system",
        content: "You are THE EYE — one professional's codified judgment. Rank the OPTIONS strictly by their TASTE RULES; generic appeal is irrelevant.\nReturn ONLY valid JSON:\n{\"ranking\":[{\"index\":<0-based>,\"reason\":\"<≤90 chars why it ranks here BY THE RULES>\"}]}\nRank every option exactly once, best first. Be decisive; no ties.",
      },
      { role: "user", content: `TASTE RULES:\n${activeRules.map((rule) => `${rule.id}: ${rule.text} · ${rule.confidence}`).join("\n")}\n\nDECISION HISTORY: ${decisions} recorded decisions in context "${contextTag}".\n\nOPTIONS:\n${artifacts.map((artifact, index) => `${index}: ${artifact}`).join("\n\n")}` },
    ], { maxTokens: 1000, temperature: 0 });
    await db.modelRun.create({ data: { profileId, projectId: await eyeProjectId(profileId), provider: meta.provider, model: meta.id, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: estimateCost(meta.id, result.inputTokens, result.outputTokens), purpose: "eye" } });
    const parsed = parseModelJson<{ ranking: { index: number; reason: string }[] }>(result.text);
    if (!parsed?.ranking?.length) return NextResponse.json({ error: "The Eye could not rank options." }, { status: 422 });
    return NextResponse.json({ ranking: parsed.ranking, totalDecisions: decisions });
  } catch (error: any) {
    if (error.message === "eye_immature") return NextResponse.json({ error: "eye_immature", decisions: error.decisions, needed: error.needed }, { status: 409 });
    return NextResponse.json({ error: error.message || "Could not curate options." }, { status: error.status || 500 });
  }
}

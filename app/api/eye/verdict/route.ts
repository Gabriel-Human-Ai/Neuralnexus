export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertEyeMature, clampDesc, eyeProjectId, normalizeContext } from "@/lib/eye";
import { pickMetaModel } from "@/lib/meta-model";
import { runChat } from "@/lib/providers";
import { parseModelJson } from "@/lib/safe-parse";
import { estimateCost } from "@/lib/tokens";

async function artifactFromBody(body: any) {
  if (typeof body.text === "string" && body.text.trim()) return clampDesc(body.text, 6000);
  if (typeof body.imageDescriptor === "string" && body.imageDescriptor.trim()) return clampDesc(body.imageDescriptor);
  if (typeof body.url === "string" && body.url.trim()) {
    try {
      const res = await fetch(body.url, { redirect: "follow" });
      if (!res.ok) throw new Error("bad status");
      const html = await res.text();
      return clampDesc(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "), 8000);
    } catch {
      throw Object.assign(new Error("Could not read that URL."), { status: 422 });
    }
  }
  throw Object.assign(new Error("Missing artifact."), { status: 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const contextTag = normalizeContext(body.contextTag);
    const artifact = await artifactFromBody(body);
    const { decisions, activeRules } = await assertEyeMature(contextTag);
    const meta = await pickMetaModel();
    if (!meta) return NextResponse.json({ error: "The Eye needs a connected model." }, { status: 409 });
    const result = await runChat(meta.provider, meta.id, [
      {
        role: "system",
        content: "You are THE EYE — the codified judgment of one specific professional. You judge ONLY by their TASTE RULES and decision history counts provided. You are not a generic critic; generic best practices are irrelevant unless a rule encodes them.\nVerdict scale: \"approve\" (they would ship it), \"revise\" (right direction, specific fixes needed), \"kill\" (they would reject the direction itself).\nReturn ONLY valid JSON:\n{\"verdict\":\"approve\"|\"revise\"|\"kill\",\n \"confidence\":\"low\"|\"medium\"|\"high\",\n \"reasons\":[{\"ruleId\":\"<id or null>\",\"text\":\"<≤120 chars, concrete, references the artifact>\"}],\n \"suggestions\":[\"<≤140 chars>\"]}\nEvery reason with a ruleId must genuinely apply that rule. Be decisive.",
      },
      { role: "user", content: `TASTE RULES (id: text · confidence):\n${activeRules.map((rule) => `${rule.id}: ${rule.text} · ${rule.confidence}`).join("\n")}\n\nDECISION HISTORY: ${decisions} recorded decisions in context "${contextTag}".\n\nARTIFACT:\n${artifact}` },
    ], { maxTokens: 900, temperature: 0 });
    await db.modelRun.create({ data: { projectId: await eyeProjectId(), provider: meta.provider, model: meta.id, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: estimateCost(meta.id, result.inputTokens, result.outputTokens), purpose: "eye" } });
    const parsed = parseModelJson<any>(result.text);
    if (!parsed) return NextResponse.json({ error: "The Eye could not return a verdict." }, { status: 422 });
    const ruleMap = new Map(activeRules.map((rule) => [rule.id, rule]));
    return NextResponse.json({
      ...parsed,
      totalDecisions: decisions,
      rules: activeRules,
      reasons: (parsed.reasons ?? []).slice(0, 5).map((reason: any) => ({ ...reason, rule: reason.ruleId ? ruleMap.get(reason.ruleId)?.text ?? null : null, confidenceCount: reason.ruleId ? ruleMap.get(reason.ruleId)?.confidence ?? null : null })),
    });
  } catch (error: any) {
    if (error.message === "eye_immature") return NextResponse.json({ error: "eye_immature", decisions: error.decisions, needed: error.needed }, { status: 409 });
    return NextResponse.json({ error: error.message || "Could not judge artifact." }, { status: error.status || 500 });
  }
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAllSettings } from "@/lib/db-helpers";
import { pickMetaModel } from "@/lib/meta-model";
import { runChat } from "@/lib/providers";
import { parseModelJson } from "@/lib/safe-parse";
import { estimateCost } from "@/lib/tokens";

type Extracted = {
  workspaceName: string;
  purpose: string;
  audience: string;
  modeId: string;
  steps: { name: string; description: string }[];
  skills: { name: string; instructions: string; rules: string[] }[];
  knowledgeTitle: string;
  sourceSummary?: string;
};

export async function POST(req: Request) {
  const body = await req.json();
  let text = String(body.text ?? "");
  const mediaType = body.mediaType as string | undefined;
  if (text.length > 30000) return NextResponse.json({ error: "too_large" }, { status: 413 });
  if (!text && body.fileBase64 && mediaType?.startsWith("text/")) {
    text = Buffer.from(String(body.fileBase64), "base64").toString("utf8").slice(0, 30000);
  }
  if (!text && mediaType === "application/pdf") {
    const settings = await getAllSettings();
    if (!settings.ANTHROPIC_API_KEY && !settings.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "pdf_needs_claude", message: "PDF extraction needs an Anthropic or OpenRouter key. Paste the text instead." }, { status: 422 });
    }
    text = `PDF: ${body.filename ?? "uploaded.pdf"}`;
  }
  if (!text.trim()) return NextResponse.json({ error: "missing_input" }, { status: 400 });
  const meta = await pickMetaModel();
  if (!meta) return NextResponse.json({ error: "no_api_key" }, { status: 402 });
  const system = "You convert an expert's raw material (method, framework, course notes, prompt pack) into a runnable AI workspace definition.\nReturn ONLY valid JSON matching exactly:\n{\n \"workspaceName\": \"<max 40 chars, title case, no quotes>\",\n \"purpose\": \"<one sentence, max 160 chars>\",\n \"audience\": \"<max 60 chars>\",\n \"modeId\": \"content\" | \"brand\" | \"review\" | \"coaching\" | \"audit\" | \"research\",\n \"steps\": [ { \"name\": \"<max 40 chars, imperative>\", \"description\": \"<max 120 chars>\" } ],\n \"skills\": [ { \"name\": \"<max 30 chars>\", \"instructions\": \"<80-400 chars, imperative method summary>\", \"rules\": [\"<max 140 chars>\"] } ],\n \"knowledgeTitle\": \"<max 50 chars>\",\n \"sourceSummary\": \"<max 1500 chars>\"\n}\nBase everything strictly on the material. Do not invent domain content that is not present. Pick the closest modeId.";
  const result = await runChat(meta.provider, meta.id, [
    { role: "system", content: system },
    { role: "user", content: `MATERIAL:\n${mediaType === "application/pdf" ? "Read the attached document as MATERIAL." : text}` },
  ], { maxTokens: 2000, temperature: 0 });
  const parsed = parseModelJson<Extracted>(result.text);
  if (!parsed) return NextResponse.json({ error: "model_returned_invalid_json" }, { status: 502 });
  const project = await db.project.create({ data: { name: parsed.workspaceName.slice(0, 40), goal: `${parsed.purpose.slice(0, 160)}\nAudience: ${parsed.audience.slice(0, 60)}\nMode: ${parsed.modeId}`, rules: `Workflow steps: ${parsed.steps.slice(0, 6).map((step) => step.name).join(" | ")}` } });
  for (const skill of parsed.skills.slice(0, 3)) {
    let name = skill.name.slice(0, 30);
    if (await db.skill.findFirst({ where: { name } })) name = `${name} (${parsed.workspaceName.slice(0, 20)})`;
    const created = await db.skill.create({ data: { name, description: skill.instructions.slice(0, 100), instructions: skill.instructions.slice(0, 400), version: 1 + (skill.rules ?? []).length } });
    for (const rule of (skill.rules ?? []).slice(0, 4)) {
      await db.skillRule.create({ data: { skillId: created.id, text: rule.slice(0, 140), source: "imported", status: "active" } });
    }
  }
  await db.memory.create({ data: { projectId: project.id, kind: "knowledge", content: `${parsed.knowledgeTitle.slice(0, 50)}\n\n${mediaType === "application/pdf" ? `PDF: ${body.filename ?? "uploaded.pdf"}\n${(parsed.sourceSummary ?? "").slice(0, 1500)}` : text.slice(0, 8000)}` } });
  await db.setting.upsert({ where: { key: `WORKSPACE_STEPS_${project.id}` }, create: { key: `WORKSPACE_STEPS_${project.id}`, value: JSON.stringify(parsed.steps.slice(0, 6)) }, update: { value: JSON.stringify(parsed.steps.slice(0, 6)) } });
  await db.modelRun.create({ data: { projectId: project.id, provider: meta.provider, model: meta.id, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: estimateCost(meta.id, result.inputTokens, result.outputTokens), purpose: "extractor" } });
  return NextResponse.json({ projectId: project.id, workspaceName: project.name, stepCount: parsed.steps.length, skillCount: parsed.skills.length });
}

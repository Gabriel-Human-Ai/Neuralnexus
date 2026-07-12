export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runChatWithFallback, pickModelForTask, MODELS } from "@/lib/providers";
import { buildContext } from "@/lib/context";
import { estimateCost } from "@/lib/tokens";
import { assertRecordProfile, resolveRequestProfileId } from "@/lib/scope";
import { getSettingForProfile } from "@/lib/settings";
import { buildProfileDirective, runSignalReaderForNotice } from "@/lib/living-profile";
import { withProviderProfile } from "@/lib/provider-scope";

const SECRET_RE = /(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/g;
const PII_RE: { re: RegExp; label: string }[] = [
  { re: /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi, label: "EMAIL" },
  { re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, label: "IBAN" },
  { re: /\b(\+?\d[\d\s()-]{7,}\d)\b/g, label: "PHONE" },
];
const STRICT_NAME_RE = /\b([A-ZÄÖÜ][a-zäöüß]+\s[A-ZÄÖÜ][a-zäöüß]+)\b/g; // heuristic: "Vorname Nachname"

// level: "off" = only secrets stripped (always, security baseline) · "pii" = + email/phone/iban · "strict" = + name-heuristic + custom codenames
async function shieldPII(profileId: string, text: string): Promise<string> {
  let out = text.replace(SECRET_RE, "[SECRET ENTFERNT]");
  const level = await getSettingForProfile(profileId, "PRIVACY_LEVEL") || "pii";
  if (level === "off") return out;
  for (const { re, label } of PII_RE) out = out.replace(re, `[${label} MASKIERT]`);
  if (level === "strict") {
    out = out.replace(STRICT_NAME_RE, "[NAME MASKIERT]");
    const codenames = (await getSettingForProfile(profileId, "COMPANY_CODENAMES")).split(",").map(s => s.trim()).filter(Boolean);
    for (const c of codenames) out = out.split(c).join("[FIRMENCODE MASKIERT]");
  }
  return out;
}

export async function GET(req: Request) {
  try {
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json([]);
  const profileId = await resolveRequestProfileId(req);
  const project = await db.project.findUnique({ where: { id: projectId } });
  assertRecordProfile(project?.profileId, profileId);
  const msgs = await db.message.findMany({ where: { profileId, projectId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(msgs);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { projectId, model, content, agentId, image } = await req.json();
    if (!projectId || !content?.trim()) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project?.profileId) return NextResponse.json({ error: "project_not_found" }, { status: 404 });
    const profileId = project.profileId;

    let chosen = model;
    if (model === "agent" && agentId) {
      const a = await db.agent.findUnique({ where: { id: agentId } });
      if (a?.profileId !== profileId) return NextResponse.json({ error: "agent_not_found" }, { status: 404 });
      chosen = a?.preferredModel && a.preferredModel !== "auto" ? a.preferredModel : "auto";
    }
    const wasAuto = chosen === "auto" || model === "auto";
    if (chosen === "auto") chosen = pickModelForTask(content);

    // Budget Guard: daily AND monthly limits — whichever is hit first wins.
    const monthlyBudgetValue = await getSettingForProfile(profileId, "MONTHLY_BUDGET_USD");
    const dailyBudgetValue = await getSettingForProfile(profileId, "DAILY_BUDGET_USD");
    const monthlyBudget = monthlyBudgetValue ? parseFloat(monthlyBudgetValue) : 0;
    const dailyBudget = dailyBudgetValue ? parseFloat(dailyBudgetValue) : 0;
    let budgetWarning: string | undefined;
    if (monthlyBudget > 0 || dailyBudget > 0) {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      const monthRuns = await db.modelRun.findMany({ where: { profileId, createdAt: { gte: monthStart } } });
      const monthSpent = monthRuns.reduce((s, r) => s + r.costUsd, 0);
      const daySpent = monthRuns.filter(r => r.createdAt >= dayStart).reduce((s, r) => s + r.costUsd, 0);
      const monthRatio = monthlyBudget > 0 ? monthSpent / monthlyBudget : 0;
      const dayRatio = dailyBudget > 0 ? daySpent / dailyBudget : 0;
      const ratio = Math.max(monthRatio, dayRatio);
      const label = dayRatio >= monthRatio ? `daily budget ($${dailyBudget})` : `monthly budget ($${monthlyBudget})`;
      if (ratio >= 1) { chosen = "gpt-4o-mini"; budgetWarning = `${label} reached. Switched to the lowest-cost model.\n\n`; }
      else if (ratio >= 0.8) { budgetWarning = `${Math.round(ratio * 100)}% of the ${label} is used.\n\n`; }
    }

    // Auto: score available models by cost-vs-quality, weighted by the user's routing threshold (0=billig, 100=Qualität).
    if (wasAuto) {
      const keyFor = (prov: string) => ({ anthropic: "ANTHROPIC_API_KEY", openrouter: "OPENROUTER_API_KEY", google: "GOOGLE_API_KEY", deepseek: "DEEPSEEK_API_KEY" } as Record<string, string>)[prov] ?? "OPENAI_API_KEY";
      const hasKey = async (prov: string) => !!((await getSettingForProfile(profileId, keyFor(prov))) || process.env[keyFor(prov)]);
      const thresholdSetting = await getSettingForProfile(profileId, "ROUTING_THRESHOLD");
      const threshold = thresholdSetting ? Math.min(100, Math.max(0, parseFloat(thresholdSetting))) : 50;
      const w = threshold / 100; // 0 = pure cost, 1 = pure quality

      const QUALITY: Record<string, number> = {
        "claude-sonnet-4-6": 3, "gpt-4o": 3, "gemini-2.0-pro": 3,
        "x-ai/grok-3": 3, "google/gemini-2.5-pro-preview": 3, "perplexity/sonar-pro": 3,
        "z-ai/glm-4.6": 2, "claude-haiku-4-5": 2, "deepseek-chat": 2,
        "meta-llama/llama-4-maverick": 2, "mistralai/mistral-large": 2, "cohere/command-r-plus": 2,
        "qwen/qwen-2.5-72b-instruct": 2, "google/gemini-2.0-flash-001": 2, "x-ai/grok-3-mini": 2,
        "gpt-4o-mini": 1, "meta-llama/llama-4-scout": 1, "meta-llama/llama-3.3-70b-instruct": 1,
        "mistralai/mistral-small": 1, "qwen/qwen-2.5-coder-32b-instruct": 1, "mistralai/codestral-latest": 1,
      };
      const COST: Record<string, number> = {
        "claude-sonnet-4-6": 9, "gpt-4o": 6.25, "gemini-2.0-pro": 2.5,
        "x-ai/grok-3": 9, "google/gemini-2.5-pro-preview": 5.6, "perplexity/sonar-pro": 9,
        "z-ai/glm-4.6": 1.4, "claude-haiku-4-5": 3, "deepseek-chat": 0.55,
        "meta-llama/llama-4-maverick": 0.39, "mistralai/mistral-large": 4, "cohere/command-r-plus": 6.25,
        "qwen/qwen-2.5-72b-instruct": 0.38, "google/gemini-2.0-flash-001": 0.25, "x-ai/grok-3-mini": 0.4,
        "gpt-4o-mini": 0.375, "meta-llama/llama-4-scout": 0.19, "meta-llama/llama-3.3-70b-instruct": 0.26,
        "mistralai/mistral-small": 0.2, "qwen/qwen-2.5-coder-32b-instruct": 0.12, "mistralai/codestral-latest": 0.6,
      };
      const maxCost = Math.max(...Object.values(COST));

      const candidates: { id: string; score: number }[] = [];
      for (const m of MODELS) {
        if (!(await hasKey(m.provider))) continue;
        const qualityScore = (QUALITY[m.id] ?? 1) / 3;
        const costScore = 1 - (COST[m.id] ?? maxCost) / maxCost;
        candidates.push({ id: m.id, score: w * qualityScore + (1 - w) * costScore });
      }
      candidates.sort((a, b) => b.score - a.score);
      if (candidates[0]) chosen = candidates[0].id;
    }


    if (!MODELS.find(x => x.id === chosen)) return NextResponse.json({ error: "Unbekanntes Modell" }, { status: 400 });

    const clean = await shieldPII(profileId, content);
    await db.message.create({ data: { profileId, projectId, role: "user", content: clean } });

    // Tone detection — mini call to cheapest available model. Never blocks or throws.
    let tone: string | null = null;
    if (content.trim().length > 80) {
      try {
        const toneResult = await withProviderProfile(profileId, () => runChatWithFallback("claude-haiku-4-5", [
          { role: "system", content: "Klassifiziere den emotionalen Ton in genau einem Wort. Antworte nur mit dem Wort, nichts sonst: frustriert|neugierig|ruhig|eilig|begeistert" },
          { role: "user", content: content.slice(0, 400) },
        ]));
        const raw = toneResult.text.trim().toLowerCase();
        const allowed = ["frustriert","neugierig","ruhig","eilig","begeistert"];
        if (allowed.includes(raw)) tone = raw;
        // Log tone-detection cost separately — honest bookkeeping
        const toneCost = estimateCost(toneResult.usedModel, toneResult.inputTokens, toneResult.outputTokens);
        const toneProv = MODELS.find(x => x.id === toneResult.usedModel)?.provider ?? "unknown";
        await db.modelRun.create({ data: { profileId, projectId, provider: toneProv, model: toneResult.usedModel, inputTokens: toneResult.inputTokens, outputTokens: toneResult.outputTokens, costUsd: toneCost } }).catch(() => {});
      } catch { /* tone is optional — never block the chat */ }
    }

    let system = await buildContext({ profileId, projectId });
    const profileDirective = await buildProfileDirective(profileId);
    if (profileDirective) system += `\n\n${profileDirective}`;

    // Check if memory was actually loaded into context (buildContext includes memories when present)
    const memories = await db.memory.findMany({ where: { profileId, projectId } });
    const usedMemory = memories.length > 0;

    // Tone-informed system prompt addition
    if (tone) {
      const toneHint: Record<string, string> = {
        frustriert: "Der Nutzer wirkt frustriert. Geh direkt zur Lösung, keine Floskeln.",
        eilig: "Der Nutzer wirkt eilig. Antworte maximal kompakt, stichpunktartig wenn möglich.",
        neugierig: "Der Nutzer wirkt neugierig. Gib etwas mehr Kontext und Hintergründe.",
        ruhig: "Der Nutzer wirkt ruhig. Normaler Stil.",
        begeistert: "Der Nutzer wirkt begeistert. Geh auf seine Energie ein.",
      };
      system = system + "\n\n[Ton-Hinweis] " + (toneHint[tone] ?? "");
    }

    if (agentId) {
      const agent = await db.agent.findUnique({ where: { id: agentId } });
      if (agent && agent.profileId === profileId) {
        const skillIds = agent.skillIds ? agent.skillIds.split(",").filter(Boolean) : [];
        const skills = skillIds.length ? await db.skill.findMany({ where: { profileId, id: { in: skillIds } } }) : [];
        const skillText = skills.map(k => `## Skill: ${k.name}\n${k.instructions}`).join("\n\n");
        system = `# Rolle: ${agent.name}\n${agent.systemPrompt}\n\n${skillText}\n\n${system}`;
      }
    }
    const history = await db.message.findMany({ where: { profileId, projectId }, orderBy: { createdAt: "asc" }, take: 20 });
    const mapped: any[] = history.map(h => ({ role: h.role as "user" | "assistant", content: h.content }));
    if (image?.data && mapped.length) {
      const last = mapped.length - 1;
      const isPDF = image.mediaType === "application/pdf";
      const block = isPDF
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: image.data } }
        : { type: "image", data: image.data, mediaType: image.mediaType };
      mapped[last] = { role: "user", content: [
        block,
        { type: "text", text: mapped[last].content },
      ]};
    }
    const messages = [{ role: "system" as const, content: system }, ...mapped];

    const result = await withProviderProfile(profileId, () => runChatWithFallback(chosen, messages));
    const profileLearning = await runSignalReaderForNotice({
      profileId,
      latestInput: content,
      history: history.map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
    });
    const provider = MODELS.find(x => x.id === result.usedModel)!.provider;
    const cost = estimateCost(result.usedModel, result.inputTokens, result.outputTokens);

    const note = (budgetWarning ?? "") + (result.fellBack ? `⚡ ${chosen} nicht verfügbar → automatisch mit ${result.usedModel} weitergemacht.\n\n` : "");
    await db.message.create({ data: { profileId, projectId, role: "assistant", content: note + result.text, model: result.usedModel } });
    await db.modelRun.create({ data: { profileId, projectId, provider, model: result.usedModel, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: cost } });

    return NextResponse.json({
      text: note + result.text, model: result.usedModel, costUsd: cost,
      tone,
      usedMemory,
      profileMemories: profileLearning.memories,
      warp: result.fellBack ? { fromModel: chosen, toModel: result.usedModel, cause: "rate_limit" } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Unbekannter Fehler" }, { status: 500 });
  }
}

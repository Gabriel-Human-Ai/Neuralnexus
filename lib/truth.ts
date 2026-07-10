import { db } from "@/lib/db";
import { pickMetaModel, pickVerifierModel } from "@/lib/meta-model";
import { runChat } from "@/lib/providers";
import { parseModelJson } from "@/lib/safe-parse";
import { estimateCost } from "@/lib/tokens";
import type { Claim, ClaimStatus } from "@/lib/types";
import { collectiveGuardLines } from "@/lib/index-protocol";

type MemoryLike = { id: string; content: string };
type RawClaim = { text?: string; status?: string; sourceIndex?: number | null; sourceQuote?: string | null };

const EXTRACTION_SYSTEM = `You analyze an AI-generated TEXT against numbered KNOWLEDGE sources.
Extract the text's checkable factual claims as atomic units (minimum 0, maximum 14). For each claim return:
- "text": an EXACT substring copied character-for-character from TEXT, 15–180 chars, ending at a natural boundary
- "status": "grounded" (directly supported by a KNOWLEDGE block), "inferred" (a reasonable conclusion from KNOWLEDGE), or "external" (not derivable from KNOWLEDGE — model knowledge, assumption, or invented specificity)
- "sourceIndex": the supporting KNOWLEDGE block number for grounded/inferred, else null
- "sourceQuote": for grounded only, the supporting quote from that block, ≤140 chars, else null
Rules: opinions, instructions, questions and creative phrasing are NOT claims — skip them. Specific numbers, dates, names, statistics and comparisons ARE claims. Never rewrite the claim text; copy it exactly. Prefer precision over coverage.
Return ONLY valid JSON: {"claims":[{"text":"...","status":"...","sourceIndex":1,"sourceQuote":"..."}]}`;

const VERIFY_SYSTEM = `You are an independent fact examiner. For each CLAIM decide whether it is safe to state, using ONLY the provided KNOWLEDGE plus widely established, uncontroversial general knowledge.
Verdicts: "confirmed" (safe to state) or "disputed" (likely wrong, unverifiable, or suspiciously specific without support).
Be strict: specific numbers, dates, names, statistics or rankings without KNOWLEDGE support are "disputed". You are examining a DIFFERENT model's output; do not be charitable.
Return ONLY valid JSON: {"verdicts":[{"id":"c3","verdict":"confirmed"|"disputed","note":"<max 12 words>"}]}`;

const WARNING_SYSTEM = `A human marked an AI claim as wrong. Write ONE reusable warning rule (imperative, ≤140 chars) that prevents this CLASS of error in future outputs for this domain. Generalize the failure pattern; never repeat the specific names or numbers. Also classify the domain.
Return ONLY valid JSON: {"warning":"...","domainTag":"content"|"brand"|"review"|"coaching"|"audit"|"research"|"general"}`;

export function sourceTitle(content: string) {
  return content.split(/\r?\n/)[0]?.trim().slice(0, 60) || "Knowledge source";
}

export function domainTagFromProject(project: { goal?: string; name?: string }, stepName?: string) {
  const text = `${project.goal ?? ""} ${project.name ?? ""} ${stepName ?? ""}`.toLowerCase();
  for (const tag of ["content", "brand", "review", "coaching", "audit", "research"]) {
    if (text.includes(tag)) return tag;
  }
  return "general";
}

export async function knownFailurePatternBlock(args: { model: string; domainTag: string }) {
  const records = await db.correctionRecord.findMany({ where: { model: args.model, domainTag: args.domainTag, warning: { not: "" } }, select: { warning: true } });
  const counts = new Map<string, number>();
  records.forEach((record) => counts.set(record.warning, (counts.get(record.warning) ?? 0) + 1));
  const warnings = Array.from(counts.entries()).filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([warning]) => warning);
  const collective = await collectiveGuardLines(args.model, args.domainTag);
  if (!warnings.length && !collective.length) return "";
  return `KNOWN FAILURE PATTERNS for this model in this domain — humans corrected these before. Do not repeat them:\n${[
    ...warnings.map((warning) => `- ${warning}`),
    ...collective,
  ].join("\n")}`;
}

export async function extractClaimsForOutput(args: {
  projectId: string;
  text: string;
  knowledge: MemoryLike[];
  trust?: boolean;
}) {
  if (args.trust === false || args.text.length < 200) return { claims: null as Claim[] | null, dropped: 0, unavailable: false };
  const meta = await pickMetaModel();
  if (!meta) return { claims: null as Claim[] | null, dropped: 0, unavailable: true };
  const knowledge = args.knowledge.slice(0, 8);
  const user = `KNOWLEDGE:\n${knowledge.map((item, index) => `[${index + 1}] ${item.content.slice(0, 1200)}`).join("\n")}\n\nTEXT:\n${args.text.slice(0, 8000)}`;
  const result = await runChat(meta.provider, meta.id, [
    { role: "system", content: EXTRACTION_SYSTEM },
    { role: "user", content: user },
  ], { maxTokens: 1400, temperature: 0 });
  await db.modelRun.create({
    data: {
      projectId: args.projectId,
      provider: meta.provider,
      model: meta.id,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: estimateCost(meta.id, result.inputTokens, result.outputTokens),
      purpose: "truth",
    },
  });
  const parsed = parseModelJson<{ claims?: RawClaim[] }>(result.text);
  if (!parsed?.claims) return { claims: null as Claim[] | null, dropped: 0, unavailable: false };
  return postProcessClaims(args.text, parsed.claims, knowledge);
}

export function postProcessClaims(output: string, rawClaims: RawClaim[], knowledge: MemoryLike[]) {
  const accepted: Array<Claim & { start: number; end: number }> = [];
  let dropped = 0;
  for (const raw of rawClaims) {
    const text = String(raw.text ?? "");
    const status = raw.status === "grounded" || raw.status === "inferred" || raw.status === "external" ? raw.status : null;
    if (!status || text.length < 15 || text.length > 180) { dropped++; continue; }
    const start = output.indexOf(text);
    if (start < 0) { dropped++; continue; }
    const end = start + text.length;
    if (accepted.some((claim) => start < claim.end && end > claim.start)) { dropped++; continue; }
    const source = typeof raw.sourceIndex === "number" ? knowledge[raw.sourceIndex - 1] : null;
    const claim: Claim & { start: number; end: number } = { id: "", text, status, start, end };
    if ((status === "grounded" || status === "inferred") && source) {
      claim.sourceMemoryId = source.id;
      claim.sourceTitle = sourceTitle(source.content);
      if (status === "grounded" && raw.sourceQuote) claim.sourceQuote = String(raw.sourceQuote).slice(0, 140);
    }
    accepted.push(claim);
  }
  accepted.sort((a, b) => a.start - b.start);
  const claims = accepted.map((claim, index) => {
    const { start: _start, end: _end, ...rest } = claim;
    return { ...rest, id: `c${index + 1}` };
  });
  return { claims, dropped, unavailable: false };
}

export async function verifyExternalClaims(args: {
  output: { id: string; projectId: string; provider: string; model: string; knowledgeIds: string; claimsJson: string };
  claimIds: string[];
}) {
  const claims = parseClaims(args.output.claimsJson);
  const selected = claims.filter((claim) => args.claimIds.includes(claim.id));
  if (!selected.length || selected.some((claim) => claim.status !== "external")) throw new Error("invalid_claim_ids");
  const verifier = await pickVerifierModel(args.output.provider, args.output.model);
  if (!verifier) throw new Error("no_independent_verifier");
  const knowledge = await loadKnowledge(args.output.knowledgeIds);
  const result = await runChat(verifier.provider, verifier.id, [
    { role: "system", content: VERIFY_SYSTEM },
    { role: "user", content: `KNOWLEDGE:\n${knowledge.map((item, index) => `[${index + 1}] ${item.content.slice(0, 1200)}`).join("\n")}\n\nCLAIMS:\n${selected.map((claim) => `${claim.id}: ${claim.text}`).join("\n")}` },
  ], { maxTokens: 1000, temperature: 0 });
  await db.modelRun.create({
    data: {
      projectId: args.output.projectId,
      provider: verifier.provider,
      model: verifier.id,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: estimateCost(verifier.id, result.inputTokens, result.outputTokens),
      purpose: "verify",
    },
  });
  const parsed = parseModelJson<{ verdicts?: { id?: string; verdict?: string; note?: string }[] }>(result.text);
  for (const verdict of parsed?.verdicts ?? []) {
    const claim = claims.find((item) => item.id === verdict.id);
    if (!claim || claim.status !== "external") continue;
    claim.verifierModel = verifier.id;
    if (verdict.verdict === "disputed") {
      claim.status = "disputed";
      claim.verdictNote = String(verdict.note ?? "Unsupported").split(/\s+/).slice(0, 12).join(" ");
    }
  }
  await db.output.update({ where: { id: args.output.id }, data: { claimsJson: JSON.stringify(claims) } });
  return claims;
}

export async function synthesizeWarning(args: {
  projectId: string;
  outputId: string;
  skillId?: string | null;
  model: string;
  provider: string;
  domainHint: string;
  claimText: string;
  correctionText?: string;
  source: "manual" | "edit-diff";
}) {
  const meta = await pickMetaModel();
  let warning = "Do not state specific factual details unless supported by provided knowledge.";
  let domainTag = "general";
  if (meta) {
    const result = await runChat(meta.provider, meta.id, [
      { role: "system", content: WARNING_SYSTEM },
      { role: "user", content: `DOMAIN HINT: ${args.domainHint}\nCLAIM: ${args.claimText}\nHUMAN CORRECTION: ${args.correctionText || "(marked wrong without replacement)"}` },
    ], { maxTokens: 300, temperature: 0 });
    await db.modelRun.create({
      data: {
        projectId: args.projectId,
        provider: meta.provider,
        model: meta.id,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: estimateCost(meta.id, result.inputTokens, result.outputTokens),
        purpose: "truth",
      },
    });
    const parsed = parseModelJson<{ warning?: string; domainTag?: string }>(result.text);
    warning = sanitizeWarning(parsed?.warning || warning, args.claimText);
    domainTag = sanitizeDomain(parsed?.domainTag || args.domainHint);
  }
  return db.correctionRecord.create({
    data: {
      projectId: args.projectId,
      outputId: args.outputId,
      skillId: args.skillId || undefined,
      model: args.model,
      provider: args.provider,
      domainTag,
      claimText: args.claimText,
      correctionText: args.correctionText || "",
      warning,
      source: args.source,
    },
  });
}

export async function captureEditDiffCorrections(outputId: string) {
  const output = await db.output.findUnique({ where: { id: outputId } });
  if (!output?.claimsJson || !output.finalContent) return;
  const project = await db.project.findUnique({ where: { id: output.projectId } });
  const domainHint = domainTagFromProject(project ?? {}, output.stepName);
  const candidates = parseClaims(output.claimsJson).filter((claim) => (claim.status === "external" || claim.status === "disputed") && !output.finalContent.includes(claim.text)).slice(0, 3);
  for (const claim of candidates) {
    const exists = await db.correctionRecord.findFirst({ where: { outputId, claimText: claim.text } });
    if (exists) continue;
    await synthesizeWarning({
      projectId: output.projectId,
      outputId,
      skillId: output.skillId,
      model: output.model,
      provider: output.provider,
      domainHint,
      claimText: claim.text,
      correctionText: "(removed or rewritten during editing)",
      source: "edit-diff",
    });
  }
}

export async function loadKnowledge(knowledgeIds: string) {
  const ids = knowledgeIds.split(",").filter(Boolean);
  if (!ids.length) return [];
  return db.memory.findMany({ where: { id: { in: ids } }, orderBy: { createdAt: "desc" }, take: 8 });
}

export function parseClaims(claimsJson: string): Claim[] {
  try {
    const parsed = JSON.parse(claimsJson || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sanitizeDomain(value: string) {
  return ["content", "brand", "review", "coaching", "audit", "research", "general"].includes(value) ? value : "general";
}

function sanitizeWarning(value: string, claimText: string) {
  let warning = value.replace(/\s+/g, " ").trim().slice(0, 140);
  const specifics = claimText.match(/\b[A-Z][A-Za-z0-9-]{2,}\b|\b\d+(?:[.,]\d+)?%?\b/g) ?? [];
  for (const item of specifics) warning = warning.replaceAll(item, "specific unsupported detail");
  return warning || "Do not state specific factual details unless supported by provided knowledge.";
}

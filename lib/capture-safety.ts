import crypto from "crypto";

export type CaptureInput = {
  title?: string;
  sourceUrl?: string;
  captureType?: string;
  action?: string;
  text?: string;
  screenshotData?: string;
  summary?: string;
};

export const CAPTURE_ACTIONS = ["save_reference", "review", "compare", "verify", "preflight"] as const;
export const CAPTURE_TYPES = ["selection", "page", "screenshot"] as const;
export const CAPTURE_DECISIONS = ["approve", "reject", "revise", "keep", "mark_wrong"] as const;

const PRIVATE_PATTERNS = [
  /password\s*[:=]/gi,
  /authorization\s*[:=]/gi,
  /bearer\s+[a-z0-9._-]+/gi,
  /sk-[a-z0-9_-]{20,}/gi,
  /\b\d{13,19}\b/g,
];

export function sanitizeCaptureInput(input: CaptureInput) {
  const sourceUrl = scrubUrl(input.sourceUrl ?? "");
  const captureType = oneOf(input.captureType, CAPTURE_TYPES, "selection");
  const action = oneOf(input.action, CAPTURE_ACTIONS, "save_reference");
  const text = scrubText(input.text ?? "").slice(0, 12000);
  const screenshotData = sanitizeScreenshot(input.screenshotData ?? "");
  const title = scrubText(input.title ?? "").slice(0, 180);
  const summary = scrubText(input.summary ?? "").slice(0, 800);
  return {
    title,
    sourceUrl,
    sourceHost: hostFromUrl(sourceUrl),
    captureType,
    action,
    text,
    screenshotData,
    summary: summary || summarizeCapture({ title, sourceHost: hostFromUrl(sourceUrl), captureType, action, text, hasScreenshot: Boolean(screenshotData) }),
  };
}

export function summarizeCapture(input: { title: string; sourceHost: string; captureType: string; action: string; text: string; hasScreenshot: boolean }) {
  const subject = input.title || input.sourceHost || "Captured reference";
  const material = input.text ? input.text.replace(/\s+/g, " ").slice(0, 160) : input.hasScreenshot ? "Visible-page screenshot captured by explicit action." : "No text preview.";
  return `${subject} · ${input.captureType} · ${input.action}. ${material}`;
}

export function indexPreviewForCapture(input: { captureType: string; action: string; decision?: string; sourceHost?: string; text?: string }) {
  return {
    signalType: "browser_capture_decision",
    captureType: input.captureType,
    action: input.action,
    decision: input.decision || "",
    broadSource: input.sourceHost ? generalizeHost(input.sourceHost) : "web",
    textLengthBucket: bucketLength(input.text?.length ?? 0),
    rawContentIncluded: false,
    urlIncluded: false,
    screenshotIncluded: false,
  };
}

export function createExtensionToken() {
  return `nnx_${crypto.randomBytes(24).toString("base64url")}`;
}

export function scrubUrl(raw: string) {
  try {
    const url = new URL(raw);
    url.username = "";
    url.password = "";
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return "";
  }
}

export function hostFromUrl(raw: string) {
  try {
    return new URL(raw).hostname.replace(/^www\./, "").slice(0, 120);
  } catch {
    return "";
  }
}

export function scrubText(raw: string) {
  let text = String(raw ?? "").replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
  for (const pattern of PRIVATE_PATTERNS) text = text.replace(pattern, "[redacted]");
  return text;
}

function sanitizeScreenshot(value: string) {
  if (!value) return "";
  if (!value.startsWith("data:image/")) return "";
  if (value.length > 1_500_000) return "";
  return value;
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return allowed.includes(String(value)) ? String(value) as T[number] : fallback;
}

function generalizeHost(host: string) {
  const parts = host.split(".").filter(Boolean);
  return parts.length >= 2 ? `${parts.at(-2)}.${parts.at(-1)}` : host || "web";
}

function bucketLength(length: number) {
  if (length <= 0) return "none";
  if (length < 500) return "short";
  if (length < 3000) return "medium";
  return "long";
}

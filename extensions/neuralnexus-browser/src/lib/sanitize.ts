const PRIVATE_PATTERNS = [
  /password\s*[:=]/gi,
  /authorization\s*[:=]/gi,
  /bearer\s+[a-z0-9._-]+/gi,
  /sk-[a-z0-9_-]{20,}/gi,
  /\b\d{13,19}\b/g,
];

export function sanitizeText(value: string, maxLength = 12000) {
  let text = String(value || "").replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
  for (const pattern of PRIVATE_PATTERNS) text = text.replace(pattern, "[redacted]");
  return text.slice(0, maxLength);
}

export function sanitizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return "";
  }
}

export function summarizeError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

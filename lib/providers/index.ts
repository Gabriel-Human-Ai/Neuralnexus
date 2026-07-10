import { db } from "@/lib/db";
async function getKey(name: string): Promise<string | undefined> {
  const row = await db.setting.findUnique({ where: { key: name } }).catch(() => null);
  return row?.value || process.env[name];
}

export type ChatBlock = { type: "text"; text: string } | { type: "image"; data: string; mediaType: string };
export type ChatMsg = { role: "user" | "assistant" | "system"; content: string | ChatBlock[] };
export type ChatResult = { text: string; inputTokens: number; outputTokens: number };
export type ChatOptions = { maxTokens?: number; temperature?: number };

export const MODELS = [
  // Direct providers
  { id: "gpt-4o-mini",        provider: "openai",      label: "GPT-4o mini" },
  { id: "gpt-4o",             provider: "openai",      label: "GPT-4o" },
  { id: "claude-haiku-4-5",   provider: "anthropic",   label: "Claude Haiku" },
  { id: "claude-sonnet-4-6",  provider: "anthropic",   label: "Claude Sonnet" },
  { id: "gemini-2.0-pro",     provider: "google",      label: "Gemini 2.0 Pro" },
  { id: "deepseek-chat",      provider: "deepseek",    label: "DeepSeek V3" },
  // OpenRouter — all use the single OPENROUTER_API_KEY
  { id: "x-ai/grok-3",                         provider: "openrouter", label: "Grok 3 (xAI)" },
  { id: "x-ai/grok-3-mini",                    provider: "openrouter", label: "Grok 3 Mini" },
  { id: "meta-llama/llama-4-maverick",          provider: "openrouter", label: "Llama 4 Maverick" },
  { id: "meta-llama/llama-4-scout",             provider: "openrouter", label: "Llama 4 Scout" },
  { id: "meta-llama/llama-3.3-70b-instruct",   provider: "openrouter", label: "Llama 3.3 70B" },
  { id: "mistralai/mistral-large",              provider: "openrouter", label: "Mistral Large" },
  { id: "mistralai/mistral-small",              provider: "openrouter", label: "Mistral Small" },
  { id: "mistralai/codestral-latest",           provider: "openrouter", label: "Codestral (Code)" },
  { id: "qwen/qwen-2.5-72b-instruct",           provider: "openrouter", label: "Qwen 2.5 72B" },
  { id: "qwen/qwen-2.5-coder-32b-instruct",     provider: "openrouter", label: "Qwen Coder 32B" },
  { id: "google/gemini-2.0-flash-001",          provider: "openrouter", label: "Gemini 2.0 Flash" },
  { id: "google/gemini-2.5-pro-preview",        provider: "openrouter", label: "Gemini 2.5 Pro" },
  { id: "perplexity/sonar-pro",                 provider: "openrouter", label: "Perplexity Sonar Pro" },
  { id: "cohere/command-r-plus",                provider: "openrouter", label: "Cohere Command R+" },
  { id: "z-ai/glm-4.6",                         provider: "openrouter", label: "GLM 4.6" },
] as const;

export async function runChat(provider: string, model: string, messages: ChatMsg[], options: ChatOptions = {}): Promise<ChatResult> {
  if (provider === "anthropic") return anthropicChat(model, messages, options);
  if (provider === "google") return googleChat(model, messages, options);
  return openaiCompatChat(provider, model, messages, options);
}

const OPENAI_COMPAT_BASE: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
};
const OPENAI_COMPAT_KEY: Record<string, string> = {
  openrouter: "OPENROUTER_API_KEY", openai: "OPENAI_API_KEY", deepseek: "DEEPSEEK_API_KEY",
};

async function openaiCompatChat(provider: string, model: string, messages: ChatMsg[], options: ChatOptions = {}): Promise<ChatResult> {
  const base = OPENAI_COMPAT_BASE[provider] ?? "https://api.openai.com/v1";
  const key = await getKey(OPENAI_COMPAT_KEY[provider] ?? "OPENAI_API_KEY");
  if (!key) throw new Error(`No ${provider} key is connected. Add a key in Settings.`);
  const mapped = messages.map(m => ({
    role: m.role,
    content: Array.isArray(m.content)
      ? m.content.map(b => b.type === "image"
          ? { type: "image_url", image_url: { url: `data:${b.mediaType};base64,${b.data}` } }
          : { type: "text", text: b.text })
      : m.content,
  }));
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: mapped, max_tokens: options.maxTokens, temperature: options.temperature }),
  });
  if (!res.ok) throw new Error(`${provider} error (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}

async function anthropicChat(model: string, messages: ChatMsg[], options: ChatOptions = {}): Promise<ChatResult> {
  const key = await getKey("ANTHROPIC_API_KEY");
  if (!key) throw new Error("No Anthropic key is connected. Add a key in Settings.");
  const system = messages.filter(m => m.role === "system").map(m => typeof m.content === "string" ? m.content : "").join("\n");
  const rest = messages.filter(m => m.role !== "system").map(m => ({
    role: m.role,
    content: Array.isArray(m.content)
      ? m.content.map(b => b.type === "image"
          ? { type: "image", source: { type: "base64", media_type: b.mediaType, data: b.data } }
          : { type: "text", text: b.text })
      : m.content,
  }));
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: options.maxTokens ?? 4000, temperature: options.temperature, system: system || undefined, messages: rest }),
  });
  if (!res.ok) throw new Error(`Anthropic error (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return {
    text: data.content?.map((c: any) => c.text ?? "").join("") ?? "",
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

async function googleChat(model: string, messages: ChatMsg[], options: ChatOptions = {}): Promise<ChatResult> {
  const key = await getKey("GOOGLE_API_KEY");
  if (!key) throw new Error("No Google key is connected. Add a key in Settings.");
  const system = messages.filter(m => m.role === "system").map(m => typeof m.content === "string" ? m.content : "").join("\n");
  const contents = messages.filter(m => m.role !== "system").map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: Array.isArray(m.content)
      ? m.content.map(b => b.type === "image"
          ? { inlineData: { mimeType: b.mediaType, data: b.data } }
          : { text: b.text })
      : [{ text: m.content }],
  }));
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: options.maxTokens, temperature: options.temperature }, systemInstruction: system ? { parts: [{ text: system }] } : undefined }),
  });
  if (!res.ok) throw new Error(`Google error (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "",
    inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// --- Auto-Routing & Fallback ---
export function pickModelForTask(text: string): string {
  const t = text.toLowerCase();
  if (/(code|bug|fehler|implement|funktion|script|api|refactor|```)/.test(t)) return "claude-sonnet-4-6";
  if (/(zusammenfass|summar|kurz|tl;dr)/.test(t)) return "gpt-4o-mini";
  if (/(plan|strategie|architektur|entscheid|review)/.test(t)) return "claude-sonnet-4-6";
  if (/(übersetz|translate)/.test(t)) return "gemini-2.0-pro";
  return "gpt-4o-mini";
}

// Fallback order per role: strong coding → strong alt → cheap
export const FALLBACK_CHAIN: Record<string, string[]> = {
  "claude-sonnet-4-6": ["gpt-4o", "deepseek-chat", "z-ai/glm-4.6", "gpt-4o-mini"],
  "claude-haiku-4-5": ["gpt-4o-mini", "z-ai/glm-4.6", "deepseek-chat"],
  "gpt-4o": ["claude-sonnet-4-6", "gemini-2.0-pro", "z-ai/glm-4.6"],
  "gpt-4o-mini": ["claude-haiku-4-5", "deepseek-chat", "z-ai/glm-4.6"],
  "z-ai/glm-4.6": ["gpt-4o-mini", "claude-haiku-4-5"],
  "gemini-2.0-pro": ["claude-sonnet-4-6", "gpt-4o"],
  "deepseek-chat": ["gpt-4o-mini", "claude-haiku-4-5"],
};

async function keyAvailable(provider: string): Promise<boolean> {
  const map: Record<string, string> = { openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", openrouter: "OPENROUTER_API_KEY", google: "GOOGLE_API_KEY", deepseek: "DEEPSEEK_API_KEY" };
  const k = await getKey(map[provider]);
  return !!k;
}

export async function runChatWithFallback(model: string, messages: ChatMsg[]) {
  const raw = [model, ...(FALLBACK_CHAIN[model] ?? [])];
  const chain: string[] = [];
  for (const m of raw) {
    const prov = MODELS.find(x => x.id === m)?.provider;
    if (prov && await keyAvailable(prov)) chain.push(m);
  }
  if (chain.length === 0) throw new Error("No model key is connected. Add a key in Settings.");
  let lastErr: any;
  for (const m of chain) {
    const prov = MODELS.find(x => x.id === m)?.provider;
    if (!prov) continue;
    try {
      const r = await runChat(prov, m, messages);
      return { ...r, usedModel: m, fellBack: m !== model };
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("No model is available. Check your API keys in Settings.");
}

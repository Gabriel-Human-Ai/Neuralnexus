import { getAllSettings } from "@/lib/db-helpers";

export type MetaModel = { id: string; provider: string } | null;

export async function pickMetaModel(): Promise<MetaModel> {
  const s = await getAllSettings();
  if (s.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY) return { id: "claude-haiku-4-5", provider: "anthropic" };
  if (s.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY) return { id: "openai/gpt-4o-mini", provider: "openrouter" };
  if (s.OPENAI_API_KEY || process.env.OPENAI_API_KEY) return { id: "gpt-4o-mini", provider: "openai" };
  if (s.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY) return { id: "deepseek-chat", provider: "deepseek" };
  if (s.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY) return { id: "gemini-2.0-flash-001", provider: "google" };
  return null;
}

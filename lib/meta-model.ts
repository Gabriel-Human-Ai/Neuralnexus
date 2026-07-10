import { getAllSettings } from "@/lib/db-helpers";

export type MetaModel = { id: string; provider: string } | null;

const META_LADDER = [
  { id: "claude-haiku-4-5", provider: "anthropic", key: "ANTHROPIC_API_KEY" },
  { id: "openai/gpt-4o-mini", provider: "openrouter", key: "OPENROUTER_API_KEY" },
  { id: "gpt-4o-mini", provider: "openai", key: "OPENAI_API_KEY" },
  { id: "deepseek-chat", provider: "deepseek", key: "DEEPSEEK_API_KEY" },
  { id: "gemini-2.0-flash-001", provider: "google", key: "GOOGLE_API_KEY" },
] as const;

async function availableMetaModels() {
  const s = await getAllSettings();
  return META_LADDER.filter((item) => s[item.key] || process.env[item.key]).map(({ id, provider }) => ({ id, provider }));
}

export async function pickMetaModel(): Promise<MetaModel> {
  const models = await availableMetaModels();
  return models[0] ?? null;
}

export async function pickVerifierModel(excludeProvider: string, excludeModel = ""): Promise<MetaModel> {
  const models = await availableMetaModels();
  const independent = models.find((item) => item.provider !== excludeProvider);
  if (independent) return independent;
  return models.find((item) => item.id !== excludeModel) ?? null;
}

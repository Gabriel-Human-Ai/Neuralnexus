export const CHALLENGERS: Record<string, { model: string; provider: string }[]> = {
  "claude-sonnet-4-6":  [{ model: "claude-haiku-4-5", provider: "anthropic" }, { model: "deepseek-chat", provider: "deepseek" }],
  "gpt-4o":             [{ model: "gpt-4o-mini", provider: "openai" }, { model: "deepseek-chat", provider: "deepseek" }],
  "gemini-2.0-pro":     [{ model: "google/gemini-2.0-flash-001", provider: "openrouter" }],
  "x-ai/grok-3":        [{ model: "x-ai/grok-3-mini", provider: "openrouter" }],
  "mistralai/mistral-large": [{ model: "mistralai/mistral-small", provider: "openrouter" }],
  "meta-llama/llama-4-maverick": [{ model: "meta-llama/llama-3.3-70b-instruct", provider: "openrouter" }],
};

export function providerKeyName(provider: string) {
  return ({ anthropic: "ANTHROPIC_API_KEY", openrouter: "OPENROUTER_API_KEY", openai: "OPENAI_API_KEY", deepseek: "DEEPSEEK_API_KEY", google: "GOOGLE_API_KEY" } as Record<string, string>)[provider] ?? "OPENAI_API_KEY";
}

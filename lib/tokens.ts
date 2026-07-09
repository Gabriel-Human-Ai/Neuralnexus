// Simple estimation: ~4 chars per token. Good enough for cost preview.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Prices per 1M tokens (USD). Update in this one file when providers change prices.
export const PRICING: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini":                          { in: 0.15,  out: 0.6 },
  "gpt-4o":                               { in: 2.5,   out: 10 },
  "claude-sonnet-4-6":                    { in: 3,     out: 15 },
  "claude-haiku-4-5":                     { in: 1,     out: 5 },
  "z-ai/glm-4.6":                         { in: 0.6,   out: 2.2 },
  "gemini-2.0-pro":                       { in: 1.25,  out: 5 },
  "deepseek-chat":                        { in: 0.27,  out: 1.1 },
  "x-ai/grok-3":                          { in: 3,     out: 15 },
  "x-ai/grok-3-mini":                     { in: 0.3,   out: 0.5 },
  "meta-llama/llama-4-maverick":          { in: 0.18,  out: 0.59 },
  "meta-llama/llama-4-scout":             { in: 0.08,  out: 0.3 },
  "meta-llama/llama-3.3-70b-instruct":    { in: 0.12,  out: 0.4 },
  "mistralai/mistral-large":              { in: 2,     out: 6 },
  "mistralai/mistral-small":              { in: 0.1,   out: 0.3 },
  "mistralai/codestral-latest":           { in: 0.3,   out: 0.9 },
  "qwen/qwen-2.5-72b-instruct":           { in: 0.35,  out: 0.4 },
  "qwen/qwen-2.5-coder-32b-instruct":     { in: 0.07,  out: 0.16 },
  "google/gemini-2.0-flash-001":          { in: 0.1,   out: 0.4 },
  "google/gemini-2.5-pro-preview":        { in: 1.25,  out: 10 },
  "perplexity/sonar-pro":                 { in: 3,     out: 15 },
  "cohere/command-r-plus":                { in: 2.5,   out: 10 },
};

export function estimateCost(model: string, inTok: number, outTok: number) {
  const p = PRICING[model] ?? { in: 1, out: 3 };
  return (inTok * p.in + outTok * p.out) / 1_000_000;
}

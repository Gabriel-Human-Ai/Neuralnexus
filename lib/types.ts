// Exact contracts — do not rename, do not add required fields.
export type TaskType = "logic" | "drafting" | "validation" | "extraction" | "chat";

export interface SubTask {
  id: string;
  type: TaskType;
  prompt: string;
  dependsOn: string[];
  assignedModel: string;
  status: "pending" | "running" | "done" | "failed";
  result?: string;
}

export interface RoutingDecision {
  model: string;
  provider: "openai" | "anthropic" | "openrouter" | "local";
  reason: "cost" | "quality" | "failover" | "user-pinned";
  estimatedCostUsd: number;
  fallbackChain: string[];
}

export interface StreamState {
  status: "idle" | "streaming" | "warping" | "done" | "error";
  activeModel: string;
  failoverCount: number;
  tokensIn: number;
  tokensOut: number;
  startedAt: number;
}

export interface WarpEvent {
  fromModel: string;
  toModel: string;
  cause: "rate_limit" | "server_error" | "timeout";
  atTokenIndex: number;
}

export interface MemoryChunk {
  id: string;
  content: string;
  embedding?: number[];
  source: "chat" | "document" | "manual";
  scopeId: string;
  createdAt: number;
  relevanceScore?: number;
}

export interface ProvenanceSpan {
  start: number;
  end: number;
  memoryChunkId: string;
}

export interface PIIMask {
  token: string;
  original: string;
  kind: "name" | "email" | "phone" | "iban" | "address" | "custom";
}

export interface ShieldedPayload {
  maskedText: string;
  maskCount: number;
}

export interface ModelProfile {
  id: string;
  provider: string;
  inputPer1M: number;
  outputPer1M: number;
  qualityTier: 1 | 2 | 3;
  healthy: boolean;
  avgLatencyMs: number;
}
export type QualityCheck = { check: string; passed: boolean; fixed: boolean; reason?: string };
export type QualityReport = { checks: QualityCheck[]; revisions: number };

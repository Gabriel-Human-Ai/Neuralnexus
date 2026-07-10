"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, RefreshCcw, X } from "lucide-react";
import { MOTION } from "@/lib/motion";
import type { Claim, QualityReport } from "@/lib/types";

type Event =
  | { type: "generating" }
  | { type: "draft"; content: string }
  | { type: "judging"; round: number }
  | { type: "verdict"; round: number; checks: { check: string; passed: boolean; reason: string }[] }
  | { type: "revising"; round: number; failed: string[] }
  | { type: "final"; outputId: string; content: string; qualityReport: QualityReport | null; model: string; provider: string; costUsd: number; claims?: Claim[] | null; trustUnavailable?: boolean }
  | { type: "verifying"; count: number }
  | { type: "verify_skipped"; reason: string }
  | { type: "claims"; claims: Claim[] | null; droppedClaims?: number; unavailable?: boolean }
  | { type: "error"; message: string };

type Chip = { check: string; state: "neutral" | "judging" | "passed" | "failed" | "fixed"; reason?: string };

export function Crucible({ projectId, stepName, stepDescription, userInput, skillId, checklist, strictFacts, onFinal, onCancel }: {
  projectId: string;
  stepName: string;
  stepDescription: string;
  userInput: string;
  skillId?: string;
  checklist: string[];
  strictFacts?: boolean;
  onFinal: (data: Extract<Event, { type: "final" }>) => void;
  onCancel: () => void;
}) {
  const reduce = useReducedMotion();
  const [content, setContent] = useState("");
  const [phase, setPhase] = useState<Event["type"]>("generating");
  const [error, setError] = useState("");
  const [chips, setChips] = useState<Chip[]>(checklist.map((check) => ({ check, state: "neutral" })));
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    abortRef.current = abort;
    let cancelled = false;
    async function run() {
      const response = await fetch("/api/outputs/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        signal: abort.signal,
        body: JSON.stringify({ projectId, stepName, stepDescription, userInput, skillId, checklist, strictFacts }),
      });
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream.");
      const decoder = new TextDecoder();
      let buffer = "";
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as Event;
          if (cancelled) return;
          setPhase(event.type);
          if (event.type === "generating") window.dispatchEvent(new CustomEvent("nexus:orb", { detail: { state: "thinking" } }));
          if (event.type === "draft") { setContent(event.content); window.dispatchEvent(new CustomEvent("nexus:orb", { detail: { state: "responding" } })); }
          if (event.type === "judging") setChips((items) => items.map((item) => ({ ...item, state: "judging" })));
          if (event.type === "verifying") setPhase("verifying");
          if (event.type === "verdict") {
            setChips((items) => event.checks.map((check) => {
              const previous = items.find((item) => item.check === check.check);
              return { check: check.check, state: check.passed ? previous?.state === "failed" ? "fixed" : "passed" : "failed", reason: check.reason };
            }));
          }
          if (event.type === "revising") setChips((items) => items.map((item) => event.failed.includes(item.check) ? { ...item, state: "failed" } : item));
          if (event.type === "final") { window.dispatchEvent(new CustomEvent("nexus:orb", { detail: { state: "success" } })); onFinal(event); }
          if (event.type === "error") { setError(event.message); window.dispatchEvent(new CustomEvent("nexus:orb", { detail: { state: "idle" } })); }
        }
      }
    }
    void run().catch((err) => {
      if (!abort.signal.aborted) setError(err.message ?? "Run failed.");
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        abort.abort();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      abort.abort();
      window.removeEventListener("keydown", onKey);
    };
  }, [checklist, onCancel, onFinal, projectId, skillId, stepDescription, stepName, strictFacts, userInput]);

  return (
    <section className="crucible liquid-card" aria-label="Live quality gate run">
      <div className="crucible-text">
        <span className="object-label">THE CRUCIBLE</span>
        {phase === "generating" && <div className="crucible-skeleton" aria-hidden="true" />}
        {content && <motion.p initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}>{content}</motion.p>}
        {phase === "verifying" && <p className="muted-helper">Cross-examining claims</p>}
        {phase === "judging" && !reduce && <motion.span className="assay-line" aria-hidden="true" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: Math.min(0.9, 0.22 * Math.max(1, chips.length)) }} />}
        {error && <p className="crucible-error">{error}</p>}
      </div>
      {chips.length > 0 && (
        <ul className="crucible-chips" aria-live="polite">
          {chips.map((chip) => (
            <motion.li key={chip.check} className={`is-${chip.state}`} animate={!reduce && chip.state === "failed" ? { x: [0, -3, 3, 0] } : { x: 0 }} transition={{ duration: MOTION.fast }}>
              <span>{chip.state === "passed" || chip.state === "fixed" ? <Check size={14} /> : chip.state === "failed" ? <X size={14} /> : chip.state === "judging" ? <RefreshCcw size={14} /> : null}</span>
              <div><strong>{chip.check}</strong>{chip.reason && <small>{chip.state === "fixed" ? "fixed" : chip.reason}</small>}</div>
            </motion.li>
          ))}
        </ul>
      )}
      {error && <button className="secondary-pill" onClick={onCancel}>Retry</button>}
    </section>
  );
}

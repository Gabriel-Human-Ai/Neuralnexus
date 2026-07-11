"use client";

import { useState } from "react";
import { AlignJustify, AlignLeft, BriefcaseBusiness, Check, Copy, GitFork, RefreshCcw, Smile, ThumbsDown, ThumbsUp } from "lucide-react";

export type ChatFeedbackSignal = "good" | "bad" | "shorter" | "longer" | "formal" | "casual";

type MessageActionsProps = {
  text: string;
  onRegenerate?: () => void;
  onFork?: () => void;
  onFeedback?: (signal: ChatFeedbackSignal) => void | Promise<void>;
  selectedSignals?: ChatFeedbackSignal[];
  forkEnabled?: boolean;
  disabled?: boolean;
};

type ActionState = "copy" | "regenerate" | "fork" | ChatFeedbackSignal | null;

const FEEDBACK_ACTIONS: { signal: ChatFeedbackSignal; label: string; icon: typeof ThumbsUp }[] = [
  { signal: "good", label: "Good", icon: ThumbsUp },
  { signal: "bad", label: "Not for me", icon: ThumbsDown },
  { signal: "shorter", label: "Shorter", icon: AlignLeft },
  { signal: "longer", label: "Longer", icon: AlignJustify },
  { signal: "formal", label: "More formal", icon: BriefcaseBusiness },
  { signal: "casual", label: "More casual", icon: Smile },
];

export function MessageActions({ text, onRegenerate, onFork, onFeedback, selectedSignals = [], forkEnabled = false, disabled = false }: MessageActionsProps) {
  const [active, setActive] = useState<ActionState>(null);
  const [copied, setCopied] = useState(false);

  function flash(action: ActionState) {
    setActive(action);
    window.setTimeout(() => setActive(null), 600);
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    flash("copy");
    window.setTimeout(() => setCopied(false), 900);
  }

  async function feedback(signal: ChatFeedbackSignal) {
    flash(signal);
    await onFeedback?.(signal);
  }

  return (
    <div className="message-actions" aria-label="Message actions">
      <button type="button" className={active === "copy" ? "is-active is-copying" : ""} onClick={() => void copy()} aria-label="Copy" data-tip="Copy">
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
      <button
        type="button"
        className={active === "regenerate" ? "is-active is-regenerating" : ""}
        onClick={() => {
          flash("regenerate");
          onRegenerate?.();
        }}
        disabled={disabled || !onRegenerate}
        aria-label="Regenerate"
        data-tip="Regenerate"
      >
        <RefreshCcw size={15} />
      </button>
      {forkEnabled && (
        <button
          type="button"
          className={active === "fork" ? "is-active" : ""}
          onClick={() => {
            flash("fork");
            onFork?.();
          }}
          aria-label="Fork"
          data-tip="Fork"
        >
          <GitFork size={15} />
        </button>
      )}
      {onFeedback && (
        <div className="message-feedback-actions" aria-label="Teach profile from this answer">
          {FEEDBACK_ACTIONS.map(({ signal, label, icon: Icon }) => {
            const isSelected = selectedSignals.includes(signal);
            return (
              <button
                key={signal}
                type="button"
                className={`feedback-action ${active === signal || isSelected ? "is-active" : ""}`}
                onClick={() => void feedback(signal)}
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={label}
                data-tip={label}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

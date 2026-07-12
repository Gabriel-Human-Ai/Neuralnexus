"use client";

import { useState } from "react";
import { Check, Copy, GitFork, Pencil, RefreshCcw } from "lucide-react";

type MessageActionsProps = {
  text: string;
  onRegenerate?: () => void;
  onFork?: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
  forkEnabled?: boolean;
  disabled?: boolean;
};

type ActionState = "copy" | "regenerate" | "edit" | "fork" | null;

export function MessageActions({ text, onRegenerate, onFork, onCopy, onEdit, forkEnabled = false, disabled = false }: MessageActionsProps) {
  const [active, setActive] = useState<ActionState>(null);
  const [copied, setCopied] = useState(false);

  function flash(action: ActionState) {
    setActive(action);
    window.setTimeout(() => setActive(null), 600);
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    onCopy?.();
    setCopied(true);
    flash("copy");
    window.setTimeout(() => setCopied(false), 900);
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
      <button
        type="button"
        className={active === "edit" ? "is-active" : ""}
        onClick={() => {
          flash("edit");
          onEdit?.();
        }}
        disabled={disabled || !onEdit}
        aria-label="Edit"
        data-tip="Edit"
      >
        <Pencil size={15} />
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
    </div>
  );
}

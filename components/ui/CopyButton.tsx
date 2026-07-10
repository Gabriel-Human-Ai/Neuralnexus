"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`copy-morph ${className}`}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 800);
      }}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

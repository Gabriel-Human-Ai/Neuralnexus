"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";

export function AckField({ value, error, maskOnSave = false, children }: {
  value: string;
  error?: string;
  maskOnSave?: boolean;
  children: (props: { className: string; displayValue?: string }) => ReactNode;
}) {
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current !== value) {
      previous.current = value;
      setDirty(false);
      setSaved(true);
      const timeout = window.setTimeout(() => setSaved(false), 900);
      return () => window.clearTimeout(timeout);
    }
  }, [value]);

  const masked = maskOnSave && value.length > 4 && saved ? `•••• ${value.slice(-4)}` : undefined;
  const className = `ack-field ${saved ? "is-saved" : ""} ${dirty ? "is-dirty" : ""} ${error ? "is-error" : ""}`;

  return (
    <div className="ack-field-wrap" onInput={() => setDirty(true)}>
      {children({ className, displayValue: masked })}
      {saved && <span className="ack-check" aria-hidden="true"><Check size={14} /></span>}
      {error && <small className="ack-error">{error}</small>}
    </div>
  );
}

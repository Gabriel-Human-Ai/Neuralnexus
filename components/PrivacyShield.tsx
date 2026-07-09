"use client";
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PIIMask, ShieldedPayload } from "@/lib/types";

const PATTERNS: { kind: PIIMask["kind"]; re: RegExp }[] = [
  { kind: "email", re: /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi },
  { kind: "iban", re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { kind: "phone", re: /\b(\+?\d[\d\s()-]{7,}\d)\b/g },
];

export function usePIIMask(text: string): { shielded: ShieldedPayload; masks: PIIMask[] } {
  return useMemo(() => {
    let masked = text;
    const masks: PIIMask[] = [];
    let i = 0;
    for (const { kind, re } of PATTERNS) {
      masked = masked.replace(re, (m) => {
        const token = `⟨PII_${(i++).toString(16).padStart(4, "0")}⟩`;
        masks.push({ token, original: m, kind });
        return token;
      });
    }
    return { shielded: { maskedText: masked, maskCount: masks.length }, masks };
  }, [text]);
}

export interface PrivacyShieldProps {
  text: string;
  revealed?: boolean; // false while composing/masked in transit, true once safely rendered back
}

export function PrivacyShield({ text, revealed = true }: PrivacyShieldProps) {
  const { masks } = usePIIMask(text);
  const [chars, setChars] = useState<string[]>([]);

  useEffect(() => {
    setChars(text.split(""));
  }, [text]);

  if (masks.length === 0) return <>{text}</>;

  return (
    <span>
      {chars.map((c, i) => {
        const isPII = masks.some((m) => text.indexOf(m.original) <= i && i < text.indexOf(m.original) + m.original.length);
        return (
          <motion.span
            key={i}
            className={isPII ? "accent-text" : undefined}
            initial={false}
            animate={{ filter: revealed ? "blur(0px)" : "blur(2px)" }}
            transition={{ duration: 0.24, delay: isPII ? i * 0.005 : 0 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={revealed ? "clear" : "cipher"}
                initial={{ filter: "blur(2px)" }}
                animate={{ filter: "blur(0px)" }}
                transition={{ duration: 0.2 }}
              >
                {isPII && !revealed ? "▓" : c}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        );
      })}
    </span>
  );
}

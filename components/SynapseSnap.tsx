"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain } from "lucide-react";
import type { ProvenanceSpan } from "@/lib/types";

export interface SynapseSnapProps {
  text: string;
  spans: ProvenanceSpan[];
  memoryIconRef?: React.RefObject<HTMLElement>;
}

export function SynapseSnap({ text, spans, memoryIconRef }: SynapseSnapProps) {
  const [activeSpan, setActiveSpan] = useState<ProvenanceSpan | null>(null);
  const [pulse, setPulse] = useState(false);
  const lastFire = useRef(0);

  useEffect(() => {
    if (spans.length === 0) return;
    const now = Date.now();
    if (now - lastFire.current < 800) return;
    lastFire.current = now;
    const span = spans[spans.length - 1];
    setActiveSpan(span);
    const glowOff = setTimeout(() => setActiveSpan(null), 500);
    const rippleDone = setTimeout(() => setPulse(true), 400);
    const pulseOff = setTimeout(() => setPulse(false), 700);
    return () => { clearTimeout(glowOff); clearTimeout(rippleDone); clearTimeout(pulseOff); };
  }, [spans]);

  return (
    <span className="relative inline">
      {activeSpan ? (
        <>
          {text.slice(0, activeSpan.start)}
          <motion.span
            initial={{ textShadow: "0 0 0px rgba(196,181,253,0)" }}
            animate={{ textShadow: ["0 0 0px rgba(196,181,253,0)", "0 0 12px rgba(196,181,253,0.9)", "0 0 0px rgba(196,181,253,0)"] }}
            transition={{ duration: 0.2 }}
          >
            {text.slice(activeSpan.start, activeSpan.end)}
          </motion.span>
          {text.slice(activeSpan.end)}

          <AnimatePresence>
            <motion.span
              className="absolute -top-1 left-1/2 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "rgb(var(--accent))" }}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -28, scale: 0.4 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </AnimatePresence>
        </>
      ) : text}

      {memoryIconRef && (
        <motion.span
          className="inline-flex align-middle ml-1"
          animate={pulse ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        >
          <Brain size={12} className="text-violet-300" />
        </motion.span>
      )}
    </span>
  );
}

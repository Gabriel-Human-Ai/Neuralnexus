"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThinkingOrb } from "./ThinkingOrb";
import type { WarpEvent } from "@/lib/types";

export interface FailoverWarpProps {
  event: WarpEvent | null;
  children: React.ReactNode; // the still-streaming text, must never visually stop
}

export function FailoverWarp({ event, children }: FailoverWarpProps) {
  const [frozen, setFrozen] = useState(false);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (!event) return;
    setFrozen(true);
    setShowBadge(true);
    const unfreeze = setTimeout(() => setFrozen(false), 150);
    const hideBadge = setTimeout(() => setShowBadge(false), 2000);
    return () => { clearTimeout(unfreeze); clearTimeout(hideBadge); };
  }, [event]);

  return (
    <div className="relative">
      <motion.div
        animate={frozen ? { filter: "brightness(0.7)" } : { filter: "brightness(1)" }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {event && (
          <motion.div
            key={event.toModel}
            className="absolute -top-2 -left-2"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 0, 1] }}
            transition={{ times: [0, 0.44, 1], duration: 0.4, type: "spring", stiffness: 350, damping: 30 }}
          >
            <ThinkingOrb isLoading fallbackModel={event.toModel} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBadge && event && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute -top-8 left-0 text-[11px] px-2.5 py-1 rounded bg-black/70 accent-text whitespace-nowrap"
          >
            Modell gewechselt: {event.fromModel} → {event.toModel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

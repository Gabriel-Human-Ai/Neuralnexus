"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { ModelProfile } from "@/lib/types";

export interface CostLedgerProps {
  profiles: ModelProfile[];
  savedUsd: number; // cumulative savings vs. always-frontier baseline
}

const PROVIDER_LOGO: Record<string, string> = {
  anthropic: "/logos/anthropic.svg", openai: "/logos/openai.svg", google: "/logos/gemini.svg",
  deepseek: "/logos/deepseek.svg", openrouter: "/logos/openrouter.svg",
};

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => v.toFixed(4));
  const [display, setDisplay] = useState("0.0000");

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value]);

  return <span>{display}</span>;
}

// Segmented VU meter: fills left-to-right, greener at low tiers (cheap), redder at high tiers (costly).
function VuBar({ tier }: { tier: number }) {
  const filled = tier * 2; // tier 1→2 segs, 2→4, 3→6
  const segs = Array.from({ length: 6 });
  return (
    <div className="vu-bar w-16">
      {segs.map((_, i) => {
        const on = i < filled;
        const cls = !on ? "" : i < 2 ? "on-green" : i < 4 ? "on-amber" : "on-red";
        return <div key={i} className={`vu-seg ${cls}`} />;
      })}
    </div>
  );
}

export function CostLedger({ profiles, savedUsd }: CostLedgerProps) {
  return (
    <div className="glass-dark card p-5 space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-mist font-mono">Diesen Monat gespart</div>
        <div className="text-3xl font-display text-snow mt-1">$<AnimatedNumber value={savedUsd} /></div>
      </div>
      <div className="space-y-1.5">
        {profiles.map((p) => (
          <motion.div key={p.id} layout className="flex items-center justify-between gap-3 text-xs px-3 py-2.5 glass card">
            <div className="flex items-center gap-2 min-w-0">
              {PROVIDER_LOGO[p.provider] && (
                <span className="provider-chip"><img src={PROVIDER_LOGO[p.provider]} alt="" /></span>
              )}
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.healthy ? "bg-signalGreen" : "bg-signalRed"}`} />
              <span className="text-snow truncate">{p.id}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-mist font-mono text-[10px]">{p.avgLatencyMs}ms</span>
              <VuBar tier={p.qualityTier} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}


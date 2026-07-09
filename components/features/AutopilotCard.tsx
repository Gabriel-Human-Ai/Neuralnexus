"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShadowRace } from "@/components/immersive/ShadowRace";

export function AutopilotCard({ recommendation, projectId, onApplied }: { recommendation: any; projectId: string; onApplied: () => void }) {
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  return (
    <motion.div className="autopilot-card liquid-card" layoutId={`policy-${projectId}-${recommendation.stepName}`}>
      <span className="object-label">AUTOPILOT</span>
      <h3>"{recommendation.stepName}" can run on {recommendation.toModel}</h3>
      <p>Matched {recommendation.fromModel} quality {recommendation.avgScore}/10 across {recommendation.runs} shadow runs on your real tasks</p>
      <ShadowRace recommendation={recommendation} applied={applied} />
      <strong>Projected: save ${recommendation.projectedMonthlySavingUsd.toFixed(4)}/month</strong>
      <button className="secondary-pill" onClick={async () => {
        setError("");
        const response = await fetch("/api/autopilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, stepName: recommendation.stepName, model: recommendation.toModel, provider: "" }) });
        if (!response.ok) { setError("Switch failed."); return; }
        setApplied(true);
        window.setTimeout(onApplied, 650);
      }}>Switch this step</button>
      {error && <small className="crucible-error">{error}</small>}
    </motion.div>
  );
}

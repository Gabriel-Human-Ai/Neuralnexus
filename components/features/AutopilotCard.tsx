"use client";

export function AutopilotCard({ recommendation, projectId, onApplied }: { recommendation: any; projectId: string; onApplied: () => void }) {
  return (
    <div className="autopilot-card liquid-card">
      <span className="object-label">AUTOPILOT</span>
      <h3>"{recommendation.stepName}" can run on {recommendation.toModel}</h3>
      <p>Matched {recommendation.fromModel} quality {recommendation.avgScore}/10 across {recommendation.runs} shadow runs on your real tasks</p>
      <strong>Projected: save ${recommendation.projectedMonthlySavingUsd.toFixed(4)}/month</strong>
      <button className="secondary-pill" onClick={async () => {
        await fetch("/api/autopilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, stepName: recommendation.stepName, model: recommendation.toModel, provider: "" }) });
        onApplied();
      }}>Switch this step</button>
    </div>
  );
}

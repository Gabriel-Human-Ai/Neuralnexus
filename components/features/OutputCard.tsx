"use client";

import { useState } from "react";
import { GitFork, RefreshCcw, WandSparkles } from "lucide-react";
import { PremiumSlideAction } from "@/components/PremiumSlideAction";
import { QualityGateReport } from "@/components/features/QualityGateReport";
import { CopyButton } from "@/components/ui/CopyButton";
import { POSITIONING_UI } from "@/lib/positioning";
import type { QualityReport } from "@/lib/types";

export type OutputCardOutput = {
  id: string;
  stepName: string;
  model: string;
  provider?: string;
  costUsd: number;
  content: string;
  skillVersion: number;
  knowledgeIds?: string;
  qualityReport: QualityReport | null;
};

export function OutputCard({ output, onRefine, onRegenerate, onFinalize, onFork }: {
  output: OutputCardOutput;
  onRefine: (text: string, instruction: string) => void;
  onRegenerate: () => void;
  onFinalize: (text: string) => void;
  onFork: (change: { type: "model" | "skill"; value: string }) => void;
}) {
  const [content, setContent] = useState(output.content);
  const [instruction, setInstruction] = useState("");
  const knowledgeCount = output.knowledgeIds ? output.knowledgeIds.split(",").filter(Boolean).length : 0;
  return (
    <section className="output-card liquid-card">
      <div className="output-head">
        <span className="object-label">OUTPUT</span>
        <div>
          <strong>{output.stepName}</strong>
          <small>{output.model} · ${output.costUsd.toFixed(4)}</small>
        </div>
      </div>
      <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={10} />
      <QualityGateReport report={output.qualityReport} />
      <div className="output-actions">
        <CopyButton text={content} label="Copy" />
        <button onClick={onRegenerate}><RefreshCcw size={14} /> Regenerate</button>
        <button onClick={() => onFork({ type: "model", value: "gpt-4o-mini" })} aria-label={POSITIONING_UI.microcopy.fork} title={POSITIONING_UI.microcopy.fork}><GitFork size={14} /> Fork model</button>
      </div>
      <div className="refine-row">
        <input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Refine instruction" />
        <button onClick={() => instruction.trim() && onRefine(content, instruction)}><WandSparkles size={14} /> Refine</button>
      </div>
      <PremiumSlideAction label="Slide to save as final" completionText="Saved as final" onComplete={() => onFinalize(content)} />
      <p className="output-provenance">{output.model} · Skill v{output.skillVersion} · {knowledgeCount} knowledge sources · ${output.costUsd.toFixed(4)}</p>
    </section>
  );
}

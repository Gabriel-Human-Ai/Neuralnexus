"use client";

import { useState } from "react";
import { Check, Copy, GitFork, RefreshCcw, WandSparkles } from "lucide-react";
import { PremiumSlideAction } from "@/components/PremiumSlideAction";
import { QualityGateReport } from "@/components/features/QualityGateReport";
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
  const [saved, setSaved] = useState(false);
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
        <button onClick={() => navigator.clipboard.writeText(content).then(() => { setSaved(true); setTimeout(() => setSaved(false), 900); })}>{saved ? <Check size={14} /> : <Copy size={14} />} Copy</button>
        <button onClick={onRegenerate}><RefreshCcw size={14} /> Regenerate</button>
        <button onClick={() => onFork({ type: "model", value: "gpt-4o-mini" })} aria-label="Fork this output, change one variable, compare." title="Fork this output, change one variable, compare."><GitFork size={14} /> Fork model</button>
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

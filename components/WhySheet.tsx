"use client";

import { X } from "lucide-react";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { POSITIONING } from "@/lib/positioning";

export function WhySheet({ open, hasWorkspaces, onClose, onCreate }: {
  open: boolean;
  hasWorkspaces: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  if (!open) return null;
  const flags: Record<string, boolean> = {
    method: true,
    genome: FEATURE_FLAGS.genome,
    gates: FEATURE_FLAGS.gates,
    models: FEATURE_FLAGS.autopilot,
    provenance: FEATURE_FLAGS.forkDiff,
  };

  return (
    <div className="why-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Why NeuralNexus" onClick={onClose}>
      <aside className="why-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="floating-wizard-head">
          <span>WHY NEURALNEXUS</span>
          <button onClick={onClose} aria-label="Close Why NeuralNexus"><X size={15} /></button>
        </div>
        <header className="why-sheet-hero">
          <h2>{POSITIONING.oneLiner}</h2>
          <p className="why-rent">{POSITIONING.frame.rent}</p>
          <p className="why-own">{POSITIONING.frame.own}</p>
          <small>{POSITIONING.audience}</small>
        </header>
        <section className="why-pillars">
          {POSITIONING.pillars.map((pillar) => (
            <div key={pillar.id}>
              <strong>{pillar.name}</strong>
              <p>{flags[pillar.id] ? pillar.line : pillar.fallback}</p>
            </div>
          ))}
        </section>
        <section className="why-compare">
          <span className="object-label">COMPARED HONESTLY</span>
          {POSITIONING.compare.map((item) => (
            <article key={item.them}>
              <strong>{item.them}</strong>
              <p className="muted">{item.theirJob}</p>
              <p className="muted">{item.gap}</p>
              <p>{item.us}</p>
            </article>
          ))}
        </section>
        <button
          className="primary-pill"
          onClick={() => {
            if (hasWorkspaces) onClose();
            else onCreate();
          }}
        >
          {hasWorkspaces ? "Back to work" : "Create your first workspace"}
        </button>
      </aside>
    </div>
  );
}

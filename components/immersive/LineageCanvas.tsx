"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DiffView } from "@/components/features/DiffView";
import { MOTION } from "@/lib/motion";

type Output = {
  id: string;
  stepName: string;
  status: string;
  model: string;
  costUsd: number;
  skillVersion: number;
  createdAt: string;
  parentOutputId?: string | null;
  forkChangedVariable?: string | null;
  draftContent?: string;
  finalContent?: string;
};

function layoutOutputs(outputs: Output[]) {
  const byId = new Map(outputs.map((item) => [item.id, item]));
  const depthOf = (item: Output): number => item.parentOutputId && byId.has(item.parentOutputId) ? 1 + depthOf(byId.get(item.parentOutputId)!) : 0;
  const grouped = new Map<number, Output[]>();
  outputs.forEach((item) => {
    const depth = depthOf(item);
    grouped.set(depth, [...(grouped.get(depth) ?? []), item]);
  });
  const positions = new Map<string, { x: number; y: number }>();
  Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]).forEach(([depth, items]) => {
    items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).forEach((item, index) => {
      const parent = item.parentOutputId ? positions.get(item.parentOutputId) : null;
      positions.set(item.id, { x: depth * 220, y: Math.max(index * 96, parent?.y ?? 0) });
    });
  });
  Array.from(grouped.keys()).sort((a, b) => a - b).forEach((depth) => {
    const items = (grouped.get(depth) ?? []).sort((a, b) => (positions.get(a.id)?.y ?? 0) - (positions.get(b.id)?.y ?? 0));
    let cursor = -96;
    for (const item of items) {
      const pos = positions.get(item.id)!;
      pos.y = Math.max(pos.y, cursor + 96);
      cursor = pos.y;
    }
  });
  return positions;
}

export function LineageCanvas({ outputs, onOpen }: { outputs: Output[]; onOpen?: (output: Output) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"list" | "lineage">("lineage");
  const [selection, setSelection] = useState<string[]>([]);
  const [transform, setTransform] = useState({ x: 24, y: 24, k: 1 });
  const [diffOpen, setDiffOpen] = useState(false);
  const positions = useMemo(() => layoutOutputs(outputs), [outputs]);
  const maxCost = Math.max(...outputs.map((item) => item.costUsd), 0.0001);
  const size = useMemo(() => {
    const values = Array.from(positions.values());
    return { width: Math.max(520, ...values.map((p) => p.x + 280)) + 80, height: Math.max(320, ...values.map((p) => p.y + 120)) + 80 };
  }, [positions]);

  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) setMode("list");
  }, []);

  useEffect(() => {
    if (mode !== "lineage") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.font = "10px sans-serif";
    for (const output of outputs) {
      if (!output.parentOutputId) continue;
      const parent = positions.get(output.parentOutputId);
      const child = positions.get(output.id);
      if (!parent || !child) continue;
      const start = { x: parent.x + 200, y: parent.y + 36 };
      const end = { x: child.x, y: child.y + 36 };
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.bezierCurveTo(start.x + 60, start.y, end.x - 60, end.y, end.x, end.y);
      ctx.strokeStyle = output.forkChangedVariable ? "color-mix(in srgb, var(--aurora-a) 35%, transparent)" : "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (output.forkChangedVariable) {
        ctx.fillStyle = "var(--muted)";
        ctx.fillText(output.forkChangedVariable.toUpperCase(), (start.x + end.x) / 2 - 18, (start.y + end.y) / 2 - 8);
      }
    }
  }, [mode, outputs, positions, reduce, size.height, size.width, transform.k]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSelection([]); setDiffOpen(false); }
      if (event.key === "ArrowLeft") setTransform((t) => ({ ...t, x: t.x - 40 }));
      if (event.key === "ArrowRight") setTransform((t) => ({ ...t, x: t.x + 40 }));
      if (event.key === "ArrowUp") setTransform((t) => ({ ...t, y: t.y - 40 }));
      if (event.key === "ArrowDown") setTransform((t) => ({ ...t, y: t.y + 40 }));
      if (event.key === "+") setTransform((t) => ({ ...t, k: Math.min(2, t.k + 0.1) }));
      if (event.key === "-") setTransform((t) => ({ ...t, k: Math.max(0.5, t.k - 0.1) }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (outputs.length > 60) return <div className="empty-inline"><p>Lineage view is available up to 60 outputs. Showing the list.</p><div className="output-list">{outputs.map((output) => <button key={output.id} className="output-list-row" onClick={() => onOpen?.(output)}><span>{output.stepName}</span><small>{output.model} · ${output.costUsd.toFixed(4)}</small></button>)}</div></div>;
  const selected = selection.map((id) => outputs.find((item) => item.id === id)).filter(Boolean) as Output[];

  return (
    <section className="lineage-section">
      <div className="segmented-control" role="tablist">
        <button className={mode === "list" ? "is-active" : ""} onClick={() => setMode("list")}>List</button>
        <button className={mode === "lineage" ? "is-active" : ""} onClick={() => setMode("lineage")}>Lineage</button>
      </div>
      {mode === "list" ? (
        <div className="output-list">{outputs.map((output) => <button key={output.id} className="output-list-row" onClick={() => onOpen?.(output)}><span>{output.stepName}</span><small>{output.model} · ${output.costUsd.toFixed(4)}</small></button>)}</div>
      ) : (
        <div className="lineage-viewport">
          <div className="lineage-tools"><button onClick={() => setTransform({ x: 24, y: 24, k: 1 })}>1:1</button><button onClick={() => setTransform({ x: 12, y: 12, k: 0.75 })}>Fit</button></div>
          <div className="lineage-world" style={{ width: size.width, height: size.height, transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.k})` }}>
            <canvas ref={canvasRef} aria-hidden="true" />
            {outputs.map((output, index) => {
              const pos = positions.get(output.id) ?? { x: 0, y: 0 };
              const selectedNode = selection.includes(output.id);
              const borderAlpha = Math.min(0.3, 0.1 + 0.2 * (output.costUsd / maxCost));
              return (
                <motion.button
                  key={output.id}
                  className={`lineage-node ${selectedNode ? "is-selected" : ""} ${output.status === "final" ? "is-final" : ""}`}
                  style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`, borderColor: `rgba(255,255,255,${borderAlpha})` }}
                  initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: MOTION.base, delay: reduce ? 0 : Math.min(index * MOTION.stagger, 0.9), ease: MOTION.easeOut }}
                  onClick={() => setSelection((items) => [...items, output.id].slice(-2))}
                  onDoubleClick={() => onOpen?.(output)}
                >
                  <span>{output.parentOutputId ? `FORK · ${output.forkChangedVariable}` : "OUTPUT"}</span>
                  <strong>{output.stepName}</strong>
                  <small>{output.model} · v{output.skillVersion} · ${output.costUsd.toFixed(4)}</small>
                </motion.button>
              );
            })}
          </div>
          {selection.length === 2 && <button className="compare-pill" onClick={() => setDiffOpen(true)}>Compare</button>}
        </div>
      )}
      {diffOpen && selected.length === 2 && <div className="feature-sheet-backdrop" role="dialog" aria-modal="true"><div className="feature-sheet"><button className="secondary-pill" onClick={() => setDiffOpen(false)}>Close</button><DiffView leftLabel={selected[0].stepName} rightLabel={selected[1].stepName} leftText={selected[0].finalContent || selected[0].draftContent || ""} rightText={selected[1].finalContent || selected[1].draftContent || ""} leftMeta={selected[0].model} rightMeta={selected[1].model} /></div></div>}
    </section>
  );
}

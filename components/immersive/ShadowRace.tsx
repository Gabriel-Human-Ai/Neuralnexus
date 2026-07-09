"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { MOTION } from "@/lib/motion";

export function ShadowRace({ recommendation, applied }: { recommendation: any; applied?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { amount: 0.25, once: true });
  const reduce = useReducedMotion();
  const scores: number[] = Array.isArray(recommendation.scores) ? recommendation.scores : [];
  if (scores.length < 3) return null;
  const width = 220;
  const height = 64;
  const points = scores.map((score, index) => ({ x: 12 + index * ((width - 24) / Math.max(1, scores.length - 1)), y: height - 12 - (Math.max(0, Math.min(10, score)) / 10) * (height - 24), score }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const primary = Number(recommendation.avgPrimaryCostUsd ?? 0);
  const challenger = Number(recommendation.avgChallengerCostUsd ?? 0);
  const max = Math.max(primary, challenger, 0.0001);
  const delta = Math.max(0, primary - challenger);

  return (
    <div ref={ref} className="shadow-race">
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <line x1="8" x2={width - 8} y1={height - 12 - 0.8 * (height - 24)} y2={height - 12 - 0.8 * (height - 24)} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" />
        <text x="10" y="11" fill="rgba(244,241,234,0.55)" fontSize="10">bar: 8/10</text>
        <motion.polyline points={polyline} fill="none" stroke="rgba(191,162,122,0.30)" strokeWidth="1" initial={reduce ? false : { pathLength: 0 }} animate={inView ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: MOTION.draw }} />
        {points.map((point, index) => <motion.circle key={index} cx={point.x} cy={point.y} r="3" fill={point.score >= 8 ? "#C8A96A" : "rgba(244,241,234,0.38)"} initial={reduce ? false : { opacity: 0, scale: 0.6 }} animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }} transition={{ ...MOTION.springSoft, delay: reduce ? 0 : index * 0.06 } as any} />)}
      </svg>
      <div className="cost-race" aria-hidden="true">
        <span>{recommendation.fromModel}</span>
        <div><motion.i style={{ width: `${(primary / max) * 100}%` }} animate={applied ? { width: `${(challenger / max) * 100}%`, backgroundColor: "rgba(200,169,106,0.60)" } : undefined} transition={{ duration: reduce ? 0 : 0.5 }} /></div>
        <span>{recommendation.toModel}</span>
        <div><i className="challenger" style={{ width: `${(challenger / max) * 100}%` }} /></div>
        <small>-${delta.toFixed(4)} per run</small>
      </div>
      <table className="sr-only">
        <caption>Shadow run scores and average costs</caption>
        <tbody>{scores.map((score, index) => <tr key={index}><td>{index + 1}</td><td>{score}</td><td>{primary}</td><td>{challenger}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { MOTION } from "@/lib/motion";
import { PremiumSlideAction } from "@/components/PremiumSlideAction";

type Step = { name: string; description?: string };
type Output = { stepName: string; status: string };

export function WorkflowSpine({ steps, outputs, built, running, completed, onRun }: {
  steps: Step[];
  outputs: Output[];
  built?: boolean;
  running: boolean;
  completed: boolean;
  onRun: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: panelRef, offset: ["start 0.85", "end 0.35"] });
  const revealPath = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [seenDone, setSeenDone] = useState<Set<string>>(new Set());
  const [flaredStep, setFlaredStep] = useState<string | null>(null);

  const state = useMemo(() => {
    const mapped = steps.map((step) => {
      const match = outputs.find((output) => output.stepName === step.name);
      return { step, status: match?.status === "final" ? "done" : match ? "active" : "pending" as "done" | "active" | "pending" };
    });
    const doneCount = mapped.filter((item) => item.status === "done").length;
    const nextStepIndex = mapped.findIndex((item) => item.status !== "done");
    return { mapped, doneCount, completedFraction: steps.length ? doneCount / steps.length : 0, nextStepIndex };
  }, [outputs, steps]);

  useEffect(() => {
    const done = state.mapped.filter((item) => item.status === "done").map((item) => item.step.name);
    const newDone = done.filter((name) => !seenDone.has(name));
    if (newDone.length && !reduce) {
      const next = state.mapped[state.nextStepIndex]?.step.name ?? null;
      setFlaredStep(next);
      window.setTimeout(() => setFlaredStep(null), MOTION.flare * 1000);
      setSeenDone(new Set(done));
    } else if (!seenDone.size) {
      setSeenDone(new Set(done));
    }
  }, [reduce, seenDone, state.mapped, state.nextStepIndex]);

  const nextStep = state.nextStepIndex >= 0 ? state.mapped[state.nextStepIndex].step : steps[steps.length - 1];
  const pathLength = reduce || built ? 1 : revealPath;

  return (
    <section ref={panelRef} className="workflow-spine-panel" aria-label="Workspace workflow">
      <svg className="workflow-spine-svg" viewBox="0 0 24 100" preserveAspectRatio="none" aria-hidden="true">
        <motion.path d="M12 0 V100" stroke="rgba(255,255,255,0.10)" strokeWidth="2" pathLength={pathLength as any} />
        <motion.path d="M12 0 V100" stroke="var(--aurora-a)" strokeWidth="2" pathLength={reduce ? state.completedFraction : state.completedFraction} transition={MOTION.springSoft as any} />
      </svg>
      <ol className="workflow-step-list">
        {state.mapped.map((item, index) => {
          const isNext = index === state.nextStepIndex;
          const done = item.status === "done";
          return (
            <motion.li
              key={item.step.name}
              className={`workflow-step-row is-${item.status}`}
              tabIndex={0}
              initial={built && !reduce ? { opacity: 0, y: 12, filter: "blur(4px)" } : false}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: MOTION.base, delay: built && !reduce ? index * MOTION.stagger : 0, ease: MOTION.easeOut }}
            >
              <span className="workflow-node" aria-hidden="true">
                {isNext && flaredStep === item.step.name && <motion.span className="workflow-node-flare" initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: MOTION.flare }} />}
                {done && <Check size={12} />}
              </span>
              <div>
                <strong>{item.step.name}</strong>
                <p>{item.step.description || "Run this step with the workspace method and quality gates."}</p>
              </div>
            </motion.li>
          );
        })}
      </ol>
      {nextStep && state.nextStepIndex !== -1 && (
        <div className="workflow-sticky-run">
          <small>Next: {nextStep.name}</small>
          <PremiumSlideAction label="Slide to run next step" completionText="Step prepared" estimatedCost="$0.03-$0.09" loading={running} completed={completed} onComplete={onRun} />
        </div>
      )}
    </section>
  );
}

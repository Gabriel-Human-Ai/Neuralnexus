"use client";

import { motion } from "framer-motion";

type NexusIslandProps = {
  activity?: "idle" | "generation" | "gates" | "extraction";
  label?: string;
};

export function NexusIsland({ activity = "idle", label }: NexusIslandProps) {
  const active = activity !== "idle";
  const text =
    label ??
    (activity === "generation"
      ? "Generating"
      : activity === "gates"
        ? "Checking quality"
        : activity === "extraction"
          ? "Extracting"
          : "Ready");

  return (
    <motion.div
      className={`nexus-island ${active ? "is-active" : ""}`}
      data-activity={activity}
      initial={false}
      animate={{ y: active ? 0 : -2, scale: active ? 1.02 : 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
    >
      <span className="nexus-island__orb" aria-hidden="true" />
      <span>{text}</span>
      {active && (
        <span className="nexus-island__wave" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      )}
    </motion.div>
  );
}

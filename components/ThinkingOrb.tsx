"use client";
import { motion } from "framer-motion";

export interface ThinkingOrbProps {
  isLoading: boolean;
  fallbackModel?: string;
  size?: "hero" | "sm";
}

const MODEL_HUES: Record<string, string> = {
  default: "from-amber-400 via-orange-300 to-yellow-200",
  "claude-sonnet-4-6": "from-orange-400 via-amber-400 to-yellow-300",
  "gpt-4o": "from-emerald-400 via-teal-300 to-amber-200",
  "z-ai/glm-4.6": "from-sky-400 via-amber-300 to-orange-300",
};

export function ThinkingOrb({ isLoading, fallbackModel, size = "hero" }: ThinkingOrbProps) {
  const hue = MODEL_HUES[fallbackModel ?? "default"] ?? MODEL_HUES.default;
  const sizeClass = size === "sm" ? "w-6 h-6" : "w-10 h-10 md:w-28 md:h-28";

  return (
    <motion.div
      className={`relative ${sizeClass} rounded-full shrink-0`}
      style={{ willChange: "transform" }}
      animate={isLoading ? { scale: [0.92, 1.08, 0.92], opacity: [0.5, 1, 0.5] } : { scale: 1, opacity: 0.4 }}
      transition={isLoading ? { duration: 3, ease: "easeInOut", repeat: Infinity } : { duration: 0.4 }}
    >
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${hue} backdrop-blur-md`}
        style={{ mixBlendMode: "screen", willChange: "transform" }}
        animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
        transition={isLoading ? { duration: 8, ease: "linear", repeat: Infinity } : { duration: 0.3 }}
      />
      <div className="absolute inset-0 rounded-full shadow-[0_0_40px_color-mix(in srgb, var(--aurora-a) 35%, transparent)]" />
    </motion.div>
  );
}

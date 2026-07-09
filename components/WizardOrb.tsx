"use client";

import { ResonanceOrb } from "@/components/ResonanceOrb";

export type WizardOrbState = "idle" | "listening" | "thinking" | "generating" | "success" | "alert";

type WizardOrbProps = {
  size?: number;
  intensity?: number;
  hue?: number;
  speed?: number;
  state?: WizardOrbState;
  interactive?: boolean;
  reducedMotion?: boolean;
  className?: string;
};

const STATE_HUE: Record<WizardOrbState, number> = {
  idle: 238,
  listening: 270,
  thinking: 214,
  generating: 288,
  success: 92,
  alert: 346,
};

const STATE_TONE: Record<WizardOrbState, "ruhig" | "neugierig" | "eilig" | "begeistert" | "frustriert" | null> = {
  idle: "ruhig",
  listening: "neugierig",
  thinking: "ruhig",
  generating: "eilig",
  success: "begeistert",
  alert: "frustriert",
};

export function WizardOrb({
  size = 320,
  intensity = 62,
  hue,
  speed = 18,
  state = "idle",
  interactive = false,
  reducedMotion = false,
  className = "",
}: WizardOrbProps) {
  const safeHue = Number.isFinite(hue) ? Number(hue) : STATE_HUE[state];
  const safeSpeed = reducedMotion ? 1 : Math.max(1, Math.min(100, speed));
  const safeIntensity = Math.max(1, Math.min(100, intensity));

  return (
    <div
      className={`wizard-orb-frame ${interactive ? "is-interactive" : ""} ${className}`}
      data-state={state}
      style={{ width: size, height: size }}
    >
      <ResonanceOrb
        size={size}
        hue={safeHue}
        speed={safeSpeed}
        morph={reducedMotion ? 1 : 44}
        glow={safeIntensity}
        tone={STATE_TONE[state]}
      />
    </div>
  );
}

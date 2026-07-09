"use client";

import { NexusOrb, type OrbState } from "@/components/NexusOrb";

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

function mapState(state: WizardOrbState): OrbState {
  if (state === "generating") return "responding";
  if (state === "alert") return "thinking";
  return state;
}

export function WizardOrb({ size, state = "idle", interactive, reducedMotion, className }: WizardOrbProps) {
  return <NexusOrb size={size} state={mapState(state)} interactive={interactive} reducedMotion={reducedMotion} className={className} />;
}

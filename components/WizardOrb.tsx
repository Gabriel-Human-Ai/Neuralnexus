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
  primaryColor?: string;
  secondaryColor?: string;
  atmosphereGlow?: number;
  atmosphereLevel?: number;
  atmosphereScale?: number;
  internalSpeed?: number;
  autoRotation?: number;
  globalDensity?: number;
  chromaticAberration?: number;
  resolutionDpr?: number;
  internalAnimSpeed?: number;
  cornerSmoothness?: number;
  asymmetry?: number;
  iterations?: number;
  fractalScale?: number;
  energyDecay?: number;
};

function mapState(state: WizardOrbState): OrbState {
  if (state === "generating") return "responding";
  if (state === "alert") return "thinking";
  return state;
}

export function WizardOrb({ size, state = "idle", interactive, reducedMotion, className, primaryColor, secondaryColor, atmosphereGlow, atmosphereLevel, atmosphereScale, internalSpeed, autoRotation, globalDensity, chromaticAberration, resolutionDpr, internalAnimSpeed, cornerSmoothness, asymmetry, iterations, fractalScale, energyDecay }: WizardOrbProps) {
  return <NexusOrb size={size} state={mapState(state)} interactive={interactive} reducedMotion={reducedMotion} className={className} primaryColor={primaryColor} secondaryColor={secondaryColor} atmosphereGlow={atmosphereGlow} atmosphereLevel={atmosphereLevel} atmosphereScale={atmosphereScale} internalSpeed={internalSpeed} autoRotation={autoRotation} globalDensity={globalDensity} chromaticAberration={chromaticAberration} resolutionDpr={resolutionDpr} internalAnimSpeed={internalAnimSpeed} cornerSmoothness={cornerSmoothness} asymmetry={asymmetry} iterations={iterations} fractalScale={fractalScale} energyDecay={energyDecay} />;
}

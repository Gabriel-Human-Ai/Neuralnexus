"use client";

import { useEffect, useRef, useState } from "react";

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
  idle: 198,
  listening: 188,
  thinking: 208,
  generating: 220,
  success: 156,
  alert: 18,
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const onChange = () => setReduced(media.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [touchPulse, setTouchPulse] = useState(0);
  const prefersReduced = usePrefersReducedMotion();
  const shouldReduce = reducedMotion || prefersReduced;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    let frame = 0;
    let raf = 0;
    const center = size / 2;
    const baseRadius = size * 0.265;
    const safeHue = Number.isFinite(hue) ? Number(hue) : STATE_HUE[state];
    const safeIntensity = Math.max(12, Math.min(100, intensity));
    const safeSpeed = Math.max(1, Math.min(100, speed));
    const stateBoost = state === "listening" ? 0.18 : state === "generating" ? 0.25 : state === "success" ? 0.12 : 0;
    const breathSeconds = 6.8 - (safeSpeed / 100) * 2.2;
    const lineCount = state === "generating" ? 58 : state === "listening" ? 48 : 38;

    const drawLine = (time: number, index: number, radius: number) => {
      const phase = index * 1.618;
      const start = phase + time * 0.09;
      const length = 0.45 + Math.sin(time * 0.18 + index) * 0.18;
      context.beginPath();
      for (let step = 0; step < 16; step++) {
        const t = step / 15;
        const angle = start + t * length;
        const wobble = Math.sin(time * 0.42 + index * 2.1 + t * 6) * 4;
        const r = radius + wobble + Math.sin(index + t * 9) * 3;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      const alpha = 0.12 + (safeIntensity / 100) * 0.26;
      context.strokeStyle = `hsla(${safeHue + 4}, 100%, 82%, ${alpha})`;
      context.lineWidth = 0.7 + (index % 4) * 0.16;
      context.shadowColor = `hsla(${safeHue}, 100%, 72%, 0.72)`;
      context.shadowBlur = 8 + safeIntensity * 0.08;
      context.stroke();
    };

    const draw = (now: number) => {
      const time = now / 1000;
      const breath = shouldReduce ? 0 : Math.sin((time / breathSeconds) * Math.PI * 2);
      const slow = shouldReduce ? 0 : time * 0.08;
      const pulse = Math.max(0, 1 - (time - touchPulse) / 1.25);
      const breathScale = 1 + breath * 0.018 + pulse * 0.03 + stateBoost * 0.03;
      const radius = baseRadius * breathScale;

      context.clearRect(0, 0, size, size);
      context.globalCompositeOperation = "source-over";

      const aura = context.createRadialGradient(center, center, radius * 0.12, center, center, radius * 1.95);
      aura.addColorStop(0, `hsla(${safeHue + 6}, 100%, 88%, ${0.48 + stateBoost})`);
      aura.addColorStop(0.38, `hsla(${safeHue}, 100%, 62%, ${0.24 + safeIntensity / 520})`);
      aura.addColorStop(0.74, `hsla(${safeHue + 18}, 100%, 58%, ${0.075 + pulse * 0.06})`);
      aura.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = aura;
      context.beginPath();
      context.arc(center, center, radius * 2.08, 0, Math.PI * 2);
      context.fill();

      const core = context.createRadialGradient(center - radius * 0.22, center - radius * 0.22, radius * 0.04, center, center, radius);
      core.addColorStop(0, `hsla(${safeHue + 10}, 100%, 98%, ${0.95})`);
      core.addColorStop(0.26, `hsla(${safeHue + 4}, 100%, 86%, ${0.72})`);
      core.addColorStop(0.58, `hsla(${safeHue}, 92%, 58%, ${0.34})`);
      core.addColorStop(1, `hsla(${safeHue + 18}, 88%, 44%, ${0.08})`);
      context.fillStyle = core;
      context.shadowColor = `hsla(${safeHue}, 100%, 76%, ${0.9})`;
      context.shadowBlur = 30 + safeIntensity * 0.32;
      context.beginPath();
      context.arc(center, center, radius * 0.94, 0, Math.PI * 2);
      context.fill();

      context.globalCompositeOperation = "screen";
      for (let i = 0; i < lineCount; i++) drawLine(slow, i, radius * (0.92 + (i % 5) * 0.018));

      context.shadowBlur = 0;
      context.strokeStyle = `hsla(${safeHue + 8}, 100%, 90%, ${0.42 + pulse * 0.26})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(center, center, radius * (1.04 + pulse * 0.08), 0, Math.PI * 2);
      context.stroke();

      context.globalCompositeOperation = "source-over";
      frame += 1;
      if (!shouldReduce) raf = requestAnimationFrame(draw);
    };

    draw(performance.now());
    if (!shouldReduce) raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [hue, intensity, reducedMotion, shouldReduce, size, speed, state, touchPulse]);

  return (
    <button
      type="button"
      className={`wizard-orb-frame ${interactive ? "is-interactive" : ""} ${className}`}
      data-state={state}
      style={{ width: size, height: size }}
      aria-label="NeuralNexus Wizard Orb"
      onPointerDown={() => {
        if (interactive) setTouchPulse(performance.now() / 1000);
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
    </button>
  );
}

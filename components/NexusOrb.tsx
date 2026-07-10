"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createOrbMaterial, createOrbUniforms } from "@/lib/orb-material";
import { claimWebGL, onWebGLChange, releaseWebGL, webglSupported } from "@/lib/webgl-guard";

export type OrbState = "idle" | "listening" | "thinking" | "responding" | "success";

type NexusOrbProps = {
  size?: number;
  state?: OrbState;
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

const STATE_TARGETS: Record<OrbState, { amplitude: number; speed: number; fresnel: number; rotation: number; energy: number }> = {
  idle: { amplitude: 0.12, speed: 0.15, fresnel: 0.6, rotation: 0.05, energy: 0.35 },
  listening: { amplitude: 0.07, speed: 0.25, fresnel: 0.85, rotation: 0.08, energy: 0.48 },
  thinking: { amplitude: 0.2, speed: 0.6, fresnel: 0.75, rotation: 0.25, energy: 0.64 },
  responding: { amplitude: 0.16, speed: 0.4, fresnel: 0.9, rotation: 0.15, energy: 0.72 },
  success: { amplitude: 0.1, speed: 0.2, fresnel: 1.0, rotation: 0.05, energy: 0.82 },
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function NexusOrb({
  size = 360,
  state = "idle",
  interactive = false,
  reducedMotion = false,
  className = "",
  primaryColor = "#00B3FF",
  secondaryColor = "#FF2ED2",
  atmosphereGlow = 0.15,
  atmosphereLevel = 1,
  atmosphereScale = 1.03,
  internalSpeed = 0.5,
  autoRotation = 0.89,
  globalDensity = 3,
  chromaticAberration = 0.025,
  resolutionDpr = 0.7,
  internalAnimSpeed = 0.43,
  cornerSmoothness = 0.031,
  asymmetry = 0.55,
  iterations = 4,
  fractalScale = 0.97,
  energyDecay = -16.7,
}: NexusOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<OrbState>(state);
  const pulseRef = useRef(0);
  const [fallback, setFallback] = useState(false);
  const [blockedByConstellation, setBlockedByConstellation] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    return onWebGLChange((claim) => setBlockedByConstellation(claim === "constellation"));
  }, []);

  useEffect(() => {
    if (blockedByConstellation) {
      setFallback(true);
      return;
    }
    const mount = mountRef.current;
    if (!mount) return;
    if (!webglSupported() || !claimWebGL("orb")) {
      setFallback(true);
      return;
    }
    setFallback(false);

    const reduce = reducedMotion || prefersReducedMotion();
    const lowQuality = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4);
    const detail = lowQuality ? 24 : 48;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.max(0.5, Math.min(window.devicePixelRatio || 1, Math.max(0.5, resolutionDpr) * 2)));
    renderer.setSize(size, size);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0, 4);

    scene.add(new THREE.AmbientLight(0xc8a96a, 0.15));
    const warmLight = new THREE.PointLight(0xc8a96a, 1.2, 6);
    warmLight.position.set(1.6, 1.4, 2);
    scene.add(warmLight);
    const coolLight = new THREE.PointLight(0x24313a, 0.8, 6);
    coolLight.position.set(-1.8, -1.2, 1.2);
    scene.add(coolLight);

    const uniforms = createOrbUniforms({
      uAmplitude: { value: STATE_TARGETS[stateRef.current].amplitude },
      uSpeed: { value: STATE_TARGETS[stateRef.current].speed },
      uEnergy: { value: STATE_TARGETS[stateRef.current].energy },
      uFresnel: { value: STATE_TARGETS[stateRef.current].fresnel },
      uRim: { value: new THREE.Color(primaryColor) },
      uSecondary: { value: new THREE.Color(secondaryColor) },
      uAtmosphereGlow: { value: atmosphereGlow },
      uAtmosphereLevel: { value: atmosphereLevel },
      uAtmosphereScale: { value: atmosphereScale },
      uInternalSpeed: { value: internalSpeed },
      uGlobalDensity: { value: globalDensity },
      uChromaticAberration: { value: chromaticAberration },
      uInternalAnimSpeed: { value: internalAnimSpeed },
      uCornerSmoothness: { value: cornerSmoothness },
      uAsymmetry: { value: asymmetry },
      uIterations: { value: iterations },
      uFractalScale: { value: fractalScale },
      uEnergyDecay: { value: energyDecay },
    });
    const material = createOrbMaterial(uniforms);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, detail), material);
    scene.add(core);

    const halo = !lowQuality
      ? new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.06, 3),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(primaryColor),
            wireframe: true,
            transparent: true,
            opacity: 0.05,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        )
      : null;
    if (halo) scene.add(halo);

    let raf = 0;
    let visible = true;
    let inViewport = true;
    const current = { ...STATE_TARGETS[stateRef.current] };

    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      if (inViewport && visible && !reduce && !raf) raf = requestAnimationFrame(render);
    });
    observer.observe(mount);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible && inViewport && !reduce && !raf) raf = requestAnimationFrame(render);
    };
    const onOrbEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ state?: OrbState; pulse?: boolean }>).detail;
      if (detail?.state) stateRef.current = detail.state;
      if (detail?.pulse) pulseRef.current = performance.now() / 1000;
    };
    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) stateRef.current = "listening";
    };
    const onKey = () => {
      if (stateRef.current === "listening") pulseRef.current = performance.now() / 1000;
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("nexus:orb", onOrbEvent);
    window.addEventListener("focusin", onFocus);
    window.addEventListener("keydown", onKey);

    function render(now: number) {
      raf = 0;
      const time = now / 1000;
      const target = STATE_TARGETS[stateRef.current];
      const pulse = Math.max(0, 1 - (time - pulseRef.current) / 0.3);
      current.amplitude += (target.amplitude + pulse * 0.05 - current.amplitude) * 0.04;
      current.speed += (target.speed - current.speed) * 0.04;
      current.fresnel += (target.fresnel + (stateRef.current === "success" ? pulse * 0.6 : 0) - current.fresnel) * 0.04;
      current.rotation += (target.rotation - current.rotation) * 0.04;
      current.energy += (target.energy + pulse * 0.16 - current.energy) * 0.04;

      uniforms.uTime.value = reduce ? 0.1 : time;
      uniforms.uAmplitude.value = reduce ? 0.02 : current.amplitude;
      uniforms.uSpeed.value = current.speed;
      uniforms.uFresnel.value = current.fresnel;
      uniforms.uEnergy.value = current.energy;

      const breath = reduce ? 0 : Math.sin(time * Math.PI * 2 / 6) * 0.015;
      core.scale.setScalar(1 + breath);
      core.rotation.y += reduce ? 0 : (current.rotation * autoRotation) / 38;
      core.rotation.x = stateRef.current === "listening" ? -0.03 : Math.sin(time * 0.16) * 0.025;
      if (halo) {
        halo.rotation.y -= reduce ? 0 : (current.rotation * autoRotation) / 65;
        halo.rotation.x += reduce ? 0 : (current.rotation * autoRotation) / 120;
      }

      renderer.render(scene, camera);
      if (!reduce && visible && inViewport) raf = requestAnimationFrame(render);
    }

    render(performance.now());
    if (!reduce) raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("nexus:orb", onOrbEvent);
      window.removeEventListener("focusin", onFocus);
      window.removeEventListener("keydown", onKey);
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((item) => item.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      releaseWebGL("orb");
    };
  }, [asymmetry, atmosphereGlow, atmosphereLevel, atmosphereScale, autoRotation, blockedByConstellation, chromaticAberration, cornerSmoothness, energyDecay, fractalScale, globalDensity, internalAnimSpeed, internalSpeed, iterations, primaryColor, reducedMotion, resolutionDpr, secondaryColor, size]);

  return (
    <button
      type="button"
      className={`wizard-orb-frame ${interactive ? "is-interactive" : ""} ${className}`}
      style={{ width: size, height: size }}
      aria-label="NeuralNexus Orb"
      onPointerDown={() => {
        if (interactive) pulseRef.current = performance.now() / 1000;
      }}
    >
      <span className="sr-only" aria-live="polite">Assistant is {state === "thinking" ? "thinking" : state === "responding" ? "responding" : "ready"}.</span>
      {fallback ? <span className="wizard-orb-static" aria-hidden="true" /> : <div ref={mountRef} aria-hidden="true" />}
    </button>
  );
}

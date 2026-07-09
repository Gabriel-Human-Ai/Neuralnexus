"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

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

function seeded(index: number) {
  const x = Math.sin(index * 999.91) * 10000;
  return x - Math.floor(x);
}

function pointOnSphere(theta: number, phi: number, radius: number) {
  return new THREE.Vector3(
    Math.cos(theta) * Math.sin(phi) * radius,
    Math.cos(phi) * radius,
    Math.sin(theta) * Math.sin(phi) * radius,
  );
}

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
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
  const mountRef = useRef<HTMLDivElement | null>(null);
  const touchPulseRef = useRef(0);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const prefersReduced = usePrefersReducedMotion();
  const shouldReduce = reducedMotion || prefersReduced;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    if (!canUseWebGL()) {
      setWebglUnavailable(true);
      return;
    }
    setWebglUnavailable(false);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const safeHue = Number.isFinite(hue) ? Number(hue) : STATE_HUE[state];
    const safeIntensity = Math.max(12, Math.min(100, intensity));
    const safeSpeed = Math.max(1, Math.min(100, speed));
    const stateBoost = state === "generating" ? 0.36 : state === "listening" ? 0.2 : state === "thinking" ? 0.14 : state === "alert" ? 0.18 : 0;
    const breathSeconds = 9.2 - (safeSpeed / 100) * 3.4;
    const shellColor = new THREE.Color(`hsl(${safeHue}, 100%, 72%)`);
    const rimColor = new THREE.Color(`hsl(${safeHue + 8}, 100%, 90%)`);
    const coreColor = new THREE.Color(`hsl(${safeHue + 4}, 100%, 96%)`);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(dpr);
    renderer.setSize(size, size);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
    camera.position.set(0, 0, 4.25);

    const orb = new THREE.Group();
    scene.add(orb);

    const ambient = new THREE.AmbientLight(0xcfeeff, 0.9);
    scene.add(ambient);

    const coreLight = new THREE.PointLight(coreColor, 4 + safeIntensity / 15, 6, 1.8);
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    const rimLight = new THREE.PointLight(rimColor, 2.4, 5, 2);
    rimLight.position.set(-1.4, 1.2, 1.8);
    scene.add(rimLight);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 64, 64),
      new THREE.MeshBasicMaterial({
        color: coreColor,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    orb.add(core);

    const innerHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.74, 64, 64),
      new THREE.MeshBasicMaterial({
        color: shellColor,
        transparent: true,
        opacity: 0.22 + safeIntensity / 560,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    orb.add(innerHalo);

    const glassShell = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 96),
      new THREE.MeshPhysicalMaterial({
        color: shellColor,
        transparent: true,
        opacity: 0.24,
        roughness: 0.05,
        metalness: 0,
        transmission: 0.82,
        thickness: 1.2,
        ior: 1.45,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      } as any),
    );
    orb.add(glassShell);

    const edgeShell = new THREE.Mesh(
      new THREE.SphereGeometry(1.018, 96, 96),
      new THREE.MeshBasicMaterial({
        color: rimColor,
        transparent: true,
        opacity: 0.11 + safeIntensity / 900,
        wireframe: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    orb.add(edgeShell);

    const filamentGroup = new THREE.Group();
    const filamentMaterials: THREE.LineBasicMaterial[] = [];
    const lineCount = state === "generating" ? 92 : state === "listening" ? 78 : 66;
    for (let i = 0; i < lineCount; i++) {
      const exterior = i % 3 === 0;
      const baseTheta = seeded(i + 3) * Math.PI * 2;
      const basePhi = 0.34 + seeded(i + 11) * (Math.PI - 0.68);
      const arc = 0.22 + seeded(i + 19) * (exterior ? 0.55 : 0.9);
      const radius = exterior ? 1.02 + seeded(i + 29) * 0.18 : 0.28 + seeded(i + 31) * 0.72;
      const points: THREE.Vector3[] = [];
      for (let step = 0; step < 22; step++) {
        const t = step / 21;
        const wobble = Math.sin(t * Math.PI) * (seeded(i + step) - 0.5) * 0.38;
        points.push(pointOnSphere(baseTheta + arc * t + wobble, basePhi + Math.sin(t * Math.PI * 2 + i) * 0.08, radius));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: i % 5 === 0 ? coreColor : rimColor,
        transparent: true,
        opacity: exterior ? 0.34 + safeIntensity / 380 : 0.13 + safeIntensity / 640,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      filamentMaterials.push(material);
      filamentGroup.add(new THREE.Line(geometry, material));
    }
    orb.add(filamentGroup);

    const particlePositions: number[] = [];
    const particleCount = 150;
    for (let i = 0; i < particleCount; i++) {
      const theta = seeded(i + 101) * Math.PI * 2;
      const phi = Math.acos(2 * seeded(i + 203) - 1);
      const radius = 0.95 + seeded(i + 307) * 0.36;
      const point = pointOnSphere(theta, phi, radius);
      particlePositions.push(point.x, point.y, point.z);
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: rimColor,
        size: 0.016,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    orb.add(particles);

    let raf = 0;
    const render = (now: number) => {
      const time = now / 1000;
      const pulse = Math.max(0, 1 - (time - touchPulseRef.current) / 1.35);
      const breath = shouldReduce ? 0 : Math.sin((time / breathSeconds) * Math.PI * 2);
      const scale = 1 + breath * 0.022 + pulse * 0.045 + stateBoost * 0.018;

      orb.scale.setScalar(scale);
      core.scale.setScalar(1 + breath * 0.045 + pulse * 0.12 + stateBoost * 0.08);
      innerHalo.scale.setScalar(1.02 + breath * 0.035 + pulse * 0.08);
      coreLight.intensity = 4 + safeIntensity / 15 + pulse * 2.8 + stateBoost * 2.2;

      if (!shouldReduce) {
        orb.rotation.y = time * (0.045 + safeSpeed / 1800);
        orb.rotation.x = Math.sin(time * 0.16) * 0.06;
        filamentGroup.rotation.z = -time * (0.032 + safeSpeed / 2600);
        filamentGroup.rotation.y = time * 0.026;
        particles.rotation.y = -time * 0.034;
        edgeShell.rotation.y = time * 0.05;
        glassShell.rotation.x = Math.sin(time * 0.11) * 0.035;
      }

      filamentMaterials.forEach((material, index) => {
        material.opacity = (index % 3 === 0 ? 0.28 : 0.12) + safeIntensity / (index % 3 === 0 ? 440 : 760) + pulse * 0.16;
      });

      renderer.render(scene, camera);
      if (!shouldReduce) raf = requestAnimationFrame(render);
    };

    render(performance.now());
    if (!shouldReduce) raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh | THREE.Line | THREE.Points;
        mesh.geometry?.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [hue, intensity, reducedMotion, shouldReduce, size, speed, state]);

  return (
    <button
      type="button"
      className={`wizard-orb-frame ${interactive ? "is-interactive" : ""} ${className}`}
      data-state={state}
      style={{ width: size, height: size }}
      aria-label="NeuralNexus Wizard Orb"
      onPointerDown={() => {
        if (interactive) touchPulseRef.current = performance.now() / 1000;
      }}
    >
      {webglUnavailable ? <span className="wizard-orb-static" aria-hidden="true" /> : <div ref={mountRef} aria-hidden="true" />}
    </button>
  );
}

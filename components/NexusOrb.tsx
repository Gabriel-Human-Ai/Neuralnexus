"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type OrbState = "idle" | "listening" | "thinking" | "responding" | "success";

type NexusOrbProps = {
  size?: number;
  state?: OrbState;
  interactive?: boolean;
  reducedMotion?: boolean;
  className?: string;
};

const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uSpeed;
  uniform float uFrequency;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position;
    float slow = noise(pos * uFrequency + vec3(uTime * uSpeed * 0.32));
    float fine = noise(pos * (uFrequency * 3.1) + vec3(-uTime * uSpeed * 0.78));
    float displacement = ((slow - 0.5) * 0.78 + (fine - 0.5) * 0.22) * uAmplitude;
    pos += normal * displacement;
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = `
  uniform float uEnergy;
  uniform float uFresnel;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  vec3 warm = vec3(0.784, 0.663, 0.416);
  vec3 charcoal = vec3(0.043, 0.051, 0.059);

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 3.0);
    float centerGlow = 1.0 - smoothstep(0.0, 1.35, length(vWorldPosition.xy));
    vec3 base = mix(charcoal, warm, centerGlow * (0.25 + uEnergy * 0.22));
    vec3 rim = warm * fresnel * uFresnel;
    float alpha = 0.36 + fresnel * 0.42 + centerGlow * 0.16;
    gl_FragColor = vec4(base + rim, alpha);
  }
`;

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

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export function NexusOrb({ size = 360, state = "idle", interactive = false, reducedMotion = false, className = "" }: NexusOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<OrbState>(state);
  const pulseRef = useRef(0);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (!canUseWebGL()) {
      setFallback(true);
      return;
    }

    const reduce = reducedMotion || prefersReducedMotion();
    const lowQuality = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4);
    const detail = lowQuality ? 24 : 48;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

    const uniforms = {
      uTime: { value: 0 },
      uAmplitude: { value: STATE_TARGETS[stateRef.current].amplitude },
      uSpeed: { value: STATE_TARGETS[stateRef.current].speed },
      uFrequency: { value: 1.9 },
      uEnergy: { value: STATE_TARGETS[stateRef.current].energy },
      uFresnel: { value: STATE_TARGETS[stateRef.current].fresnel },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, detail), material);
    scene.add(core);

    const halo = !lowQuality
      ? new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.06, 3),
          new THREE.MeshBasicMaterial({
            color: 0xc8a96a,
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
      core.rotation.y += reduce ? 0 : current.rotation / 60;
      core.rotation.x = stateRef.current === "listening" ? -0.03 : Math.sin(time * 0.16) * 0.025;
      if (halo) {
        halo.rotation.y -= reduce ? 0 : current.rotation / 75;
        halo.rotation.x += reduce ? 0 : current.rotation / 120;
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
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [reducedMotion, size]);

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

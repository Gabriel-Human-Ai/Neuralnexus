"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
// @ts-ignore — path differs across three.js versions
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createNoise3D } from "simplex-noise";

export type OrbTone = "frustriert" | "neugierig" | "ruhig" | "eilig" | "begeistert" | null;

export interface ResonanceOrbProps {
  size?: number;
  tone?: OrbTone;
  hue?: number;       // 0-360 color shift
  speed?: number;     // 0-100, maps to 0.001-0.02
  morph?: number;     // 0-100, displacement intensity
  glow?: number;      // 0-100, inner light intensity
}

export function ResonanceOrb({ size = 280, tone = null, hue = 0, speed = 20, morph = 50, glow = 60 }: ResonanceOrbProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // WebGL availability check
    try {
      const t = document.createElement("canvas");
      if (!t.getContext("webgl") && !t.getContext("experimental-webgl")) throw new Error("no webgl");
    } catch {
      el.innerHTML = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle at 38% 35%,#F1D9A8,#C9A05C 50%,#6B4A32);box-shadow:0 0 60px rgba(201,160,92,0.5)"></div>`;
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    el.appendChild(renderer.domElement);

    // Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    // Lighting — the key to photorealism
    const ambientLight = new THREE.AmbientLight(0xfff5e8, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e8, 1.8);
    keyLight.position.set(3, 5, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xb0c4ff, 0.4);
    rimLight.position.set(-3, -2, -3);
    scene.add(rimLight);

    const safeSpeed = isNaN(speed) || speed <= 0 ? 20 : speed;
    const safeMorph = isNaN(morph) || morph <= 0 ? 50 : morph;
    const safeGlow = isNaN(glow) || glow <= 0 ? 60 : glow;
    const safeHue = isNaN(hue) ? 0 : hue;

    // Map 0-100 settings to real values
    const speedFactor = 0.0002 + (safeSpeed / 100) * 0.006;
    const morphFactor = 0.04 + (safeMorph / 100) * 0.12;
    const glowIntensity = 0.5 + (safeGlow / 100) * 3.0;

    const hueColor = new THREE.Color(`hsl(${30 + safeHue}, 80%, 60%)`);
    const innerHueColor = new THREE.Color(`hsl(${20 + safeHue}, 90%, 68%)`);
    const lightHueColor = new THREE.Color(`hsl(${25 + safeHue}, 90%, 70%)`);

    const innerToneColor: Record<string, string> = {
      frustriert: `hsl(${10 + safeHue}, 80%, 60%)`,
      eilig: `hsl(${45 + safeHue}, 90%, 65%)`,
      neugierig: `hsl(${30 + safeHue}, 85%, 65%)`,
      ruhig: `hsl(${30 + safeHue}, 80%, 65%)`,
      begeistert: `hsl(${50 + safeHue}, 90%, 65%)`,
    };
    const coreColorStr = tone ? (innerToneColor[tone] ?? `hsl(${20+safeHue},90%,68%)`) : innerHueColor.getStyle();

    const coreGeo = new THREE.SphereGeometry(0.56, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({ color: coreColorStr, transparent: true, opacity: 0.92 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    const innerLight = new THREE.PointLight(lightHueColor, glowIntensity, 4, 2);
    innerLight.position.set(0, 0, 0);
    scene.add(innerLight);

    const shellGeo = new THREE.IcosahedronGeometry(1, 64);
    const origPositions = new Float32Array(shellGeo.attributes.position.array);

    const shellMat = new THREE.MeshPhysicalMaterial({
      transmission: 0.92,
      thickness: 1.3,
      roughness: 0.07,
      ior: 1.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      attenuationColor: hueColor,
      attenuationDistance: 1.6,
      transparent: true,
      side: THREE.FrontSide,
      envMapIntensity: 1.2,
    } as any);

    // PMREMGenerator for environment (makes transmission look photorealistic)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment()).texture;
    scene.environment = envTexture;
    shellMat.envMap = envTexture;
    pmrem.dispose();

    const shell = new THREE.Mesh(shellGeo, shellMat);
    scene.add(shell);

    // Noise
    const noise3D = createNoise3D();
    const pulseSpeed = speedFactor;
    let t_elapsed = 0;
    let frameId: number;

    const animate = (delta: number) => {
      frameId = requestAnimationFrame(animate);
      if (reduced) { renderer.render(scene, camera); return; }

      t_elapsed += delta * pulseSpeed;

      // Vertex displacement — extremely subtle organic breathing
      const pos = shellGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const ox = origPositions[i * 3];
        const oy = origPositions[i * 3 + 1];
        const oz = origPositions[i * 3 + 2];
        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const nx = ox / len, ny = oy / len, nz = oz / len;
        const disp = noise3D(ox * 0.85 + t_elapsed * 0.4, oy * 0.85, oz * 0.85) * morphFactor;
        pos.setXYZ(i, ox + nx * disp, oy + ny * disp, oz + nz * disp);
      }
      pos.needsUpdate = true;
      shellGeo.computeVertexNormals();

      // Rotation — tied to speed setting
      shell.rotation.y += delta * speedFactor * 0.18;
      shell.rotation.x = Math.sin(t_elapsed * 0.5) * 0.04;

      // Core breathe — tied to speed setting
      const s = 0.56 + Math.sin(t_elapsed * 0.3) * 0.012;
      core.scale.setScalar(s);
      core.rotation.y -= delta * speedFactor * 0.25;

      renderer.render(scene, camera);
    };

    let last = performance.now();
    const loop = (now: number) => {
      animate((now - last) / 1000);
      last = now;
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [size, tone, hue, speed, morph, glow]);

  return (
    <div
      key={`orb-${hue}-${speed}-${morph}-${glow}`}
      ref={mountRef}
      style={{ width: size, height: size, cursor: "default" }}
      aria-hidden="true"
    />
  );
}

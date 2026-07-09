"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { createOrbMaterial, createOrbUniforms } from "@/lib/orb-material";
import { claimWebGL, releaseWebGL, webglSupported } from "@/lib/webgl-guard";

type Rule = { id: string; text: string; status: string; sourceOutputId?: string | null; createdAt: string; provenance?: { stepName?: string } };

function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = Math.imul(31, h) + input.charCodeAt(i) | 0;
  return Math.abs(h);
}

export function GenomeConstellation({ rules, version, onRuleAction }: {
  rules: Rule[];
  version: number;
  onRuleAction: (id: string, action: "accept" | "reject") => Promise<void>;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nodeRefs = useRef<{ id: string; mesh: THREE.Mesh; baseRadius: number; targetRadius: number; uniforms: ReturnType<typeof createOrbUniforms>; status: string }[]>([]);
  const [hover, setHover] = useState<{ rule: Rule; x: number; y: number; actionable: boolean } | null>(null);
  const [webgl, setWebgl] = useState(true);
  const [reduced, setReduced] = useState(false);
  const visibleRules = useMemo(() => rules.filter((rule) => rule.status === "active" || rule.status === "proposed").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [rules]);
  const qualityLow = typeof navigator !== "undefined" && ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4));
  const cap = qualityLow ? 12 : 24;
  const renderedRules = visibleRules.slice(0, cap);
  const remainder = Math.max(0, visibleRules.length - renderedRules.length);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !webglSupported() || !claimWebGL("constellation")) {
      setWebgl(false);
      return;
    }
    setWebgl(true);
    const width = mount.clientWidth || 520;
    const height = mount.clientHeight || 280;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 20);
    camera.position.set(0, 0, 5.2);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    const warm = new THREE.PointLight(0xc8a96a, 0.6, 8);
    warm.position.set(2, 2, 2);
    scene.add(warm);
    const cool = new THREE.PointLight(0x24313a, 0.4, 8);
    cool.position.set(-2, -1.6, 1);
    scene.add(cool);

    const coreUniforms = createOrbUniforms({ uAmplitude: { value: 0.08 }, uSpeed: { value: 0.12 }, uFresnel: { value: 0.7 } });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, qualityLow ? 16 : 32), createOrbMaterial(coreUniforms));
    scene.add(core);
    const group = new THREE.Group();
    scene.add(group);
    const nodeGeometry = new THREE.IcosahedronGeometry(0.075, qualityLow ? 1 : 2);
    nodeRefs.current = renderedRules.map((rule, index) => {
      const active = rule.status === "active";
      const h = hash(rule.id);
      const angle = (index / Math.max(1, renderedRules.length)) * Math.PI * 2 + (h % 100) / 100;
      const radius = active ? 1.8 : 2.5;
      const uniforms = createOrbUniforms({ uAmplitude: { value: 0.005 }, uFresnel: { value: active ? 0.9 : 0.5 }, uEnergy: { value: active ? 0.62 : 0.32 } });
      const mesh = new THREE.Mesh(nodeGeometry, createOrbMaterial(uniforms));
      mesh.position.set(Math.cos(angle) * radius, ((h % 50) / 100) - 0.25, Math.sin(angle) * radius);
      mesh.userData.ruleId = rule.id;
      mesh.userData.rule = rule;
      mesh.scale.setScalar(active ? 1 : 0.9);
      group.add(mesh);
      return { id: rule.id, mesh, baseRadius: radius, targetRadius: radius, uniforms, status: rule.status };
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let raf = 0;
    let inside = true;
    let focus = true;
    let hidden = document.hidden;
    const render = (now = performance.now()) => {
      raf = 0;
      const time = now / 1000;
      coreUniforms.uTime.value = time;
      core.rotation.y -= reduced ? 0 : 0.02 / 60;
      group.rotation.y += reduced ? 0 : 0.05 / 60;
      nodeRefs.current.forEach((node, index) => {
        node.uniforms.uTime.value = time;
        if (node.status === "proposed" && !reduced) {
          const scale = 1 + Math.sin(time * (Math.PI * 2 / 5) + index) * 0.02;
          node.mesh.scale.setScalar(scale);
        }
      });
      renderer.render(scene, camera);
      if (!reduced && !hidden && inside && focus) raf = requestAnimationFrame(render);
    };
    const requestRender = () => { if (!raf) raf = requestAnimationFrame(render); };
    const onPointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(nodeRefs.current.map((node) => node.mesh))[0];
      if (hit) {
        const mesh = hit.object as THREE.Mesh;
        const rule = mesh.userData.rule as Rule;
        setHover({ rule, x: event.clientX - rect.left + 12, y: event.clientY - rect.top + 12, actionable: rule.status === "proposed" });
        mesh.scale.setScalar(1.15);
      } else {
        setHover(null);
      }
      requestRender();
    };
    const onVisibility = () => { hidden = document.hidden; requestRender(); };
    const onPointerEnter = () => { inside = true; requestRender(); };
    const onPointerLeave = () => { inside = false; window.setTimeout(() => { focus = mount.matches(":focus-within"); }, 2000); };
    const onFocus = () => { focus = true; requestRender(); };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerenter", onPointerEnter);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    mount.addEventListener("focusin", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    render();
    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerenter", onPointerEnter);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      mount.removeEventListener("focusin", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose();
      });
      nodeGeometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      rendererRef.current = null;
      releaseWebGL("constellation");
    };
  }, [qualityLow, reduced, renderedRules]);

  if (!webgl) return <div className="constellation-fallback" />;

  return (
    <div className="constellation-wrap">
      <div ref={mountRef} className="genome-constellation" aria-hidden="true" />
      <div className="constellation-version">v{version}</div>
      {remainder > 0 && <div className="constellation-more">+{remainder} more rules</div>}
      {hover && (
        <div className="constellation-label" style={{ left: hover.x, top: hover.y }}>
          <strong>{hover.rule.text}</strong>
          <small>{hover.rule.provenance?.stepName ? `Learned from "${hover.rule.provenance.stepName}"` : "Learned from an edit"} · {new Date(hover.rule.createdAt).toLocaleDateString()}</small>
          {hover.actionable && <div><button onClick={() => onRuleAction(hover.rule.id, "accept")}>Accept</button><button onClick={() => onRuleAction(hover.rule.id, "reject")}>Reject</button></div>}
        </div>
      )}
    </div>
  );
}

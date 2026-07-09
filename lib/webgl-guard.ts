type Claim = "orb" | "constellation";

let current: Claim | null = null;
const listeners = new Set<(c: Claim | null) => void>();
let activeContexts = 0;
let peakContexts = 0;

export function claimWebGL(who: Claim): boolean {
  if (current && current !== who) return false;
  current = who;
  activeContexts = 1;
  peakContexts = Math.max(peakContexts, activeContexts);
  listeners.forEach((listener) => listener(current));
  return true;
}

export function releaseWebGL(who: Claim) {
  if (current === who) {
    current = null;
    activeContexts = 0;
    listeners.forEach((listener) => listener(current));
  }
}

export function onWebGLChange(fn: (c: Claim | null) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function getWebGLGuardStats() {
  return { current, activeContexts, peakContexts };
}

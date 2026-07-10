"use client";

import { useEffect } from "react";

export function useTypingGlow() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (!target.matches("input, textarea, [contenteditable='true']")) return;

      const wrapper = target.closest<HTMLElement>(".aurora-focus");
      if (!wrapper) return;

      wrapper.style.setProperty("--af-boost", "0.15");
      wrapper.style.transition = "none";

      requestAnimationFrame(() => {
        wrapper.style.transition = "";
        wrapper.style.setProperty("--af-boost", "0");
      });
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type Theme = "light" | "dark" | "system";

function resolvedTheme(theme: Theme) {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(next: Theme, origin?: { x: number; y: number }) {
  const run = () => {
    const resolved = next === "system" ? resolvedTheme(next) : next;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeMode = next;
    localStorage.setItem("nn-theme", next);
    void fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ UI_THEME: next }),
    }).catch(() => {});
  };

  if (!origin || !document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    run();
    return;
  }
  document.documentElement.style.setProperty("--vt-x", `${origin.x}px`);
  document.documentElement.style.setProperty("--vt-y", `${origin.y}px`);
  document.startViewTransition(run);
}

export function ThemeToggle() {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = (localStorage.getItem("nn-theme") as Theme | null) || "system";
    setTheme(stored);
  }, []);

  const active = theme === "system" ? (typeof window !== "undefined" ? resolvedTheme("system") : "light") : theme;

  function toggle() {
    const next: Theme = active === "dark" ? "light" : "dark";
    const rect = ref.current?.getBoundingClientRect();
    setTheme(next);
    applyTheme(next, rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined);
  }

  return (
    <button ref={ref} className="theme-toggle" type="button" onClick={toggle} aria-label={`Switch to ${active === "dark" ? "light" : "dark"} theme`}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <mask id="nn-moon-mask">
          <rect width="24" height="24" fill="white" />
          <motion.circle animate={{ cx: active === "dark" ? 11 : 18, cy: active === "dark" ? 7 : -18, r: 7 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} fill="black" />
        </mask>
        <motion.g animate={{ opacity: active === "dark" ? 0 : 1, scale: active === "dark" ? 0.55 : 1 }} transition={{ duration: 0.24, staggerChildren: 0.02 }} transformOrigin="12px 12px">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((rotation) => (
            <line key={rotation} x1="12" y1="2.5" x2="12" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${rotation} 12 12)`} />
          ))}
        </motion.g>
        <motion.circle cx="12" cy="12" animate={{ r: active === "dark" ? 7 : 5 }} transition={{ type: "spring", stiffness: 280, damping: 26 }} fill="currentColor" mask="url(#nn-moon-mask)" />
      </svg>
    </button>
  );
}

export function ThemeSegmentedControl() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    setTheme((localStorage.getItem("nn-theme") as Theme | null) || "system");
  }, []);
  return (
    <div className="theme-segmented" role="group" aria-label="Appearance">
      {(["light", "dark", "system"] as Theme[]).map((item) => (
        <button
          key={item}
          type="button"
          className={theme === item ? "is-active" : ""}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setTheme(item);
            applyTheme(item, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          }}
        >
          {item[0].toUpperCase() + item.slice(1)}
        </button>
      ))}
    </div>
  );
}

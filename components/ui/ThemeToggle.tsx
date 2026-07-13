"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MOTION } from "@/lib/motion";

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
    document.documentElement.style.colorScheme = resolved;
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
  const maskId = useId();
  const [theme, setTheme] = useState<Theme>("dark");
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const stored = (localStorage.getItem("nn-theme") as Theme | null) || "dark";
    setTheme(stored);
  }, []);

  const active = theme === "system" ? (typeof window !== "undefined" ? resolvedTheme("system") : "light") : theme;
  const isDark = active === "dark";
  const iconTransition = reducedMotion ? { duration: 0 } : MOTION.springSoft;

  function toggle() {
    const next: Theme = active === "dark" ? "light" : "dark";
    const rect = ref.current?.getBoundingClientRect();
    setTheme(next);
    applyTheme(next, rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined);
  }

  return (
    <button ref={ref} className={`theme-toggle scenic-theme-toggle apple-theme-toggle is-${active}`} type="button" onClick={toggle} aria-label={`Switch to ${active === "dark" ? "light" : "dark"} theme`}>
      <motion.svg className="apple-theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <motion.circle cx={isDark ? 11 : 18} cy={isDark ? 7 : -18} r="7" fill="black" transition={iconTransition} />
        </mask>
        <motion.circle
          cx="12"
          cy="12"
          r={isDark ? 7 : 5}
          fill="currentColor"
          mask={`url(#${maskId})`}
          transition={iconTransition}
        />
        <motion.g className="apple-theme-rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round" animate={{ opacity: isDark ? 0 : 1 }} transition={reducedMotion ? { duration: 0 } : { duration: MOTION.fast }}>
          {[
            [12, 3, 12, 1],
            [12, 23, 12, 21],
            [3, 12, 1, 12],
            [23, 12, 21, 12],
            [5.64, 5.64, 4.22, 4.22],
            [19.78, 19.78, 18.36, 18.36],
            [18.36, 5.64, 19.78, 4.22],
            [4.22, 19.78, 5.64, 18.36],
          ].map(([x1, y1, x2, y2], index) => (
            <motion.line
              key={`${x1}-${y1}`}
              className="apple-theme-ray"
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              animate={{ scale: isDark ? 0 : 1, opacity: isDark ? 0 : 1 }}
              transition={reducedMotion ? { duration: 0 } : { ...MOTION.springSoft, delay: isDark ? 0 : index * 0.02 }}
            />
          ))}
        </motion.g>
      </motion.svg>
    </button>
  );
}

export function ThemeSegmentedControl() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    setTheme((localStorage.getItem("nn-theme") as Theme | null) || "dark");
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

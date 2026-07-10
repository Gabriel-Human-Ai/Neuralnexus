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
    <button ref={ref} className={`theme-toggle scenic-theme-toggle is-${active}`} type="button" onClick={toggle} aria-label={`Switch to ${active === "dark" ? "light" : "dark"} theme`}>
      <span className="scenic-theme-toggle__sky" aria-hidden="true">
        <motion.span className="scenic-theme-toggle__sun" animate={{ x: active === "dark" ? 34 : 0, y: active === "dark" ? 14 : 0, opacity: active === "dark" ? 0 : 1 }} transition={{ type: "spring", stiffness: 220, damping: 24 }} />
        <motion.span className="scenic-theme-toggle__moon" animate={{ x: active === "dark" ? 0 : -34, y: active === "dark" ? 0 : 12, opacity: active === "dark" ? 1 : 0 }} transition={{ type: "spring", stiffness: 220, damping: 24 }} />
        <span className="scenic-theme-toggle__stars" />
        <span className="scenic-theme-toggle__dune dune-a" />
        <span className="scenic-theme-toggle__dune dune-b" />
      </span>
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

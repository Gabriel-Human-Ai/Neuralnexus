"use client";
import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export function ContextMenu({ state, onClose }: { state: ContextMenuState | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onEsc);
    return () => { window.removeEventListener("mousedown", onClick); window.removeEventListener("keydown", onEsc); };
  }, [state, onClose]);

  if (!state) return null;
  const x = Math.min(state.x, window.innerWidth - 210);
  const y = Math.min(state.y, window.innerHeight - state.items.length * 40 - 20);

  return (
    <div ref={ref} className="fixed z-[70] glass-dark card ctx-menu p-1.5" style={{ left: x, top: y }}>
      {state.items.map((item, i) => (
        <button key={i} onClick={() => { item.onClick(); onClose(); }}
          className={`ctx-item hover:bg-white/10 ${item.danger ? "text-plum" : "text-snow"}`}>
          {item.icon && <span>{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}

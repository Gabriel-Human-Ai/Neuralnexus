"use client";

import type { ReactNode } from "react";

export function HeroCTA({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="hero-cta" onClick={onClick}>
      <span className="hero-cta__fill">{children}</span>
    </button>
  );
}

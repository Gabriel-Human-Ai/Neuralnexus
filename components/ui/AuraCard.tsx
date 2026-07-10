"use client";

import type { CSSProperties, ReactNode } from "react";

type AuraCardProps = {
  variant: "bloom" | "leak" | "fade" | "plain";
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
};

export function AuraCard({ variant, className = "", children, onClick, style }: AuraCardProps) {
  const classes = `aura-card nn-grain aura-${variant} ${className}`.trim();

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} style={style}>
        {variant === "leak" && <span className="edge" aria-hidden="true" />}
        <span className="aura-card__content">{children}</span>
      </button>
    );
  }

  return (
    <div className={classes} style={style}>
      {variant === "leak" && <span className="edge" aria-hidden="true" />}
      <div className="aura-card__content">{children}</div>
    </div>
  );
}

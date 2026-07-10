"use client";

type AuroraDiscProps = {
  size?: 20 | 24 | 32;
  className?: string;
  label?: string;
};

export function AuroraDisc({ size = 24, className = "", label }: AuroraDiscProps) {
  return (
    <span
      className={`aurora-disc aurora-disc-${size} ${className}`}
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}

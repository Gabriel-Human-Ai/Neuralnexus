"use client";

export function PresenceLine({ active }: { active: boolean }) {
  return <div className={`presence-line ${active ? "is-active" : ""}`} aria-hidden="true" />;
}

"use client";

export type AltitudeLevel = 1 | 2 | 3;

type AltitudeRailProps = {
  level: AltitudeLevel;
  onAscendTo: (level: AltitudeLevel) => void;
};

const LEVELS: { level: AltitudeLevel; label: string }[] = [
  { level: 3, label: "ORBIT" },
  { level: 2, label: "SYSTEM" },
  { level: 1, label: "CRAFT" },
];

export function AltitudeRail({ level, onAscendTo }: AltitudeRailProps) {
  return (
    <nav className="altitude-rail" aria-label="Altitude">
      {LEVELS.map((item) => {
        const current = item.level === level;
        const disabled = item.level < level;
        return (
          <button
            key={item.level}
            type="button"
            className={current ? "is-current" : ""}
            aria-current={current ? "step" : undefined}
            aria-label={item.label}
            title={item.label}
            disabled={disabled}
            onClick={() => onAscendTo(item.level)}
          >
            <span aria-hidden="true" />
            <em>{item.label}</em>
          </button>
        );
      })}
    </nav>
  );
}

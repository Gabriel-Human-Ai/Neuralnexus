"use client";

export type AltitudeLevel = 1 | 2 | 3;

type AltitudeRailProps = {
  level: AltitudeLevel;
  onAscendTo: (level: AltitudeLevel) => void;
};

const LEVELS: { level: AltitudeLevel; label: string; helper: string }[] = [
  { level: 3, label: "OVERVIEW", helper: "Choose what to do next" },
  { level: 2, label: "WORKSPACE", helper: "Work inside one system" },
  { level: 1, label: "FOCUS", helper: "Finish one output" },
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
            aria-label={`${item.label}: ${item.helper}`}
            title={`${item.label}: ${item.helper}`}
            disabled={disabled}
            onClick={() => onAscendTo(item.level)}
          >
            <span aria-hidden="true" />
            <em>
              <strong>{item.label}</strong>
              <small>{item.helper}</small>
            </em>
          </button>
        );
      })}
    </nav>
  );
}

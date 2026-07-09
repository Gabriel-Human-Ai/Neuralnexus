"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight } from "lucide-react";

type SlideActionProps = {
  label: string;
  onComplete: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  completed?: boolean;
  variant?: "primary" | "quiet";
  estimatedCost?: string;
  ariaLabel?: string;
  completionText?: string;
  className?: string;
};

export function PremiumSlideAction({
  label,
  onComplete,
  disabled = false,
  loading = false,
  completed = false,
  variant = "primary",
  estimatedCost,
  ariaLabel,
  completionText = "Complete",
  className = "",
}: SlideActionProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const firedRef = useRef(false);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(completed ? 1 : 0);
  const [dragging, setDragging] = useState(false);
  const [keyboardArmed, setKeyboardArmed] = useState(false);

  useEffect(() => {
    if (!completed && !loading) {
      firedRef.current = false;
      setProgress(0);
      setKeyboardArmed(false);
    }
    if (completed) setProgress(1);
  }, [completed, loading]);

  const complete = useCallback(() => {
    if (disabled || loading || completed || firedRef.current) return;
    firedRef.current = true;
    setProgress(1);
    void onComplete();
  }, [completed, disabled, loading, onComplete]);

  const updateFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setProgress(next);
  };

  const finishDrag = () => {
    draggingRef.current = false;
    setDragging(false);
    if (progress >= 0.85) complete();
    else setProgress(0);
  };

  return (
    <div className={`slide-action-wrap ${className}`}>
      <div
        ref={trackRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel ?? label}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        data-variant={variant}
        data-completed={completed ? "1" : "0"}
        className={`slide-action ${disabled ? "is-disabled" : ""} ${dragging ? "is-dragging" : ""}`}
        onPointerDown={(event) => {
          if (disabled || loading || completed) return;
          pointerIdRef.current = event.pointerId;
          draggingRef.current = true;
          setDragging(true);
          setKeyboardArmed(false);
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromClientX(event.clientX);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current || pointerIdRef.current !== event.pointerId) return;
          updateFromClientX(event.clientX);
        }}
        onPointerUp={(event) => {
          if (pointerIdRef.current === event.pointerId) finishDrag();
        }}
        onPointerCancel={(event) => {
          if (pointerIdRef.current === event.pointerId) {
            draggingRef.current = false;
            setDragging(false);
            setProgress(0);
          }
        }}
        onKeyDown={(event) => {
          if (disabled || loading || completed) return;
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (!keyboardArmed) {
            setKeyboardArmed(true);
            return;
          }
          complete();
        }}
        onBlur={() => setKeyboardArmed(false)}
      >
        <div className="slide-action-fill" style={{ width: `${progress * 100}%` }} />
        <div
          className="slide-action-knob"
          style={{ transform: `translateX(calc(${progress} * (var(--slide-width) - var(--knob-size) - 12px)))` }}
        >
          {loading ? <span className="slide-action-dots" aria-hidden="true"><i /><i /><i /></span> : completed ? <Check size={20} /> : <ChevronRight size={22} />}
        </div>
        <div className="slide-action-label">
          <span>{completed ? completionText : keyboardArmed ? "Press again to confirm" : label}</span>
          {estimatedCost && !completed && <small>{estimatedCost}</small>}
        </div>
        <div className="slide-action-hint" aria-hidden="true">
          <ChevronRight size={16} />
          <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
}

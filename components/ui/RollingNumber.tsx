"use client";

import { useEffect, useRef, useState } from "react";

export function RollingNumber({ value, prefix = "", suffix = "" }: { value: string | number; prefix?: string; suffix?: string }) {
  const text = String(value);
  const previous = useRef(text);
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (previous.current !== text) {
      previous.current = text;
      setRolling(true);
      const timeout = window.setTimeout(() => setRolling(false), 260);
      return () => window.clearTimeout(timeout);
    }
  }, [text]);
  return <span className={`rolling-number ${rolling ? "is-rolling" : ""}`}>{prefix}{text}{suffix}</span>;
}

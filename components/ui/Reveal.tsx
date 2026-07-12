"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { MOTION } from "@/lib/motion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
};

export function Reveal({ children, className, delay = 0, amount = 0.15 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node || typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: amount, rootMargin: "0px 0px -8%" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [amount, reducedMotion]);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={visible ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
      transition={{ duration: MOTION.descend, ease: MOTION.easeOut, delay }}
    >
      {children}
    </motion.div>
  );
}

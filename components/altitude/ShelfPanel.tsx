"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { ShelfId } from "@/components/altitude/ShelfDock";
import { MOTION } from "@/lib/motion";
import { motion, AnimatePresence } from "framer-motion";

type ShelfPanelProps = {
  shelf: ShelfId | null;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function ShelfPanel({ shelf, title, children, onClose }: ShelfPanelProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!shelf) return;
    const previous = document.activeElement as HTMLElement | null;
    window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => previous?.focus?.();
  }, [shelf]);

  return (
    <AnimatePresence>
      {shelf && (
        <div className="shelf-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.aside
            className="shelf-panel"
            role="dialog"
            aria-modal="false"
            aria-label={title}
            initial={{ x: -26, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -18, opacity: 0 }}
            transition={{ duration: MOTION.shelf, ease: MOTION.easeOut }}
          >
            <header className="shelf-panel-head">
              <span>{title}</span>
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Close shelf"><X size={16} /></button>
            </header>
            <div className="shelf-panel-body">
              {children}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

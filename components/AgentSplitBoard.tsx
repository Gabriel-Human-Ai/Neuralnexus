"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Circle } from "lucide-react";
import type { SubTask } from "@/lib/types";

export interface AgentSplitBoardProps {
  tasks: SubTask[];
  merged: boolean; // true once all done and merge animation should play
}

const STATUS_ICON: Record<SubTask["status"], React.ReactNode> = {
  pending: <Circle size={14} className="text-white/30" />,
  running: <Loader2 size={14} className="accent-text animate-spin" />,
  done: <Check size={14} className="text-white/80" />,
  failed: <Circle size={14} className="text-white/50" />,
};

export function AgentSplitBoard({ tasks, merged }: AgentSplitBoardProps) {
  return (
    <div className="relative flex flex-wrap gap-2">
      <AnimatePresence>
        {tasks.map((t, i) => (
          <motion.div
            key={t.id}
            layoutId={merged ? `subtask-${t.id}` : undefined}
            initial={{ opacity: 0, y: 8 }}
            animate={merged ? { opacity: 0, scale: 0.9 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30, delay: merged ? 0 : i * 0.04 }}
            className="glass card px-3 py-2 text-xs min-w-[140px]"
          >
            <div className="flex items-center gap-2 mb-1">
              {STATUS_ICON[t.status]}
              <span className="uppercase tracking-wide text-[10px] text-mist">{t.type}</span>
            </div>
            <div className="text-snow truncate">{t.prompt}</div>
            <div className="text-[10px] accent-text mt-1 font-mono">{t.assignedModel}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

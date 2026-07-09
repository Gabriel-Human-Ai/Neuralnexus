"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";

interface Command {
  id: string;
  label: string;
  group: string;
  icon?: string;
  action: () => void;
  shortcut?: string;
  argument?: string; // "speed", "hue", "model" etc. for args parsing
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  recent?: string[]; // recent command IDs
  onRecentUpdate?: (ids: string[]) => void;
}

// Simple fuzzy matcher
function fuzzyMatch(query: string, text: string): number {
  if (!query) return Infinity;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let score = 0;
  let queryIdx = 0;
  for (let i = 0; i < t.length && queryIdx < q.length; i++) {
    if (t[i] === q[queryIdx]) {
      score += 1 + (i === 0 ? 10 : 0); // bonus for start-of-string
      queryIdx++;
    }
  }
  return queryIdx === q.length ? score : Infinity;
}

export function CommandPalette({ open, onClose, commands, recent = [], onRecentUpdate }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filtered & sorted commands
  const filtered = commands
    .map(cmd => ({ ...cmd, score: fuzzyMatch(search, cmd.label + " " + cmd.group) }))
    .filter(cmd => cmd.score !== Infinity)
    .sort((a, b) => {
      // Prioritize recent
      const aRecent = recent.indexOf(a.id);
      const bRecent = recent.indexOf(b.id);
      if (aRecent !== -1 || bRecent !== -1) {
        if (aRecent === -1) return 1;
        if (bRecent === -1) return -1;
        return aRecent - bRecent;
      }
      return b.score - a.score;
    })
    .slice(0, 12);

  // Group by category
  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach(cmd => {
    if (!grouped[cmd.group]) grouped[cmd.group] = [];
    grouped[cmd.group].push(cmd);
  });
  const groups = Object.entries(grouped);

  // Flatten for keyboard nav
  const flat = groups.flatMap(([, cmds]) => cmds);

  useEffect(() => {
    setSelectedIdx(0);
  }, [search]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = flat[selectedIdx];
      if (cmd) {
        // Parse arguments: "modell grok" → call with "grok"
        const parts = search.toLowerCase().split(" ");
        if (parts.length > 1 && cmd.argument) {
          // Could pass argument to cmd.action here
          // For now, just execute
        }
        cmd.action();
        onRecentUpdate?.([cmd.id, ...recent.filter(id => id !== cmd.id)].slice(0, 3));
        onClose();
        setSearch("");
      }
    } else if (e.key === "Escape") {
      onClose();
      setSearch("");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm grid place-items-start pt-[20vh] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg glass-dark modal flex flex-col"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
              <Search size={16} className="text-mist" />
              <input
                ref={inputRef}
                autoFocus
                placeholder="Models, settings, actions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-snow placeholder-mist text-sm outline-none"
              />
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto flex-1 max-h-96">
              {flat.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-mist">
                  No commands found
                </div>
              ) : (
                groups.map(([group, cmds]) => (
                  <div key={group}>
                    <div className="text-[10px] uppercase tracking-widest text-mist px-4 py-1.5 bg-black/20">
                      {group}
                    </div>
                    {cmds.map((cmd, idx) => {
                      const flatIdx = flat.findIndex(c => c.id === cmd.id);
                      const isSelected = flatIdx === selectedIdx;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => {
                            cmd.action();
                            onRecentUpdate?.([cmd.id, ...recent.filter(id => id !== cmd.id)].slice(0, 3));
                            onClose();
                            setSearch("");
                          }}
                          className={`w-full text-left px-4 py-2 flex items-center justify-between transition-colors ${
                            isSelected
                              ? "accent-surface text-snow"
                              : "text-snow/80 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-sm">{cmd.label}</span>
                          {cmd.shortcut && (
                            <span className="text-[10px] font-mono text-mist">{cmd.shortcut}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer Hint */}
            <div className="px-4 py-2 border-t border-white/8 text-[10px] text-mist flex justify-between">
              <span>Enter Select</span>
              <span>Up/Down Navigate</span>
              <span>Esc Close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

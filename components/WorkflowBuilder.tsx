"use client";
import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { Play, GripVertical } from "lucide-react";

export interface WorkflowAgent { id: string; emoji: string; name: string }
export interface WorkflowBuilderProps {
  availableAgents: WorkflowAgent[];
  onRun: (orderedAgentIds: string[]) => Promise<void>;
  onSave: (name: string, orderedAgentIds: string[]) => Promise<void>;
}

export function WorkflowBuilder({ availableAgents, onRun, onSave }: WorkflowBuilderProps) {
  const [chain, setChain] = useState<WorkflowAgent[]>([]);
  const [name, setName] = useState("");
  const [running, setRunning] = useState(false);

  const add = (a: WorkflowAgent) => { if (!chain.find(c => c.id === a.id)) setChain(c => [...c, a]); };
  const remove = (id: string) => setChain(c => c.filter(a => a.id !== id));
  const run = async () => { setRunning(true); await onRun(chain.map(a => a.id)); setRunning(false); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {availableAgents.map(a => (
          <button key={a.id} onClick={() => add(a)} className="glass-input pill px-3 py-1 text-xs text-snow">
            {a.emoji} {a.name}
          </button>
        ))}
      </div>

      <Reorder.Group axis="y" values={chain} onReorder={setChain} className="space-y-1.5">
        {chain.map((a, i) => (
          <Reorder.Item key={a.id} value={a}>
            <motion.div layout className="glass card px-3 py-2 flex items-center gap-2 text-sm cursor-grab active:cursor-grabbing">
              <GripVertical size={14} className="text-mist" />
              <span className="text-plum text-xs w-4">{i + 1}</span>
              <span className="text-snow flex-1">{a.emoji} {a.name}</span>
              <button onClick={() => remove(a.id)} className="text-mist hover:text-plum text-xs">✕</button>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {chain.length > 0 && (
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Workflow-Name…"
            className="flex-1 glass-input pill px-4 py-2 text-sm outline-none" />
          <button onClick={() => onSave(name || "Workflow", chain.map(a => a.id))}
            className="px-4 py-2 pill glass-input text-sm text-snow">Speichern</button>
          <button onClick={run} disabled={running}
            className="px-4 py-2 pill bg-violet text-white text-sm flex items-center gap-1.5 disabled:opacity-40">
            <Play size={14} /> {running ? "Läuft…" : "Ausführen"}
          </button>
        </div>
      )}
    </div>
  );
}

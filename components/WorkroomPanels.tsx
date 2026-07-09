"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { WorkroomStep } from "./SpatialWorkroom";

// ===== Usage Tracking Panel — real per-model spend from actual ModelRun rows =====
export function UsageTrackingPanel({ runs }: { runs: { model: string; costUsd: number }[] }) {
  const byModel: Record<string, number> = {};
  for (const r of runs) byModel[r.model] = (byModel[r.model] ?? 0) + r.costUsd;
  const total = Object.values(byModel).reduce((a, b) => a + b, 0) || 0.0001;
  const rows = Object.entries(byModel).sort((a, b) => b[1] - a[1]);

  return (
    <div className="glass card p-3.5">
      <div className="text-[11px] uppercase tracking-widest text-mist font-mono mb-2">Usage Tracking</div>
      {rows.length === 0 && <div className="text-xs text-mist">No runs yet.</div>}
      <div className="space-y-2">
        {rows.map(([model, cost]) => {
          const pct = Math.round((cost / total) * 100);
          return (
            <div key={model} className="text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-snow truncate"><span className="w-1.5 h-1.5 rounded-full accent-text" style={{ background: "currentColor" }} />{model}</span>
                <span className="font-mono text-mist shrink-0 ml-2">{pct}% · ${cost.toFixed(3)}</span>
              </div>
              <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                <motion.div className="h-full accent-text" style={{ background: "currentColor" }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Smart Model Choice Panel — explains the REAL routing decision for the last step =====
export function SmartModelChoicePanel({ lastStep, threshold }: { lastStep: WorkroomStep | null; threshold: number }) {
  if (!lastStep) return (
    <div className="glass card p-3.5">
      <div className="text-[11px] uppercase tracking-widest text-mist font-mono mb-1">Smart Model Choice</div>
      <div className="text-xs text-mist">No decision yet.</div>
    </div>
  );
  const isCheap = /mini|haiku|glm|deepseek/i.test(lastStep.model);
  return (
    <div className="glass card p-3.5">
      <div className="text-[11px] uppercase tracking-widest text-mist font-mono mb-1">Smart Model Choice</div>
      <div className="text-sm text-snow font-medium mb-2">{lastStep.model}</div>
      <div className="text-xs text-mist space-y-1 font-mono">
        <div>Agent: {lastStep.agentName}</div>
        <div>Routing threshold: {threshold}% quality</div>
        <div>Cost for this request: ${lastStep.costUsd.toFixed(4)}</div>
      </div>
      <div className={`mt-2.5 px-2.5 py-1.5 rounded text-[11px] ${isCheap ? "accent-surface accent-text" : "bg-white/5 text-mist border border-white/10"}`}>
        {isCheap ? "Lowest suitable model selected." : "Stronger model selected (quality priority)."}
      </div>
    </div>
  );
}

// ===== Human Control Panel — only "Approvals" is real (tied to budget gate); rest honestly at 0 =====
export function HumanControlPanel({ approvalsPending, onOpen }: { approvalsPending: number; onOpen: () => void }) {
  const rows: [string, number][] = [["Approvals", approvalsPending], ["Edits", 0], ["Decisions", 0], ["Escalations", 0]];
  return (
    <div className="glass card p-3.5">
      <div className="text-[11px] uppercase tracking-widest text-mist font-mono mb-2">Human Control</div>
      <div className="space-y-1.5 mb-3">
        {rows.map(([label, n]) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-mist">{label}</span>
            <span className={n > 0 ? "accent-text font-medium" : "text-mist"}>{n > 0 ? `${n} pending` : "0"}</span>
          </div>
        ))}
      </div>
      <button onClick={onOpen} disabled={approvalsPending === 0}
        className="w-full glass-input py-1.5 text-xs text-snow disabled:opacity-30">Open Control Center</button>
    </div>
  );
}

// ===== Security Gate status — mirrors the real budget-guard ratio (only real gate we have) =====
export function SecurityGatePanel({ gateStatus, ratio }: { gateStatus: "green" | "amber" | "red"; ratio: number }) {
  const label = gateStatus === "red" ? "Blocked" : gateStatus === "amber" ? "Approval needed" : "No approval needed";
  const color = gateStatus === "red" ? "#E5544C" : gateStatus === "amber" ? "#E8B84B" : "#5FCB7A";
  return (
    <div className="glass card p-3.5">
      <div className="text-[11px] uppercase tracking-widest text-mist font-mono mb-2">Security Gate</div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
        <span className="text-sm text-snow">{label}</span>
      </div>
      <div className="text-xs text-mist font-mono">Budget usage: {Math.round(ratio * 100)}%</div>
    </div>
  );
}

// ===== Action Request Modal — the one real gate-worthy event in this app: budget hitting its limit =====
export function ActionRequestModal({ open, onClose, onAdjustBudget }: { open: boolean; onClose: () => void; onAdjustBudget: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm grid place-items-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          onClick={onClose}>
          <motion.div className="glass-dark modal p-5 max-w-sm w-full"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            onClick={e => e.stopPropagation()}>
            <div className="text-sm font-medium text-snow mb-3">Action Request</div>
            <div className="text-xs text-mist mb-3">
              Cost Guard switched to the lowest-cost model because your budget limit was reached.
            </div>
            <div className="text-xs text-snow mb-1 font-mono">Reason: budget limit reached</div>
            <div className="text-xs text-snow mb-4 font-mono">Effect: all further requests use the lowest-cost model</div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 glass-input py-2 text-xs text-snow">Understood</button>
              <button onClick={onAdjustBudget} className="flex-1 accent-solid py-2 rounded text-xs font-medium">Adjust budget</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ===== Bottom Event Log — real steps as they execute =====
export function WorkroomEventLog({ steps, budgetWarning }: { steps: WorkroomStep[]; budgetWarning?: string }) {
  const now = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const lines = [
    ...steps.map(s => ({ t: now(), level: "SUCCESS", text: `${s.agentName} → ${s.model} · $${s.costUsd.toFixed(4)}` })),
    ...(budgetWarning ? [{ t: now(), level: "WARN", text: budgetWarning }] : []),
  ];
  const levelColor: Record<string, string> = { SUCCESS: "#5FCB7A", WARN: "#E8B84B", INFO: "rgba(255,255,255,0.5)", ERROR: "#E5544C" };
  return (
    <div className="glass card p-3 font-mono text-[11px] max-h-32 overflow-y-auto space-y-1">
      {lines.length === 0 && <div className="text-mist">No events yet.</div>}
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-mist shrink-0">{l.t}</span>
          <span className="shrink-0" style={{ color: levelColor[l.level] }}>[{l.level}]</span>
          <span className="text-snow truncate">{l.text}</span>
        </div>
      ))}
    </div>
  );
}

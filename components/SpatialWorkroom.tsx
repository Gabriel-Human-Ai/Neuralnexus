"use client";
import { motion, AnimatePresence } from "framer-motion";
import { STATIONS, ROLE_COLOR, ROLE_LABEL, ROLE_STATION, FLOW_COLOR, inferRole, type WorkroomRole, type StationId } from "@/lib/workroom";

export interface WorkroomStep {
  agentId: string;
  agentName: string;
  workroomRole: string | null;
  model: string;
  output: string;
  costUsd: number;
}

export interface SpatialWorkroomProps {
  steps: WorkroomStep[];
  activeStepIndex: number | null; // null = idle, no run in progress or finished
  running: boolean;
  gateStatus: "green" | "amber" | "red"; // real budget-guard state
}

function stationXY(id: StationId) {
  const s = STATIONS.find(x => x.id === id)!;
  return { x: s.x, y: s.y };
}

// Compact 3D-ish mini robot: rounded body, black visor, two soft eyes. No limbs beyond short stubs, no face beyond eyes.
function AgentFigure({ role, working }: { role: WorkroomRole; working: boolean }) {
  const color = ROLE_COLOR[role];
  return (
    <motion.svg width="34" height="40" viewBox="0 0 34 40" animate={working ? { y: [0, -2, 0] } : { y: 0 }}
      transition={working ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}>
      {/* soft ground shadow */}
      <ellipse cx="17" cy="37" rx="9" ry="2.5" fill="rgba(0,0,0,0.25)" />
      {/* legs */}
      <rect x="10" y="27" width="5" height="8" rx="2.5" fill={color} />
      <rect x="19" y="27" width="5" height="8" rx="2.5" fill={color} />
      {/* body */}
      <rect x="6" y="10" width="22" height="20" rx="10" fill={color} />
      {/* arms */}
      <rect x="1" y="14" width="6" height="4.5" rx="2.25" fill={color} />
      <rect x="27" y="14" width="6" height="4.5" rx="2.25" fill={color} />
      {/* visor */}
      <rect x="10" y="15" width="14" height="8" rx="4" fill="#0A0B0D" />
      {/* eyes */}
      <circle cx="14.5" cy="19" r="1.4" fill="#EDEDED" opacity="0.9" />
      <circle cx="19.5" cy="19" r="1.4" fill="#EDEDED" opacity="0.9" />
    </motion.svg>
  );
}

function LabelCard({ title, sub, dotColor }: { title: string; sub: string; dotColor?: string }) {
  return (
    <div className="glass-dark card px-2.5 py-1.5 text-[10.5px] leading-tight whitespace-nowrap">
      <div className="flex items-center gap-1.5 font-medium text-snow">
        {dotColor && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />}
        {title}
      </div>
      <div className="text-mist truncate max-w-[160px]">{sub}</div>
    </div>
  );
}

function StationShape({ id }: { id: StationId }) {
  const base = "rounded-md bg-[#E7E4DD] shadow-[0_6px_14px_rgba(0,0,0,0.25)] border border-black/10 flex items-center justify-center";
  const icon = "stroke-black/45";
  switch (id) {
    case "hub":
      return (
        <div className="w-14 h-14 rounded-full bg-[#E7E5E0] border-2 border-[#4C8FF0]/60 shadow-[0_6px_16px_rgba(0,0,0,0.25)] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="6" fill="none" className={icon} strokeWidth="1.4" /><circle cx="10" cy="10" r="1.6" fill="#4C8FF0" /></svg>
        </div>
      );
    case "whiteboard":
      return (
        <div className={`w-12 h-9 ${base}`}>
          <svg width="26" height="18" viewBox="0 0 26 18"><line x1="3" y1="4" x2="15" y2="4" className={icon} strokeWidth="1.4" /><line x1="3" y1="9" x2="20" y2="9" className={icon} strokeWidth="1.4" /><path d="M3 14 L10 14 L8 11" fill="none" className={icon} strokeWidth="1.4" /></svg>
        </div>
      );
    case "vault":
      return (
        <div className={`w-10 h-10 ${base}`}>
          <svg width="20" height="20" viewBox="0 0 20 20"><rect x="4" y="3" width="12" height="14" rx="1.5" fill="none" className={icon} strokeWidth="1.4" /><circle cx="12" cy="10" r="1.4" fill="none" className={icon} strokeWidth="1.4" /></svg>
        </div>
      );
    case "desk":
      return (
        <div className={`w-14 h-8 ${base}`}>
          <svg width="30" height="16" viewBox="0 0 30 16"><rect x="9" y="2" width="12" height="8" rx="1" fill="none" className={icon} strokeWidth="1.4" /><line x1="4" y1="13" x2="26" y2="13" className={icon} strokeWidth="1.4" /></svg>
        </div>
      );
    case "skilllibrary":
      return (
        <div className={`w-11 h-11 ${base}`}>
          <svg width="22" height="22" viewBox="0 0 22 22"><line x1="4" y1="5" x2="18" y2="5" className={icon} strokeWidth="1.4" /><line x1="4" y1="11" x2="18" y2="11" className={icon} strokeWidth="1.4" /><line x1="4" y1="17" x2="18" y2="17" className={icon} strokeWidth="1.4" /></svg>
        </div>
      );
    case "designboard":
      return (
        <div className={`w-11 h-9 ${base}`}>
          <svg width="24" height="18" viewBox="0 0 24 18"><rect x="3" y="3" width="7" height="5" rx="1" className={icon} strokeWidth="1.2" fill="none" /><rect x="13" y="3" width="7" height="5" rx="1" className={icon} strokeWidth="1.2" fill="none" /><rect x="3" y="10" width="7" height="5" rx="1" className={icon} strokeWidth="1.2" fill="none" /><rect x="13" y="10" width="7" height="5" rx="1" className={icon} strokeWidth="1.2" fill="none" /></svg>
        </div>
      );
    case "kanban":
      return (
        <div className={`w-14 h-10 ${base}`}>
          <svg width="30" height="20" viewBox="0 0 30 20">{[2, 9, 16, 23].map(x => <rect key={x} x={x} y="3" width="5" height="14" rx="1" className={icon} strokeWidth="1.2" fill="none" />)}</svg>
        </div>
      );
    case "gate":
      return (
        <div className={`w-10 h-11 ${base}`}>
          <svg width="20" height="22" viewBox="0 0 20 22"><line x1="4" y1="3" x2="4" y2="19" className={icon} strokeWidth="1.6" /><line x1="16" y1="3" x2="16" y2="19" className={icon} strokeWidth="1.6" /><line x1="4" y1="8" x2="16" y2="8" className={icon} strokeWidth="1.4" /></svg>
        </div>
      );
  }
}

export function SpatialWorkroom({ steps, activeStepIndex, running, gateStatus }: SpatialWorkroomProps) {
  const gateColor = gateStatus === "red" ? FLOW_COLOR.blocker : gateStatus === "amber" ? FLOW_COLOR.approval : "#5FCB7A";

  // Which agent (by role/station) is present at each point in the replay, up to activeStepIndex.
  const visibleSteps = activeStepIndex === null ? steps : steps.slice(0, activeStepIndex + 1);
  const current = activeStepIndex !== null ? steps[activeStepIndex] : null;
  const prevStation = activeStepIndex && activeStepIndex > 0 ? ROLE_STATION[inferRole({ workroomRole: steps[activeStepIndex - 1].workroomRole, name: steps[activeStepIndex - 1].agentName })] : "hub";
  const currentStation = current ? ROLE_STATION[inferRole({ workroomRole: current.workroomRole, name: current.agentName })] : null;

  return (
    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-[#0A0B0D] border border-white/10">
      {/* Isometric stage: floor diamond + two back walls that share its exact top edges (no separate/mismatched transform layer) */}
      <svg className="absolute inset-[8%] w-[84%] h-[84%] overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* left wall — rises from the floor's left→top edge */}
        <polygon points="10,45 50,15 50,-3 10,27" fill="#EAE7E0" />
        {/* right wall — rises from the floor's top→right edge */}
        <polygon points="50,15 90,45 90,27 50,-3" fill="#E2DFD7" />
        {/* floor */}
        <polygon points="10,45 50,15 90,45 50,78" fill="#DAD7D0" />
      </svg>

      {/* Data flow line: only the current handoff is ever shown */}
      {currentStation && running && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {(() => {
            const from = stationXY(prevStation as StationId);
            const to = stationXY(currentStation);
            const midX = (from.x + to.x) / 2, midY = Math.min(from.y, to.y) - 8;
            return (
              <motion.path
                d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                fill="none" stroke={FLOW_COLOR.handoff} strokeWidth="0.5" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.8 }}
                transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
              />
            );
          })()}
        </svg>
      )}

      {/* Stations */}
      {STATIONS.map(st => (
        <div key={st.id} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
          style={{ left: `${st.x}%`, top: `${st.y}%` }}>
          <div className="mb-1"><StationShape id={st.id} /></div>
          {st.id === "gate" && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: gateColor, boxShadow: `0 0 6px ${gateColor}` }} />
          )}
          <div className="opacity-70"><LabelCard title={st.label} sub={st.sub} /></div>
        </div>
      ))}

      {/* Orchestrator — always at the Hub while a workflow runs */}
      {running && (
        <div className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center" style={{ left: `${stationXY("hub").x}%`, top: `${stationXY("hub").y - 6}%` }}>
          <AgentFigure role="orchestrator" working />
          <LabelCard title={ROLE_LABEL.orchestrator} sub="Coordinating agents and workflow" dotColor={ROLE_COLOR.orchestrator} />
        </div>
      )}

      {/* Real agent figures — one per completed/active step, parked at its role's station */}
      <AnimatePresence>
        {visibleSteps.map((step, i) => {
          const role = inferRole({ workroomRole: step.workroomRole, name: step.agentName });
          const station = stationXY(ROLE_STATION[role]);
          const isActive = i === activeStepIndex;
          return (
            <motion.div key={step.agentId + i}
              className="absolute -translate-x-1/2 -translate-y-[130%] flex flex-col items-center z-10"
              style={{ left: `${station.x + (i % 2 === 0 ? -4 : 4)}%`, top: `${station.y}%` }}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}>
              <AgentFigure role={role} working={isActive} />
              <LabelCard
                title={`${ROLE_LABEL[role]} · ${step.agentName}`}
                sub={isActive ? (running ? "Arbeitet…" : step.output.slice(0, 46) + (step.output.length > 46 ? "…" : "")) : "Fertig"}
                dotColor={ROLE_COLOR[role]}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

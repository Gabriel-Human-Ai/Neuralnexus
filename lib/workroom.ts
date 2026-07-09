// Spatial Agent Workroom — shared constants. Every color/position here is referenced
// by SpatialWorkroom.tsx and the right-column panels, kept in one place on purpose.

export type WorkroomRole = "orchestrator" | "planner" | "research" | "builder" | "reviewer" | "monitor" | "security" | "costguard";

export const ROLE_COLOR: Record<WorkroomRole, string> = {
  orchestrator: "#F5923E", // orange
  planner: "#E8D24B",      // yellow
  research: "#5FCB7A",     // green
  builder: "#4C8FF0",      // blue
  reviewer: "#A06BE0",     // violet
  monitor: "#E5544C",      // red
  security: "#3FD0DE",     // cyan
  costguard: "#2FBF8A",    // emerald
};

export const ROLE_LABEL: Record<WorkroomRole, string> = {
  orchestrator: "Orchestrator", planner: "Planner", research: "Research", builder: "Builder",
  reviewer: "Reviewer", monitor: "Monitor", security: "Security", costguard: "Cost Guard",
};

// Best-effort role inference for agents that haven't been tagged with workroomRole yet.
export function inferRole(agent: { workroomRole?: string | null; name: string; role?: string }): WorkroomRole {
  if (agent.workroomRole) return agent.workroomRole as WorkroomRole;
  const s = `${agent.name} ${agent.role ?? ""}`.toLowerCase();
  if (s.includes("research")) return "research";
  if (s.includes("writ") || s.includes("build") || s.includes("code")) return "builder";
  if (s.includes("review") || s.includes("critic")) return "reviewer";
  if (s.includes("plan")) return "planner";
  if (s.includes("monitor")) return "monitor";
  if (s.includes("secur")) return "security";
  if (s.includes("cost") || s.includes("budget")) return "costguard";
  return "builder"; // default: most starter agents execute work
}

export type StationId = "hub" | "whiteboard" | "vault" | "desk" | "skilllibrary" | "designboard" | "kanban" | "gate";

// Fixed isometric positions in a 0–100 stage-percentage grid (x = left-right, y = depth/front-back).
export const STATIONS: { id: StationId; label: string; sub: string; x: number; y: number }[] = [
  { id: "hub", label: "Orchestration Hub", sub: "Coordinating agents and workflow", x: 50, y: 46 },
  { id: "whiteboard", label: "Whiteboard", sub: "Ideas & Planning", x: 16, y: 20 },
  { id: "vault", label: "Vault", sub: "Secure Storage", x: 14, y: 46 },
  { id: "desk", label: "Desk 01", sub: "Active Work", x: 50, y: 78 },
  { id: "skilllibrary", label: "Skill Library", sub: "Reusable Skills", x: 82, y: 18 },
  { id: "designboard", label: "Design Board", sub: "Creative Review", x: 84, y: 34 },
  { id: "kanban", label: "Kanban Wall", sub: "Work Items", x: 86, y: 58 },
  { id: "gate", label: "Security Gate", sub: "Access Control", x: 78, y: 82 },
];

// Which station a role naturally stands at while working.
export const ROLE_STATION: Record<WorkroomRole, StationId> = {
  orchestrator: "hub", planner: "whiteboard", research: "vault", builder: "desk",
  reviewer: "kanban", monitor: "hub", security: "gate", costguard: "gate",
};

export type FlowType = "context" | "handoff" | "approval" | "blocker" | "review";
export const FLOW_COLOR: Record<FlowType, string> = {
  context: "#4C8FF0", handoff: "#5FCB7A", approval: "#E8B84B", blocker: "#E5544C", review: "#A06BE0",
};

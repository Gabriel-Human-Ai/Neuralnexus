"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  Database,
  Download,
  Eye,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Layers3,
  Lock,
  Menu,
  MessageCircle,
  Mic,
  PencilLine,
  Plus,
  RefreshCcw,
  Settings,
  Sparkles,
  Upload,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { PremiumSlideAction } from "@/components/PremiumSlideAction";
import { WhySheet } from "@/components/WhySheet";
import { AutopilotCard } from "@/components/features/AutopilotCard";
import { VaultIntro } from "@/components/features/VaultIntro";
import { ExtractorSheet } from "@/components/features/ExtractorSheet";
import { OutputCard, type OutputCardOutput } from "@/components/features/OutputCard";
import type { WizardIntent } from "@/lib/wizardActions";
import { nextBestAction } from "@/lib/guidance";
import { MOTION } from "@/lib/motion";
import { POSITIONING_UI } from "@/lib/positioning";
import { CopyButton } from "@/components/ui/CopyButton";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { AuroraDisc } from "@/components/ui/AuroraDisc";
import { AuraCard } from "@/components/ui/AuraCard";
import { HeroCTA } from "@/components/ui/HeroCTA";
import { NexusIsland } from "@/components/ui/NexusIsland";
import { ThemeSegmentedControl, ThemeToggle } from "@/components/ui/ThemeToggle";
import { MessageActions, type ChatFeedbackSignal } from "@/components/chat/MessageActions";
import { useTypingGlow } from "@/lib/useTypingGlow";
import type { AltitudeLevel } from "@/components/altitude/AltitudeRail";
import { ShelfDock, type ShelfId } from "@/components/altitude/ShelfDock";
import { ShelfPanel } from "@/components/altitude/ShelfPanel";
import { PresenceLine } from "@/components/altitude/PresenceLine";
import { DecisionStream, type StreamItem } from "@/components/altitude/DecisionStream";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

const SettingsModal = dynamic(() => import("@/components/SettingsModal").then((module) => module.SettingsModal), {
  ssr: false,
});
const WizardOrb = dynamic(() => import("@/components/WizardOrb").then((module) => module.WizardOrb), {
  ssr: false,
  loading: () => <div className="wizard-orb-fallback" aria-hidden="true" />,
});
const GenomePanel = dynamic(() => import("@/components/features/GenomePanel").then((module) => module.GenomePanel), { ssr: false });
const EyeView = dynamic(() => import("@/components/features/EyeView").then((module) => module.EyeView), { ssr: false });
const Crucible = dynamic(() => import("@/components/immersive/Crucible").then((module) => module.Crucible), { ssr: false });
const LineageCanvas = dynamic(() => import("@/components/immersive/LineageCanvas").then((module) => module.LineageCanvas), { ssr: false });
const WorkflowSpine = dynamic(() => import("@/components/immersive/WorkflowSpine").then((module) => module.WorkflowSpine), { ssr: false });

type Project = {
  id: string;
  name: string;
  goal?: string;
  rules?: string;
  createdAt?: string;
  messages?: { content: string; createdAt: string }[];
};

type Skill = {
  id: string;
  name: string;
  description: string;
  instructions?: string;
  version?: number;
};

type ModelRun = {
  id?: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  createdAt?: string;
};

type WorkspaceMode = {
  id: string;
  label: string;
  purpose: string;
  audience: string;
  steps: string[];
  skills: string[];
  output: string;
};

type View = "home" | "chat" | "workspaces" | "skills" | "eye" | "templates" | "knowledge" | "usage" | "settings";
type WorkspacePanel = "overview" | "workflow" | "outputs" | "client";
type StartPath = "ask" | "build" | "improve";
type AltitudeState = { level: AltitudeLevel; workspaceId?: string; focusId?: string };
type PublicPage = "home" | "enterprise" | "pricing" | "security";
type PublicMenu = "solutions" | "resources" | null;
type CommandItem = {
  id: string;
  label: string;
  group: string;
  hint: string;
  action: () => void;
};
type WorkspaceWizardStep = "type" | "audience" | "source" | "purpose" | "review";
type UploadedSource = {
  id: string;
  name: string;
  kind: "text" | "image" | "pdf" | "file";
  size: number;
  preview?: string;
  dataUrl?: string;
};
type GeneralChatMessage = {
  role: "user" | "assistant";
  content: string;
  model?: string;
};
type ChatFeedbackState = Record<string, ChatFeedbackSignal[]>;
type OutputListItem = {
  id: string;
  stepName: string;
  status: string;
  model: string;
  provider?: string;
  costUsd: number;
  skillVersion: number;
  finalContent?: string;
  draftContent?: string;
  knowledgeIds?: string;
  qualityReport?: string;
  claimsJson?: string;
  createdAt: string;
  preview?: string;
  parentOutputId?: string | null;
  forkChangedVariable?: string | null;
};

type TruthMap = {
  totalCorrections: number;
  byModel: { model: string; count: number; topWarnings: string[] }[];
  activeGuards: number;
};

const workspaceModes: WorkspaceMode[] = [
  {
    id: "content",
    label: "CONTENT SYSTEM",
    purpose: "Build repeatable content workflows from your method.",
    audience: "Creators, operators and small teams",
    steps: ["Capture method", "Generate angles", "Build scripts", "Plan calendar", "Review output"],
    skills: ["Hook Architect", "Script Builder", "Editorial Critic"],
    output: "Ideas, hooks, scripts and content calendars",
  },
  {
    id: "brand",
    label: "BRAND STRATEGY",
    purpose: "Turn positioning into a guided AI workspace.",
    audience: "Founders, designers and consultants",
    steps: ["Define audience", "Clarify offer", "Shape voice", "Audit market", "Build launch angles"],
    skills: ["Brand Strategist", "Offer Architect", "Copy Critic"],
    output: "Positioning, voice, offer and content direction",
  },
  {
    id: "review",
    label: "DESIGN REVIEW",
    purpose: "Create a reusable critique system for visual work.",
    audience: "Designers, agencies and product teams",
    steps: ["Collect context", "Inspect hierarchy", "Review trust signals", "Prioritize fixes", "Package feedback"],
    skills: ["Design Critic", "UX Reviewer", "Conversion Editor"],
    output: "Structured design audits and improvement plans",
  },
  {
    id: "coaching",
    label: "COACHING PRODUCT",
    purpose: "Transform a framework into a client-ready AI product.",
    audience: "Coaches, educators and course sellers",
    steps: ["Map framework", "Ask diagnostics", "Generate plan", "Create exercises", "Finalize recap"],
    skills: ["Framework Mapper", "Question Designer", "Action Coach"],
    output: "Guided sessions, exercises and client recaps",
  },
  {
    id: "audit",
    label: "AGENCY AUDIT",
    purpose: "Run repeatable client audits with your own method.",
    audience: "Agencies and strategic service providers",
    steps: ["Gather client inputs", "Score current state", "Find gaps", "Recommend fixes", "Prepare summary"],
    skills: ["Audit Lead", "Evidence Analyst", "Priority Planner"],
    output: "Client audits, action plans and executive summaries",
  },
  {
    id: "research",
    label: "RESEARCH ENGINE",
    purpose: "Structure deep research and strategic decisions.",
    audience: "Founders, analysts and product teams",
    steps: ["Frame question", "Collect sources", "Extract patterns", "Compare options", "Write decision brief"],
    skills: ["Research Analyst", "Synthesis Lead", "Decision Writer"],
    output: "Research briefs, tradeoffs and decisions",
  },
];

const templateCards = [
  {
    category: "TEMPLATE",
    name: "Content System Builder",
    forWho: "For creators selling methods, hooks and scripts.",
    produces: "Turns content knowledge into repeatable ideas, scripts and calendars.",
  },
  {
    category: "TEMPLATE",
    name: "Brand Strategy Workspace",
    forWho: "For consultants, designers and early-stage founders.",
    produces: "Produces positioning, offer clarity, voice rules and launch angles.",
  },
  {
    category: "TEMPLATE",
    name: "Client Audit System",
    forWho: "For agencies packaging repeatable advisory work.",
    produces: "Creates guided diagnostics, recommendations and executive summaries.",
  },
  {
    category: "TEMPLATE",
    name: "Coaching Sprint Product",
    forWho: "For coaches turning frameworks into paid AI workspaces.",
    produces: "Builds diagnostics, exercises, recaps and next-step plans.",
  },
];

const starterKnowledge = [
  "Brand notes and positioning docs",
  "PDF frameworks and course material",
  "Prompt packs and examples",
  "Client intake notes",
];

function defaultChecklist(modeId: string) {
  const map: Record<string, string[]> = {
    content: ["Contains at least 5 distinct, non-generic ideas", "Every idea includes a concrete hook or first line", "No filler phrases or engagement-bait clichés"],
    brand: ["States one clear positioning claim", "Names the target audience explicitly", "No generic marketing buzzwords"],
    review: ["Lists at least 3 specific weaknesses with locations", "Each weakness has a concrete fix", "Prioritized by impact"],
    coaching: ["Ends with exactly 3 next actions", "Actions are doable within one week", "Tone is direct, not motivational fluff"],
    audit: ["Every finding cites the provided input", "Includes a severity for each finding", "Ends with a one-paragraph executive summary"],
    research: ["Separates facts from interpretation", "Names at least 2 tradeoffs", "Ends with one clear recommendation"],
  };
  return map[modeId] ?? map.brand;
}

async function safeJson(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, init);
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function timeAgo(iso?: string) {
  if (!iso) return "Prepared";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function inferMode(project?: Project) {
  const source = `${project?.name ?? ""} ${project?.goal ?? ""}`.toLowerCase();
  const mode = workspaceModes.find((item) => source.includes(item.id) || source.includes(item.label.toLowerCase().split(" ")[0])) ?? workspaceModes[1];
  const extracted = project?.rules?.match(/Workflow steps:\s*(.+)$/i)?.[1]?.split("|").map((step) => step.trim()).filter(Boolean);
  return extracted?.length ? { ...mode, steps: extracted } : mode;
}

function formatUsd(value: number) {
  return `$${value.toFixed(value >= 1 ? 2 : 4)}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fuzzyScore(query: string, text: string) {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 100 - t.indexOf(q);
  let score = 0;
  let cursor = 0;
  for (const char of q) {
    const found = t.indexOf(char, cursor);
    if (found === -1) return 0;
    score += Math.max(1, 12 - (found - cursor));
    cursor = found + 1;
  }
  return score;
}

function buildUsageAnalytics(runs: ModelRun[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = runs.filter((run) => run.createdAt && new Date(run.createdAt) >= dayStart).reduce((sum, run) => sum + Number(run.costUsd ?? 0), 0);
  const month = runs.filter((run) => !run.createdAt || new Date(run.createdAt) >= monthStart).reduce((sum, run) => sum + Number(run.costUsd ?? 0), 0);
  const modelMap = new Map<string, { model: string; provider: string; calls: number; inputTokens: number; outputTokens: number; cost: number }>();
  for (const run of runs) {
    const model = run.model || "Unknown model";
    const current = modelMap.get(model) ?? { model, provider: run.provider || "auto", calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
    current.calls += 1;
    current.inputTokens += Number(run.inputTokens ?? 0);
    current.outputTokens += Number(run.outputTokens ?? 0);
    current.cost += Number(run.costUsd ?? 0);
    if (run.provider) current.provider = run.provider;
    modelMap.set(model, current);
  }
  const models = Array.from(modelMap.values()).sort((a, b) => b.cost - a.cost);
  const maxCostPerCall = models.length ? Math.max(...models.map((model) => model.cost / Math.max(1, model.calls))) : 0;
  const estimatedSavings = Math.max(0, runs.reduce((sum, run) => sum + Math.max(0, maxCostPerCall - Number(run.costUsd ?? 0)), 0));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const cost = runs
      .filter((run) => run.createdAt && sameDay(new Date(run.createdAt), date))
      .reduce((sum, run) => sum + Number(run.costUsd ?? 0), 0);
    return {
      label: date.toLocaleDateString("en", { weekday: "short" }),
      iso: date.toISOString().slice(0, 10),
      cost,
    };
  });
  return { today, month, models, days, estimatedSavings };
}

function ProviderDot({ provider }: { provider?: string }) {
  return <span className="provider-dot" data-provider={provider || "auto"} aria-hidden="true" />;
}

function hasAnyApiKey(keys: Record<string, string>) {
  return ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "GOOGLE_API_KEY", "DEEPSEEK_API_KEY"].some((key) => Boolean(keys[key]));
}

function parseNumberSetting(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function PersonalHomeHeader({
  userName,
  status,
  workspaceSummary,
}: {
  userName?: string;
  status: string;
  workspaceSummary: string;
}) {
  return (
    <div className="personal-home-header">
      <span className="eyebrow">PERSONAL WIZARD</span>
      <h1>{userName ? `Hello, ${userName}` : "Welcome back"}</h1>
      <p>{status}</p>
      <small>{workspaceSummary}</small>
    </div>
  );
}

function WizardStatusCard({ message, detail, actionLabel, onAction }: { message: string; detail: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="wizard-status-card">
      <span className="object-label">WIZARD STATUS</span>
      <h2>{message}</h2>
      <p>{detail}</p>
      <button className="secondary-pill" onClick={onAction}>{actionLabel} <ChevronRight size={16} /></button>
    </div>
  );
}

function WorkspaceObject({ mode, featured = false }: { mode: WorkspaceMode; featured?: boolean }) {
  return (
    <div className={`workspace-object ${featured ? "workspace-object-featured" : ""}`}>
      <div className="workspace-orb" />
      <div className="workspace-object-inner">
        <div className="object-label">WORKSPACE</div>
        <h3>{mode.label === "BRAND STRATEGY" ? "Brand Strategy System" : mode.label.replace(/\b\w/g, (m) => m.toUpperCase())}</h3>
        <p>{mode.output}</p>
        <div className="object-meta">
          <span>{mode.skills[0]}</span>
          <span>{mode.steps.length} steps</span>
          <span>Premium mode</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <AuraCard variant="fade" className="nn-stat usage-card">
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </AuraCard>
  );
}

function ModeSelector({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mode-selector">
      {workspaceModes.map((mode) => (
        <button
          key={mode.id}
          className={`mode-option ${selectedId === mode.id ? "is-selected" : ""}`}
          onClick={() => onSelect(mode.id)}
        >
          <span>{mode.label}</span>
          <small>{mode.purpose}</small>
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  useTypingGlow();

  const [view, setView] = useState<View>("home");
  const [altitude, setAltitude] = useState<AltitudeState>({ level: 3 });
  const [transitionLocked, setTransitionLocked] = useState(false);
  const [activeShelf, setActiveShelf] = useState<ShelfId | null>(null);
  const [streamItems, setStreamItems] = useState<StreamItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [costs, setCosts] = useState<{ runs: any[]; total: number }>({ runs: [], total: 0 });
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedStartPath, setSelectedStartPath] = useState<StartPath>("ask");
  const [selectedModeId, setSelectedModeId] = useState("brand");
  const [workspaceName, setWorkspaceName] = useState("Brand Strategy System");
  const [workspaceAudience, setWorkspaceAudience] = useState("Founders, designers and consultants");
  const [workspaceIntent, setWorkspaceIntent] = useState("Reusable strategy workspace for positioning, voice, offer and launch content.");
  const [workspaceSourceNote, setWorkspaceSourceNote] = useState("");
  const [workspaceSources, setWorkspaceSources] = useState<UploadedSource[]>([]);
  const [wizardStep, setWizardStep] = useState<WorkspaceWizardStep>("type");
  const [buildState, setBuildState] = useState<"idle" | "loading" | "complete">("idle");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [workspacePanel, setWorkspacePanel] = useState<WorkspacePanel>("overview");
  const [stepState, setStepState] = useState<"idle" | "loading" | "complete">("idle");
  const [finalState, setFinalState] = useState<"idle" | "loading" | "complete">("idle");
  const [currentOutput, setCurrentOutput] = useState<OutputCardOutput | null>(null);
  const [truthMap, setTruthMap] = useState<TruthMap | null>(null);
  const [outputs, setOutputs] = useState<OutputListItem[]>([]);
  const [crucibleInput, setCrucibleInput] = useState("");
  const [builtMaterialization, setBuiltMaterialization] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newCheck, setNewCheck] = useState("");
  const [genomeSkill, setGenomeSkill] = useState<Skill | null>(null);
  const [extractorOpen, setExtractorOpen] = useState(false);
  const [autopilot, setAutopilot] = useState<{ recommendations: any[]; policies: any[]; disabled?: boolean; message?: string }>({ recommendations: [], policies: [] });
  const [clientMode, setClientMode] = useState(false);
  const [clientState, setClientState] = useState<"idle" | "loading" | "complete">("idle");
  const [sessionState, setSessionState] = useState<"idle" | "loading" | "complete">("idle");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [xrayState, setXrayState] = useState<"idle" | "loading" | "complete">("idle");
  const [askState, setAskState] = useState<"idle" | "loading" | "complete">("idle");
  const [generalMessages, setGeneralMessages] = useState<GeneralChatMessage[]>([]);
  const [generalInput, setGeneralInput] = useState("");
  const [generalBusy, setGeneralBusy] = useState(false);
  const [generalAttachments, setGeneralAttachments] = useState<UploadedSource[]>([]);
  const [chatFeedback, setChatFeedback] = useState<ChatFeedbackState>({});
  const [profileReadyPrompt, setProfileReadyPrompt] = useState(false);
  const [enteredApp, setEnteredApp] = useState(!FEATURE_FLAGS.publicLanding);
  const [landingPrompt, setLandingPrompt] = useState("");
  const [publicPage, setPublicPage] = useState<PublicPage>("home");
  const [publicMenu, setPublicMenu] = useState<PublicMenu>(null);
  const [publicMobileMenu, setPublicMobileMenu] = useState(false);
  const [landingWorld, setLandingWorld] = useState<"life" | "work">("work");
  const [publicHeaderScrolled, setPublicHeaderScrolled] = useState(false);
  const [publicStoryNavVisible, setPublicStoryNavVisible] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const publicLastScroll = useRef(0);

  const selectedMode = useMemo(
    () => workspaceModes.find((mode) => mode.id === selectedModeId) ?? workspaceModes[1],
    [selectedModeId],
  );
  const selectedWorkspace = projects.find((project) => project.id === selectedWorkspaceId) ?? projects[0];
  const selectedWorkspaceMode = inferMode(selectedWorkspace);
  const workspaceSteps = useMemo<{ name: string; description?: string }[]>(() => {
    if (!selectedWorkspace?.id) return selectedWorkspaceMode.steps.map((name) => ({ name }));
    try {
      const parsed = JSON.parse(keys[`WORKSPACE_STEPS_${selectedWorkspace.id}`] ?? "[]");
      if (Array.isArray(parsed) && parsed.length) return parsed.map((step: any) => ({ name: String(step.name ?? step), description: step.description ? String(step.description) : undefined }));
    } catch {}
    return selectedWorkspaceMode.steps.map((name) => ({ name }));
  }, [keys, selectedWorkspace?.id, selectedWorkspaceMode.steps]);
  const hasWorkspaces = projects.length > 0;
  const runs = useMemo(() => (costs.runs ?? []) as ModelRun[], [costs.runs]);
  const usage = useMemo(() => buildUsageAnalytics(runs), [runs]);
  const userName = (keys.PREFERRED_NAME || keys.FULL_NAME || "").trim().split(/\s+/)[0] || "";
  const apiKeyReady = hasAnyApiKey(keys);
  const showHomeOrb = keys.WIZARD_HOME_ORB_ENABLED !== "0";
  const orbHue = parseNumberSetting(keys.ORB_HUE, 238);
  const orbSpeed = keys.ORB_BREATHING === "0" ? 1 : parseNumberSetting(keys.ORB_SPEED, 18);
  const orbIntensity = parseNumberSetting(keys.ORB_INTENSITY || keys.ORB_GLOW, 68);
  const orbSettings = {
    primaryColor: keys.ORB_PRIMARY_COLOR || "#00B3FF",
    secondaryColor: keys.ORB_SECONDARY_COLOR || "#FF2ED2",
    atmosphereGlow: parseNumberSetting(keys.ORB_ATMOSPHERE_GLOW, 0.15),
    atmosphereLevel: parseNumberSetting(keys.ORB_ATMOSPHERE_LEVEL, 1),
    atmosphereScale: parseNumberSetting(keys.ORB_ATMOSPHERE_SCALE, 1.03),
    internalSpeed: parseNumberSetting(keys.ORB_INTERNAL_SPEED, 0.5),
    autoRotation: parseNumberSetting(keys.ORB_AUTO_ROTATION, 0.89),
    globalDensity: parseNumberSetting(keys.ORB_GLOBAL_DENSITY, 3),
    chromaticAberration: parseNumberSetting(keys.ORB_CHROMATIC_ABERRATION, 0.025),
    resolutionDpr: parseNumberSetting(keys.ORB_RESOLUTION_DPR, 0.7),
    internalAnimSpeed: parseNumberSetting(keys.ORB_INTERNAL_ANIM_SPEED, 0.43),
    cornerSmoothness: parseNumberSetting(keys.ORB_CORNER_SMOOTHNESS, 0.031),
    asymmetry: parseNumberSetting(keys.ORB_ASYMMETRY, 0.55),
    iterations: parseNumberSetting(keys.ORB_ITERATIONS, 4),
    fractalScale: parseNumberSetting(keys.ORB_FRACTAL_SCALE, 0.97),
    energyDecay: parseNumberSetting(keys.ORB_ENERGY_DECAY, -16.7),
  };
  const recentWorkspace = projects[0];
  const guidance = useMemo(() => nextBestAction({
    workspaces: projects.map((project) => ({ ...project, hasKnowledge: workspaceSources.length > 0 || Boolean(project.goal?.toLowerCase().includes("source context")) })),
    skills,
    hasApiKey: apiKeyReady,
    lastOutputAt: runs[0]?.createdAt,
  }), [apiKeyReady, projects, runs, skills, workspaceSources.length]);
  const wizardStatus = hasWorkspaces
    ? `Your ${recentWorkspace.name} workspace is ready.`
    : apiKeyReady
      ? "Your models are connected. Create a reusable workspace."
      : "Ready when you are. Create a workspace or connect models later.";
  const wizardDetail = hasWorkspaces
    ? `Next recommended step: ${inferMode(recentWorkspace).steps[0]}.`
    : "Create a workspace first, then connect models when you need generation.";
  const workspaceSummary = `${projects.length} workspace${projects.length === 1 ? "" : "s"} · ${skills.length} skill${skills.length === 1 ? "" : "s"} · ${runs.length} model run${runs.length === 1 ? "" : "s"}`;

  useEffect(() => {
    void loadData();
    void loadStream();
    window.dispatchEvent(new Event("nn:client-mounted"));
    window.setTimeout(() => document.getElementById("nn-boot")?.remove(), 700);
    try {
      window.localStorage.removeItem("NN_ENTERED_APP");
      const stored = window.localStorage.getItem("CMDK_RECENT");
      if (stored) setRecentCommands(JSON.parse(stored).slice(0, 3));
    } catch {
      setRecentCommands([]);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("CMDK_RECENT", JSON.stringify(recentCommands.slice(0, 3)));
    } catch {
      // Recent commands are a convenience only; the app should not fail if storage is unavailable.
    }
  }, [recentCommands]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        setCommandQuery("");
        setCommandIndex(0);
        return;
      }
      if (!commandOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setCommandOpen(false);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCommandIndex((index) => index + 1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCommandIndex((index) => Math.max(0, index - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (commandOpen || wizardOpen || settingsOpen || whyOpen || extractorOpen || genomeSkill || activeShelf) return;
      if (event.key === "Escape") {
        event.preventDefault();
        ascendOne();
      }
      if (event.key === "1") ascendTo(1);
      if (event.key === "2") ascendTo(2);
      if (event.key === "3") ascendTo(3);
      if (event.key.toLowerCase() === "s") setActiveShelf("stream");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [altitude, commandOpen, wizardOpen, settingsOpen, whyOpen, extractorOpen, genomeSkill, activeShelf]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (altitude.level === 3) {
      url.searchParams.delete("altitude");
      url.searchParams.delete("workspace");
      url.searchParams.delete("focus");
    } else {
      url.searchParams.set("altitude", altitude.level === 2 ? "system" : "craft");
      if (altitude.workspaceId) url.searchParams.set("workspace", altitude.workspaceId);
      else url.searchParams.delete("workspace");
      if (altitude.focusId) url.searchParams.set("focus", altitude.focusId);
      else url.searchParams.delete("focus");
    }
    window.history.replaceState({}, "", url.toString());
  }, [altitude]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const workspaceId = url.searchParams.get("workspace") || undefined;
    const focusId = url.searchParams.get("focus") || undefined;
    const level = FEATURE_FLAGS.altitude && url.searchParams.get("altitude") === "craft" ? 1 : FEATURE_FLAGS.altitude && url.searchParams.get("altitude") === "system" ? 2 : 3;
    if (workspaceId) setSelectedWorkspaceId(workspaceId);
    setAltitude({ level, workspaceId, focusId });
    if (level < 3) setView("workspaces");
  }, []);

  useEffect(() => {
    const mode = workspaceModes.find((item) => item.id === selectedModeId);
    if (!mode) return;
    setWorkspaceName(mode.label === "BRAND STRATEGY" ? "Brand Strategy System" : `${mode.label.replace(/\b\w/g, (m) => m.toUpperCase())} Workspace`);
    setWorkspaceAudience(mode.audience);
    setWorkspaceIntent(mode.purpose);
  }, [selectedModeId]);

  useEffect(() => {
    document.title = keys.BRAND_NAME?.trim() || "NeuralNexus";
  }, [keys.BRAND_NAME]);

  useEffect(() => {
    if (enteredApp) return;
    const onScroll = () => {
      const current = window.scrollY;
      const delta = current - publicLastScroll.current;
      setPublicHeaderScrolled(current > 12);
      if (Math.abs(delta) > 4) setPublicStoryNavVisible(delta < 0 || current < 120);
      publicLastScroll.current = current;
    };
    publicLastScroll.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enteredApp]);

  useEffect(() => {
    if (enteredApp || typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-in-view");
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8%" });
    document.querySelectorAll(".public-section, .public-final-cta").forEach((element) => revealObserver.observe(element));
    return () => revealObserver.disconnect();
  }, [enteredApp, publicPage]);

  useEffect(() => {
    if (!selectedWorkspace?.id) return;
    void loadOutputs(selectedWorkspace.id);
    void loadAutopilot(selectedWorkspace.id);
    void loadTruthMap(selectedWorkspace.id);
    setChecklist(defaultChecklist(selectedWorkspaceMode.id));
  }, [selectedWorkspace?.id, selectedWorkspaceMode.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("built") === "1") {
      setBuiltMaterialization(true);
      url.searchParams.delete("built");
      window.history.replaceState({}, "", url.toString());
      window.setTimeout(() => setBuiltMaterialization(false), 900);
    }
  }, []);

  async function loadData() {
    const [projectData, skillData, costData, settingsData] = await Promise.all([
      safeJson("/api/projects"),
      safeJson("/api/skills"),
      safeJson("/api/costs"),
      safeJson("/api/settings"),
    ]);
    if (Array.isArray(projectData)) setProjects(projectData);
    if (Array.isArray(skillData)) setSkills(skillData);
    if (costData?.runs) setCosts(costData);
    if (settingsData && !settingsData.error) {
      setKeys(settingsData);
    }
  }

  async function loadStream() {
    const data = await safeJson("/api/stream");
    if (Array.isArray(data?.items)) setStreamItems(data.items);
  }

  async function loadOutputs(projectId: string) {
    const data = await safeJson(`/api/outputs?projectId=${projectId}`);
    if (Array.isArray(data)) setOutputs(data);
  }

  async function loadAutopilot(projectId: string) {
    const data = await safeJson(`/api/autopilot?projectId=${projectId}`);
    if (data) setAutopilot(data);
  }

  async function loadTruthMap(projectId: string) {
    const data = await safeJson(`/api/truth/patterns?projectId=${projectId}`);
    if (data && !data.error) setTruthMap(data);
  }

  function setStrictFacts(projectId: string, enabled: boolean) {
    updateKeys((state) => ({ ...state, [`STRICT_FACTS_${projectId}`]: enabled ? "1" : "0" }));
  }

  function updateKeys(fn: (state: Record<string, string>) => Record<string, string>) {
    setKeys((previous) => {
      const next = fn(previous);
      void safeJson("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      return next;
    });
  }

  async function buildWorkspace() {
    setBuildState("loading");
    const sourceSummary = workspaceSources.length
      ? workspaceSources.map((source) => `${source.name}: ${source.preview}`).join("\n")
      : workspaceSourceNote;
    const created = await safeJson("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: workspaceName,
        goal: `${workspaceIntent}\nAudience: ${workspaceAudience}\nMode: ${selectedMode.label}\nOutput: ${selectedMode.output}\nSource context:\n${sourceSummary || "No source attached yet."}`,
        rules: `Workflow steps: ${selectedMode.steps.join(" | ")}\nSkills: ${selectedMode.skills.join(" | ")}\nKnowledge sources: ${workspaceSources.map((source) => source.name).join(", ") || "none"}`,
        steps: selectedMode.steps.map((name) => ({ name })),
      }),
    });
    await loadData();
    if (created?.id) setSelectedWorkspaceId(created.id);
    setBuildState("complete");
    setTimeout(() => {
      setWizardOpen(false);
      descendToSystem(created?.id);
      setWorkspacePanel("overview");
      setBuildState("idle");
      setWizardStep("type");
    }, 650);
  }

  function lockTransition(ms = MOTION.descend * 1000) {
    setTransitionLocked(true);
    window.setTimeout(() => setTransitionLocked(false), ms);
  }

  function descendToSystem(workspaceId?: string) {
    if (transitionLocked) return;
    const id = workspaceId ?? selectedWorkspace?.id ?? projects[0]?.id;
    if (!id) return;
    lockTransition();
    setSelectedWorkspaceId(id);
    setView("workspaces");
    setAltitude(FEATURE_FLAGS.altitude ? { level: 2, workspaceId: id } : { level: 3, workspaceId: id });
  }

  function descendToCraft(focusId?: string) {
    if (transitionLocked) return;
    const workspaceId = selectedWorkspace?.id ?? selectedWorkspaceId ?? projects[0]?.id;
    if (!workspaceId) return;
    lockTransition();
    setView("workspaces");
    setAltitude(FEATURE_FLAGS.altitude ? { level: 1, workspaceId, focusId: focusId ?? currentOutput?.id ?? "next-step" } : { level: 3, workspaceId });
    if (!FEATURE_FLAGS.altitude) setWorkspacePanel("workflow");
  }

  function ascendOne() {
    if (transitionLocked || altitude.level === 3) return;
    lockTransition(MOTION.ascend * 1000);
    if (altitude.level === 1) {
      setAltitude({ level: 2, workspaceId: altitude.workspaceId ?? selectedWorkspace?.id });
      return;
    }
    setAltitude({ level: 3 });
    setView("home");
  }

  function ascendTo(level: AltitudeLevel) {
    if (level <= altitude.level) return;
    if (level === 2) {
      setAltitude({ level: 2, workspaceId: altitude.workspaceId ?? selectedWorkspace?.id });
      setView("workspaces");
      return;
    }
    if (level === 3) {
      setAltitude({ level: 3 });
      setView("home");
    }
  }

  function openShelf(shelf: ShelfId) {
    if (shelf === "settings") {
      setSettingsOpen(true);
      return;
    }
    setActiveShelf((current) => current === shelf ? null : shelf);
  }

  function nextWizardStep() {
    const order: WorkspaceWizardStep[] = ["type", "audience", "source", "purpose", "review"];
    const index = order.indexOf(wizardStep);
    setWizardStep(order[Math.min(order.length - 1, index + 1)]);
  }

  function previousWizardStep() {
    const order: WorkspaceWizardStep[] = ["type", "audience", "source", "purpose", "review"];
    const index = order.indexOf(wizardStep);
    setWizardStep(order[Math.max(0, index - 1)]);
  }

  async function readWorkspaceFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 8);
    const parsed = await Promise.all(list.map(async (file) => {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      const isImage = file.type.startsWith("image/");
      const isText = file.type.startsWith("text/") || /\.(md|txt|csv|json|html|css|js|ts|tsx)$/i.test(file.name);
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (isText) {
        const text = await file.text();
        return { id, name: file.name, kind: "text" as const, size: file.size, preview: text.slice(0, 900) || "Empty text file." };
      }
      if (isImage) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        return { id, name: file.name, kind: "image" as const, size: file.size, preview: "Image attached as a visual source. Live AI analysis happens when generation is connected.", dataUrl };
      }
      if (isPdf) {
        return { id, name: file.name, kind: "pdf" as const, size: file.size, preview: "PDF attached. Text extraction is prepared for a dedicated parser step, not faked here." };
      }
      return { id, name: file.name, kind: "file" as const, size: file.size, preview: "File attached as source metadata." };
    }));
    setWorkspaceSources((current) => {
      const merged = [...current];
      for (const source of parsed) {
        if (!merged.some((item) => item.id === source.id)) merged.push(source);
      }
      return merged;
    });
  }

  async function readGeneralChatFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 6);
    const parsed = await Promise.all(list.map(async (file) => {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      const isImage = file.type.startsWith("image/");
      const isText = file.type.startsWith("text/") || /\.(md|txt|csv|json|html|css|js|ts|tsx)$/i.test(file.name);
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (isText) {
        const text = await file.text();
        return { id, name: file.name, kind: "text" as const, size: file.size, preview: text.slice(0, 2500) || "Empty text file." };
      }
      if (isImage) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        return { id, name: file.name, kind: "image" as const, size: file.size, preview: "Image attached for visual analysis.", dataUrl };
      }
      if (isPdf) return { id, name: file.name, kind: "pdf" as const, size: file.size, preview: "PDF attached as metadata. PDF parsing is not active in this question view yet." };
      return { id, name: file.name, kind: "file" as const, size: file.size, preview: "File attached as metadata." };
    }));
    setGeneralAttachments((current) => [...current, ...parsed.filter((source) => !current.some((item) => item.id === source.id))]);
  }

  async function askWizard(input: string, attachments: UploadedSource[] = [], history = generalMessages.slice(-8)) {
    const response = await fetch("/api/wizard-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input,
        messages: history,
        attachments,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No model could answer. Check Settings.");
    return `${data.text}${data.model ? `\n\n— ${data.model}` : ""}`;
  }

  async function sendGeneralChat() {
    const input = generalInput.trim();
    if (!input && generalAttachments.length === 0) return;
    const userContent = input || `Please look at ${generalAttachments.length} attachment${generalAttachments.length === 1 ? "" : "s"}.`;
    const attachments = generalAttachments;
    setGeneralMessages((messages) => [...messages, { role: "user", content: userContent }]);
    setGeneralInput("");
    setGeneralAttachments([]);
    setGeneralBusy(true);
    try {
      const answer = await askWizard(userContent, attachments);
      setGeneralMessages((messages) => [...messages, { role: "assistant", content: answer }]);
    } catch (error: any) {
      setGeneralMessages((messages) => [...messages, { role: "assistant", content: error.message ?? "I could not answer. Check your API keys in Settings." }]);
    } finally {
      setGeneralBusy(false);
    }
  }

  async function regenerateChatMessage(index: number) {
    if (generalBusy) return;
    const previousUserIndex = generalMessages.slice(0, index).map((message) => message.role).lastIndexOf("user");
    if (previousUserIndex < 0) return;
    const prompt = generalMessages[previousUserIndex].content;
    const history = generalMessages.slice(0, previousUserIndex + 1).slice(-8);
    setGeneralMessages(generalMessages.slice(0, index));
    setGeneralBusy(true);
    try {
      const answer = await askWizard(prompt, [], history);
      setGeneralMessages((messages) => [...messages, { role: "assistant", content: answer }]);
    } catch (error: any) {
      setGeneralMessages((messages) => [...messages, { role: "assistant", content: error.message ?? "I could not regenerate that answer." }]);
    } finally {
      setGeneralBusy(false);
    }
  }

  function editChatMessage(message: GeneralChatMessage) {
    setGeneralInput(message.role === "assistant" ? `Please revise this answer:\n\n${message.content}` : message.content);
  }

  function chatFeedbackKey(index: number, content: string) {
    return `${index}:${content.slice(0, 80)}`;
  }

  function previousUserPromptFor(index: number) {
    for (let i = index - 1; i >= 0; i -= 1) {
      if (generalMessages[i]?.role === "user") return generalMessages[i].content;
    }
    return "";
  }

  async function recordChatFeedback(index: number, message: GeneralChatMessage, signal: ChatFeedbackSignal) {
    if (generalBusy || message.role !== "assistant") return;
    const key = chatFeedbackKey(index, message.content);
    const response = await fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageContent: message.content,
        userPrompt: previousUserPromptFor(index),
        signal,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Feedback could not be saved.");

    setChatFeedback((current) => {
      const previous = current[key] ?? [];
      const withoutPair = signal === "good" || signal === "bad"
        ? previous.filter((item) => item !== "good" && item !== "bad")
        : signal === "shorter" || signal === "longer"
          ? previous.filter((item) => item !== "shorter" && item !== "longer")
          : signal === "formal" || signal === "casual"
            ? previous.filter((item) => item !== "formal" && item !== "casual")
            : previous;
      return { ...current, [key]: [...withoutPair, signal] };
    });

    if ((payload.totalSignals ?? 0) >= 4 && window.localStorage.getItem("PROFILE_READY_SEEN") !== "1") {
      window.localStorage.setItem("PROFILE_READY_SEEN", "1");
      setProfileReadyPrompt(true);
    }
  }

  function startWorkspaceSession() {
    setSessionState("loading");
    setTimeout(() => {
      setSessionState("complete");
      setSelectedWorkspaceId(projects[0]?.id ?? null);
      descendToSystem(projects[0]?.id);
      setWorkspacePanel("workflow");
      setTimeout(() => setSessionState("idle"), 500);
    }, 500);
  }

  async function runNextStep(userInput = "") {
    if (!selectedWorkspace) return;
    setStepState("loading");
    setCrucibleInput(userInput);
    setWorkspacePanel("workflow");
    descendToCraft("next-step");
    window.dispatchEvent(new CustomEvent("nexus:orb", { detail: { state: "thinking" } }));
  }

  async function openOutput(output: OutputListItem) {
    const full = output.finalContent || output.draftContent ? output : await safeJson(`/api/outputs/${output.id}`);
    if (full?.id) setCurrentOutput({ id: full.id, stepName: full.stepName, model: full.model, provider: full.provider, costUsd: full.costUsd, content: full.finalContent || full.draftContent, skillVersion: full.skillVersion, knowledgeIds: full.knowledgeIds, qualityReport: full.qualityReport ? typeof full.qualityReport === "string" ? JSON.parse(full.qualityReport) : full.qualityReport : null, claimsJson: full.claimsJson });
    if (full?.id) descendToCraft(full.id);
  }

  async function saveAsFinal(content?: string) {
    if (!currentOutput) return;
    setFinalState("loading");
    await fetch(`/api/outputs/${currentOutput.id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finalContent: content ?? currentOutput.content }),
    });
    setFinalState("complete");
    if (selectedWorkspace) await loadOutputs(selectedWorkspace.id);
  }

  async function forkOutput(change: { type: "model" | "skill"; value: string }) {
    if (!currentOutput) return;
    const response = await fetch(`/api/outputs/${currentOutput.id}/fork`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ change }),
    });
    const data = await response.json();
    if (response.ok && selectedWorkspace) {
      setCurrentOutput({ ...currentOutput, id: data.outputId, model: data.model, costUsd: data.costUsd, content: data.content, qualityReport: data.qualityReport, claims: data.claims, claimsJson: data.claims ? JSON.stringify(data.claims) : "" });
      await loadOutputs(selectedWorkspace.id);
    }
  }

  function activateClientMode() {
    setClientState("loading");
    setTimeout(() => {
      setClientMode(true);
      setClientState("complete");
    }, 650);
  }

  function handleWizardIntent(intent: WizardIntent) {
    if (intent === "open_chat") {
      setActiveShelf("chat");
      return;
    }
    if (intent === "create_workspace") {
      setWizardOpen(true);
      return;
    }
    if (intent === "start_xray") {
      setSelectedModeId("audit");
      setWizardOpen(true);
      return;
    }
    if (intent === "create_skill") {
      setActiveShelf("skills");
      return;
    }
    if (intent === "open_knowledge") {
      setActiveShelf("knowledge");
      return;
    }
    if (intent === "open_usage") {
      setActiveShelf("vault");
      return;
    }
    if (intent === "open_templates") {
      setActiveShelf("templates");
      return;
    }
    if (intent === "open_outputs" || intent === "open_workspaces") {
      descendToSystem();
      if (intent === "open_outputs") setWorkspacePanel("outputs");
      return;
    }
    if (intent === "open_settings") {
      setSettingsOpen(true);
      return;
    }
    if (intent === "find_something" || intent === "unknown") {
      setCommandOpen(true);
    }
  }

  function startBusinessXray() {
    setXrayState("loading");
    setTimeout(() => {
      setXrayState("complete");
      handleWizardIntent("start_xray");
      setTimeout(() => setXrayState("idle"), 500);
    }, 420);
  }

  function startWizardAsk() {
    setAskState("loading");
    setTimeout(() => {
      setAskState("complete");
      setCommandOpen(true);
      setTimeout(() => setAskState("idle"), 500);
    }, 380);
  }

  function rememberCommand(id: string) {
    setRecentCommands((current) => [id, ...current.filter((item) => item !== id)].slice(0, 3));
  }

  function exportUsageCsv() {
    const rows = [
      ["model", "provider", "calls", "input_tokens", "output_tokens", "cost_usd", "share"],
      ...usage.models.map((model) => [
        model.model,
        model.provider,
        String(model.calls),
        String(model.inputTokens),
        String(model.outputTokens),
        model.cost.toFixed(6),
        costs.total ? `${((model.cost / costs.total) * 100).toFixed(2)}%` : "0%",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "neuralnexus-usage.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const navigation = [
    { id: "home", label: "Home", icon: Compass },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "usage", label: "Your Profile", icon: UserRound },
  ] as const;
  const mobilePrimaryNav = [
    { id: "home", label: "Home", icon: Compass },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "usage", label: "Profile", icon: UserRound },
  ] as const;
  const mobileMoreNav = [
    { id: "workspaces", label: "Workspaces", icon: Layers3 },
    { id: "skills", label: "Skills", icon: Sparkles },
    { id: "eye", label: "Eye", icon: Sparkles },
    { id: "templates", label: "Templates", icon: Boxes },
    { id: "knowledge", label: "Knowledge", icon: Database },
  ] as const;

  const startPaths: {
    id: StartPath;
    title: string;
    kicker: string;
    body: string;
    actionLabel: string;
    icon: LucideIcon;
    action: () => void;
  }[] = [
    {
      id: "ask",
      title: "Ask a question",
      kicker: "Clean chat",
      body: "Open a normal chat for general questions, ideas, images or files.",
      actionLabel: "Open Ask",
      icon: MessageCircle,
      action: () => setActiveShelf("chat"),
    },
    {
      id: "build",
      title: "Build a workspace",
      kicker: "Guided system",
      body: "Turn one repeatable method into a workspace with steps, skills and sources.",
      actionLabel: "Create workspace",
      icon: Layers3,
      action: () => setWizardOpen(true),
    },
    {
      id: "improve",
      title: "Improve existing work",
      kicker: hasWorkspaces ? "Next step" : "Start from structure",
      body: hasWorkspaces
        ? "Continue your active workspace and run the next useful step."
        : "Use a template or the Eye to teach NeuralNexus what good looks like.",
      actionLabel: hasWorkspaces ? "Continue workspace" : "Browse templates",
      icon: Eye,
      action: () => {
        if (hasWorkspaces) {
          setSelectedWorkspaceId(projects[0]?.id ?? null);
          setWorkspacePanel("workflow");
          descendToSystem(projects[0]?.id);
          return;
        }
        setActiveShelf("templates");
      },
    },
  ];
  const activeStartPath = startPaths.find((path) => path.id === selectedStartPath) ?? startPaths[1];
  const ActiveStartIcon = activeStartPath.icon;
  const featureMap: {
    label: string;
    benefit: string;
    text: string;
    action: () => void;
  }[] = [
    {
      label: "Templates",
      benefit: "Start with structure",
      text: "Use when you want a proven workspace shape before customizing.",
      action: () => setActiveShelf("templates"),
    },
    {
      label: "Eye",
      benefit: "Teach taste",
      text: "Use when the app should learn your judgment from real examples.",
      action: () => setActiveShelf("vault"),
    },
    {
      label: "Skills",
      benefit: "Package methods",
      text: "Use when a repeatable decision or craft move should become reusable.",
      action: () => setActiveShelf("skills"),
    },
    {
      label: "Vault",
      benefit: "Keep the work",
      text: "Use when outputs, sources and patterns should compound over time.",
      action: () => setActiveShelf("vault"),
    },
  ];

  function runStartPath(path = activeStartPath) {
    setSelectedStartPath(path.id);
    path.action();
  }

  const commandItems = useMemo<CommandItem[]>(() => {
    const navigate = (target: View): (() => void) => () => {
      if (target === "settings") setSettingsOpen(true);
      if (target === "home") {
        ascendTo(3);
        return;
      }
      if (target === "workspaces") {
        descendToSystem();
        return;
      }
      if (target === "chat") {
        setActiveShelf(null);
        return setView("chat");
      }
      if (target === "skills") return setActiveShelf("skills");
      if (target === "templates") return setActiveShelf("templates");
      if (target === "knowledge") return setActiveShelf("knowledge");
      if (target === "usage") {
        setActiveShelf(null);
        return setView("usage");
      }
      if (target === "eye") return setActiveShelf("vault");
      setView(target);
    };
    return [
      ...navigation.map((item) => ({
        id: `nav-${item.id}`,
        label: item.label,
        group: "Navigation",
        hint: item.id === "home" ? "Return to the workspace stage" : `Open ${item.label}`,
        action: navigate(item.id as View),
      })),
      {
        id: "why-neuralnexus",
        label: POSITIONING_UI.home.whyLabel,
        group: "Help",
        hint: "Understand the system frame",
        action: () => setWhyOpen(true),
      },
      {
        id: "nav-settings",
        label: "Settings",
        group: "Navigation",
        hint: "Open Settings",
        action: () => setSettingsOpen(true),
      },
      {
        id: "create-workspace",
        label: "Create workspace",
        group: "Actions",
        hint: "Open workspace setup",
        action: () => setWizardOpen(true),
      },
      {
        id: "export-usage",
        label: "Export usage CSV",
        group: "Actions",
        hint: "Download model usage as CSV",
        action: exportUsageCsv,
      },
      ...projects.map((project) => ({
        id: `workspace-${project.id}`,
        label: project.name,
        group: "Workspaces",
        hint: "Open workspace detail",
        action: () => {
          setSelectedWorkspaceId(project.id);
          descendToSystem(project.id);
          setWorkspacePanel("overview");
        },
      })),
      ...skills.map((skill) => ({
        id: `skill-${skill.id}`,
        label: skill.name,
        group: "Skills",
        hint: skill.description || "Open skills library",
        action: () => setActiveShelf("skills"),
      })),
      ...templateCards.map((template) => ({
        id: `template-${template.name}`,
        label: template.name,
        group: "Templates",
        hint: "Use this template",
        action: () => {
          const match = workspaceModes.find((mode) => template.name.toLowerCase().includes(mode.id)) ?? workspaceModes[0];
          setSelectedModeId(match.id);
          setWizardOpen(true);
        },
      })),
    ];
  }, [costs.total, projects, skills, usage.models]);

  const filteredCommands = useMemo(() => {
    const query = commandQuery.trim();
    const scored = commandItems
      .map((item) => ({ item, score: fuzzyScore(query, `${item.label} ${item.group} ${item.hint}`) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);
    if (!query && recentCommands.length) {
      const recent = recentCommands
        .map((id) => commandItems.find((item) => item.id === id))
        .filter((item): item is CommandItem => Boolean(item));
      return [...recent, ...scored.filter((item) => !recentCommands.includes(item.id))].slice(0, 12);
    }
    return scored.slice(0, 12);
  }, [commandItems, commandQuery, recentCommands]);

  useEffect(() => {
    setCommandIndex((index) => Math.min(index, Math.max(0, filteredCommands.length - 1)));
  }, [filteredCommands.length]);

  const islandActivity = generalBusy || sessionState === "loading" || buildState === "loading"
    ? "generation"
    : stepState === "loading"
      ? "gates"
      : extractorOpen
        ? "extraction"
        : view === "eye"
          ? "taste"
      : "idle";

  const altitudeLayerMotion = {
    initial: FEATURE_FLAGS.altitude ? { opacity: 0, scale: altitude.level === 3 ? 0.98 : 0.96, filter: "blur(2px)" } : false,
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.96, filter: "blur(2px)" },
    transition: { duration: altitude.level === 3 ? MOTION.ascend : MOTION.descend, ease: MOTION.easeOut },
  } as const;

  function runCommand(item?: CommandItem) {
    if (!item) return;
    rememberCommand(item.id);
    item.action();
    setCommandOpen(false);
    setCommandQuery("");
    setCommandIndex(0);
  }

  function enterWorkspaceApp(openWizard = false, promptOverride?: string) {
    const prompt = (promptOverride ?? landingPrompt).trim();
    setEnteredApp(true);
    setPublicMenu(null);
    setPublicMobileMenu(false);
    try {
      window.localStorage.removeItem("NN_ENTERED_APP");
    } catch {}
    if (prompt) {
      setWorkspaceIntent(prompt);
      setWorkspaceSourceNote(prompt);
    }
    if (openWizard || prompt) {
      setWizardOpen(true);
      setWizardStep(prompt ? "audience" : "type");
    }
  }

  function showPublicPage(page: PublicPage) {
    setPublicPage(page);
    setPublicMenu(null);
    setPublicMobileMenu(false);
  }

  function startFromPublicPrompt(prompt: string) {
    setLandingPrompt(prompt);
    setWorkspaceIntent(prompt);
    setWorkspaceSourceNote(prompt);
    setPublicPage("home");
    setPublicMenu(null);
    setPublicMobileMenu(false);
  }

  return (
    <MotionConfig reducedMotion="user" transition={MOTION.spring}>
    <svg className="nn-aurora-defs" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="nn-aurora" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--aurora-a)" />
          <stop offset="100%" stopColor="var(--aurora-b)" />
        </linearGradient>
      </defs>
    </svg>
    {!enteredApp ? (
      <main className={`public-landing public-page-${publicPage}`} onMouseLeave={() => setPublicMenu(null)}>
        <header className={`public-nav ${publicHeaderScrolled ? "is-scrolled" : ""}`}>
          <button className="public-brand" type="button" onClick={() => showPublicPage("home")} aria-label="NeuralNexus home">
            <AuroraDisc size={24} label={keys.BRAND_NAME?.trim() || "NeuralNexus"} />
            <strong>{keys.BRAND_NAME?.trim() || "NeuralNexus"}</strong>
          </button>
          <nav className="public-menu" aria-label="Public navigation">
            <button
              type="button"
              className={publicMenu === "solutions" ? "is-active" : ""}
              aria-expanded={publicMenu === "solutions"}
              onMouseEnter={() => setPublicMenu("solutions")}
              onClick={() => setPublicMenu(publicMenu === "solutions" ? null : "solutions")}
            >
              Solutions <ChevronDown size={14} />
            </button>
            <button
              type="button"
              className={publicMenu === "resources" ? "is-active" : ""}
              aria-expanded={publicMenu === "resources"}
              onMouseEnter={() => setPublicMenu("resources")}
              onClick={() => setPublicMenu(publicMenu === "resources" ? null : "resources")}
            >
              Resources <ChevronDown size={14} />
            </button>
            <button type="button" onClick={() => setPublicMenu("resources")}>Community</button>
            <button type="button" className={publicPage === "enterprise" ? "is-current" : ""} onClick={() => showPublicPage("enterprise")}>Enterprise</button>
            <button type="button" className={publicPage === "pricing" ? "is-current" : ""} onClick={() => showPublicPage("pricing")}>Pricing</button>
            <button type="button" className={publicPage === "security" ? "is-current" : ""} onClick={() => showPublicPage("security")}>Security</button>
          </nav>
          <div className="public-actions">
            <button type="button" className="public-login" onClick={() => enterWorkspaceApp(false)}>Log in</button>
            <button type="button" className="public-get-started" onClick={() => enterWorkspaceApp(true)}>Get started</button>
            <button type="button" className="public-mobile-menu-button" onClick={() => setPublicMobileMenu((open) => !open)} aria-expanded={publicMobileMenu} aria-label="Open navigation">
              {publicMobileMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          <AnimatePresence>
            {publicMenu && (
              <motion.div
                className={`public-mega public-mega-${publicMenu}`}
                role="menu"
                initial={{ opacity: 0, y: -8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.985 }}
                transition={{ duration: 0.18, ease: MOTION.easeOut }}
                onMouseEnter={() => setPublicMenu(publicMenu)}
              >
                {publicMenu === "solutions" ? (
                  <>
                    <div className="public-mega-main">
                      <span className="public-mega-label">Who is it for?</span>
                      <button type="button" onClick={() => startFromPublicPrompt("Build a reusable strategy workspace for founders.")}><strong>Founders</strong><span>Turn your method into a system.</span></button>
                      <button type="button" onClick={() => startFromPublicPrompt("Build a client-ready marketing workspace.")}><strong>Marketers</strong><span>Campaigns, voice and launch assets.</span></button>
                      <button type="button" onClick={() => startFromPublicPrompt("Build a sales enablement workspace.")}><strong>Sales</strong><span>Offers, objections and demos.</span></button>
                      <button type="button" onClick={() => startFromPublicPrompt("Build an operations workspace for repeated decisions.")}><strong>Ops</strong><span>Systems that run the same way twice.</span></button>
                      <button type="button" onClick={() => startFromPublicPrompt("Build a product strategy workspace.")}><strong>Product teams</strong><span>Research, decisions and briefs.</span></button>
                      <button type="button" onClick={() => startFromPublicPrompt("Build a design critique workspace.")}><strong>Designers</strong><span>Critique, consistency and standards.</span></button>
                    </div>
                    <aside className="public-mega-side">
                      <span className="public-mega-label">Use cases</span>
                      <button type="button" onClick={() => startFromPublicPrompt("Prototype a workspace from a rough method.")}><strong>Instant workspace</strong><span>From prompt, PDF or method.</span></button>
                      <button type="button" onClick={() => startFromPublicPrompt("Improve existing work with quality checks.")}><strong>Improve output</strong><span>Review, verify and revise.</span></button>
                    </aside>
                  </>
                ) : (
                  <>
                    <div className="public-mega-main">
                      <span className="public-mega-label">Resources</span>
                      <button type="button" onClick={() => startFromPublicPrompt("Create a workspace from a product strategy article or brief.")}><strong>Blog</strong><span>Ideas, updates and product thinking.</span></button>
                      <button type="button" onClick={() => startFromPublicPrompt("Start from a proven template for brand strategy, content or client audits.")}><strong>Templates</strong><span>Begin with a proven structure.</span></button>
                      <button type="button" onClick={() => startFromPublicPrompt("Create a workspace from my existing notes and docs.")}><strong>Guides</strong><span>Learn by building the first system.</span></button>
                      <button type="button" onClick={() => showPublicPage("security")}><strong>Connectors</strong><span>Bring your model keys and sources.</span></button>
                      <button type="button" onClick={() => startFromPublicPrompt("Teach me how to structure a reusable workspace.")}><strong>Academy</strong><span>Understand workflows and quality gates.</span></button>
                      <button type="button" onClick={() => showPublicPage("security")}><strong>Security docs</strong><span>Keys, sources and trust layer.</span></button>
                    </div>
                    <aside className="public-mega-side">
                      <span className="public-mega-label">Announcement</span>
                      <div className="public-announcement-card" aria-hidden="true" />
                      <strong>Workspace intelligence, with proof.</strong>
                      <p>See outputs, trust marks and reusable rules in one system.</p>
                      <button type="button" onClick={() => showPublicPage("security")}>Learn more <ChevronRight size={16} /></button>
                    </aside>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {publicMobileMenu && (
              <motion.div className="public-mobile-menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18, ease: MOTION.easeOut }}>
                <button type="button" onClick={() => { setPublicMobileMenu(false); setPublicMenu("solutions"); }}>Solutions <ChevronDown size={16} /></button>
                <button type="button" onClick={() => { setPublicMobileMenu(false); setPublicMenu("resources"); }}>Resources <ChevronDown size={16} /></button>
                <button type="button" onClick={() => showPublicPage("enterprise")}>Enterprise</button>
                <button type="button" onClick={() => showPublicPage("pricing")}>Pricing</button>
                <button type="button" onClick={() => showPublicPage("security")}>Security</button>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {publicPage === "home" && (
          <>
            <section className="public-hero" id="top">
              <div className="public-hero-copy">
                <span className="public-eyebrow">PERSONAL AI WORKSPACE</span>
                <h1>NeuralNexus</h1>
                <p>One AI Twin for the life you live and the work you shape.</p>
                <div className="public-world-switch" role="tablist" aria-label="Explore NeuralNexus worlds">
                  <button type="button" role="tab" aria-selected={landingWorld === "life"} className={landingWorld === "life" ? "is-active" : ""} onClick={() => setLandingWorld("life")}>Explore LIFE</button>
                  <button type="button" role="tab" aria-selected={landingWorld === "work"} className={landingWorld === "work" ? "is-active" : ""} onClick={() => setLandingWorld("work")}>Explore WORK</button>
                </div>
                <form className="public-prompt" onSubmit={(event) => { event.preventDefault(); enterWorkspaceApp(true); }}>
                  <label htmlFor="landing-prompt" className="sr-only">Describe what you want to build</label>
                  <textarea id="landing-prompt" value={landingPrompt} onChange={(event) => setLandingPrompt(event.target.value)} placeholder={landingWorld === "life" ? "Describe what you want to understand..." : "Describe the method you want to build..."} />
                  <div className="public-prompt-footer">
                    <button type="button" aria-label="Add material" onClick={() => { enterWorkspaceApp(false); setExtractorOpen(true); }}><Plus size={18} /></button>
                    <div className="public-prompt-tools">
                      <button type="button" className="public-build-mode" onClick={() => setPublicMenu("solutions")}>{landingWorld === "life" ? "Reflect" : "Build"} <ChevronDown size={14} /></button>
                      <button type="button" aria-label="Open Ask" onClick={() => { enterWorkspaceApp(false); setActiveShelf("chat"); }}><Mic size={17} /></button>
                      <button type="submit" className="public-submit" aria-label="Start with NeuralNexus"><ArrowUp size={18} /></button>
                    </div>
                  </div>
                </form>
                <button className="public-hero-cta" type="button" onClick={() => enterWorkspaceApp(true)}>Start with NeuralNexus <ChevronRight size={17} /></button>
                <span className="public-hero-note">Separate by default. You choose what can cross.</span>
              </div>
              <div className="public-hero-orb" aria-label="NeuralNexus Twin presence">
                <WizardOrb size={220} hue={orbHue} speed={orbSpeed} intensity={orbIntensity} state="idle" interactive {...orbSettings} />
                <div className="public-orb-caption"><span className="public-orb-dot" /> {landingWorld === "life" ? "LIFE context" : "WORK context"}</div>
              </div>
              <a className="public-scroll-cue" href="#twin">See how it works <ArrowDown size={15} /></a>
            </section>

            <div className={`public-story-nav ${publicStoryNavVisible ? "is-visible" : "is-hidden"}`}>
              <span>NeuralNexus</span>
              <nav aria-label="Story navigation">
                <a href="#twin">The Twin</a>
                <a href="#engine">The Engine</a>
                <a href="#trust">Trust</a>
                <button type="button" onClick={() => enterWorkspaceApp(true)}>Start</button>
              </nav>
            </div>

            <section className="public-section public-twin-section" id="twin">
              <div className="public-section-heading"><span className="public-eyebrow">ONE TWIN, TWO WORLDS</span><h2>Separate by default.<br />Useful everywhere you are.</h2><p>The same Twin engine can learn your patterns without mixing the life you live with the work you shape.</p></div>
              <div className="public-world-grid">
                <article className={landingWorld === "life" ? "is-selected" : ""} onClick={() => setLandingWorld("life")}><span className="public-section-label">LIFE</span><h3>Notice what matters to you.</h3><p>Reflections, goals and patterns stay in their own context.</p><button type="button" onClick={() => { setLandingWorld("life"); enterWorkspaceApp(true, "Help me start a private LIFE workspace."); }}>Start with LIFE <ChevronRight size={16} /></button></article>
                <article className={landingWorld === "work" ? "is-selected" : ""} onClick={() => setLandingWorld("work")}><span className="public-section-label">WORK</span><h3>Turn your method into a system.</h3><p>Sources, skills and outputs stay ready for repeatable work.</p><button type="button" onClick={() => { setLandingWorld("work"); enterWorkspaceApp(true); }}>Start with WORK <ChevronRight size={16} /></button></article>
              </div>
            </section>

            <section className="public-section public-preview-section" id="engine">
              <div className="public-section-heading"><span className="public-eyebrow">THE ENGINE</span><h2>Learning you can inspect.</h2><p>NeuralNexus keeps the useful parts visible: what it remembers, what good looks like, and how your method becomes reusable.</p></div>
              <div className="public-preview-panel">
                <div className="public-preview-window"><div className="public-window-bar"><span /><span /><span /><small>{landingWorld === "life" ? "LIFE / Today" : "WORK / Review"}</small></div><div className="public-preview-content"><div className="public-preview-orb"><span className="public-orb-dot" /></div><div><span className="public-section-label">{landingWorld === "life" ? "PATTERN REVIEW" : "WORKSPACE REVIEW"}</span><h3>{landingWorld === "life" ? "A tentative relationship, with evidence." : "A method you can run again."}</h3><p>{landingWorld === "life" ? "See the observations first. Decide whether it is useful." : "Review the source, compare the output, approve the rule."}</p><button type="button" onClick={() => enterWorkspaceApp(true)}>{landingWorld === "life" ? "See evidence" : "Open workspace"} <ChevronRight size={16} /></button></div></div></div>
                <div className="public-preview-ledger"><span>01</span><strong>Evidence first</strong><p>Every useful suggestion shows where it came from.</p><span>02</span><strong>Your decision</strong><p>Nothing becomes a rule without your approval.</p><span>03</span><strong>Reusable output</strong><p>What works becomes part of the next run.</p></div>
              </div>
            </section>

            <section className="public-section public-engine-bands">
              {[["Vault", "What Nexus remembers", "Sources and decisions remain attached to the work that shaped them."], ["Eye", "What good looks like", "Approved and rejected examples make your taste legible."], ["Genome", "How your method compounds", "Corrections become rules you can read, edit and reuse."]].map(([label, title, body]) => <article key={label}><span className="public-section-label">{label}</span><h3>{title}</h3><p>{body}</p><button type="button" onClick={() => enterWorkspaceApp(true)}>Explore {label} <ChevronRight size={16} /></button></article>)}
            </section>

            <section className="public-section public-trust-section" id="trust"><div className="public-trust-copy"><span className="public-eyebrow">TRUST BY DESIGN</span><h2>Confidence is what Nexus knows. Autonomy is what you allow.</h2><p>Bring your own provider keys, keep contexts separate, and make every permission explicit.</p><button type="button" onClick={() => showPublicPage("security")}>See security and privacy <ChevronRight size={16} /></button></div><div className="public-trust-list"><span><Lock size={17} /> Separate contexts by default</span><span><Check size={17} /> Source-aware outputs</span><span><Settings size={17} /> Permission before action</span></div></section>

            <section className="public-section public-pricing-preview"><div className="public-section-heading"><span className="public-eyebrow">SIMPLE START</span><h2>Start with the work that matters now.</h2><p>Begin with a workspace. Expand when the system earns a place in your workflow.</p><button type="button" onClick={() => showPublicPage("pricing")}>View plans <ChevronRight size={16} /></button></div></section>

            <section className="public-final-cta"><AuroraDisc size={32} label="NeuralNexus Twin" /><span className="public-eyebrow">YOUR AI TWIN</span><h2>Start with a method<br />you already trust.</h2><div><button type="button" onClick={() => enterWorkspaceApp(true, "Help me turn my method into a workspace.")}>Start with WORK</button><button type="button" onClick={() => enterWorkspaceApp(true, "Help me start a private LIFE workspace.")}>Start with LIFE</button></div></section>
          </>
        )}

        {publicPage === "enterprise" && (
          <section className="public-enterprise">
            <span>NeuralNexus for teams</span>
            <h1>Ship systems faster</h1>
            <p>Prototype repeatable knowledge work, validate output quality, and turn your team's method into a workspace.</p>
            <button type="button" className="public-demo-button" onClick={() => enterWorkspaceApp(true)}>Get a demo</button>
          </section>
        )}

        {publicPage === "pricing" && (
          <section className="public-pricing">
            <h1><AuroraDisc size={32} label="Pricing" /> Pricing</h1>
            <p>Start free. Upgrade when your workspace becomes a system your team relies on.</p>
            <div className="public-billing-toggle" role="group" aria-label="Billing cycle">
              <button type="button" className={billingCycle === "monthly" ? "is-active" : ""} onClick={() => setBillingCycle("monthly")}>Monthly</button>
              <button type="button" className={billingCycle === "yearly" ? "is-active" : ""} onClick={() => setBillingCycle("yearly")}>Yearly <span>2 months free</span></button>
            </div>
            <div className="public-price-grid">
              {[
                ["Free", "$0", "Discover what NeuralNexus can do for you", "No credit card needed", ["1 workspace", "Normal Ask chat", "Templates preview"]],
                ["Pro", billingCycle === "yearly" ? "$20" : "$25", "For builders turning methods into reusable work", "100 monthly workspace credits", ["Reusable workspaces", "Skill Genome rules", "File and image reading"]],
                ["Business", billingCycle === "yearly" ? "$40" : "$50", "Advanced controls for growing teams", "Shared workspaces and trust checks", ["Team workspaces", "Quality gates", "Cost routing controls"]],
                ["Enterprise", "Custom", "For organizations needing governance and scale", "Volume-based pricing", ["Bring your own keys", "Workspace governance", "Priority rollout support"]],
              ].map(([name, price, desc, meta, features], index) => (
                <article className="public-price-card" key={String(name)}>
                  <h2>{String(name)}</h2>
                  <p>{String(desc)}</p>
                  <strong>{String(price)}</strong>
                  <small>{String(price).startsWith("$") ? "/ month" : "Platform fee"}</small>
                  <button type="button" className={index === 1 ? "is-primary" : ""} onClick={() => index === 3 ? showPublicPage("enterprise") : enterWorkspaceApp(true)}>{index === 3 ? "Book a demo" : "Get started"}</button>
                  <em>{String(meta)}</em>
                  <ul>
                    {(features as string[]).map((feature) => <li key={feature}>{feature}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}

        {publicPage === "security" && (
          <section className="public-security">
            <span>Security</span>
            <h1>Your work stays yours</h1>
            <p>NeuralNexus is designed around explicit keys, transparent sources, trust marks and workspace-level control.</p>
            <div className="public-security-grid">
              {[
                ["Bring your own keys", "Provider credentials stay under your control."],
                ["Source-aware outputs", "Trust marks show what came from your material."],
                ["No fake execution", "Actions route to real pages and real system states."],
              ].map(([title, body]) => (
                <article key={title}>
                  <Lock size={20} />
                  <strong>{title}</strong>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    ) : (
    <main className={`nn-shell altitude-shell altitude-${altitude.level} ${activeShelf ? "has-open-shelf" : ""}`} data-altitude={altitude.level}>
      <PresenceLine active={altitude.level === 1 && (generalBusy || stepState === "loading" || finalState === "loading")} />
      <div className="altitude-live" aria-live="polite">
        {altitude.level === 3 ? "Overview" : altitude.level === 2 ? `Workspace ${selectedWorkspace?.name ?? ""}` : `Focus ${currentOutput?.stepName ?? "focused step"}`}
      </div>
      <ShelfDock activeShelf={activeShelf} streamCount={streamItems.length} onOpen={openShelf} onCreate={() => setWizardOpen(true)} />
      <aside className="nn-sidebar">
        <button className="brand-lockup" onClick={() => ascendTo(3)}>
          <AuroraDisc size={24} label="NeuralNexus" />
          <span>
            <strong>{keys.BRAND_NAME?.trim() || "NeuralNexus"}</strong>
            <small>AI personality profile</small>
          </span>
        </button>

        <nav className="nn-nav" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "is-active" : ""}
                onClick={() => {
                  if (item.id === "home") {
                    ascendTo(3);
                    return;
                  }
                  if (item.id === "chat") {
                    setActiveShelf(null);
                    setView("chat");
                    return;
                  }
                  if (item.id === "usage") {
                    setActiveShelf(null);
                    setView("usage");
                  }
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="settings-pin" onClick={() => setSettingsOpen(true)}>
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </aside>

      <section className="nn-stage">
        <NexusIsland activity={islandActivity} />
        <div className="stage-tools">
          <ThemeToggle />
          <button className="command-launcher" onClick={() => setCommandOpen(true)} aria-label="Open command center">
            <span>Command</span>
            <kbd>⌘K</kbd>
          </button>
        </div>
        <AnimatePresence mode="wait">
        <motion.div key={`${altitude.level}-${view}`} className="altitude-layer" {...altitudeLayerMotion}>
        {view === "home" && (
          <div className="nn-home altitude-orbit">
            <section className="orbit-core" aria-label="Overview">
              {showHomeOrb && (
                <div className="orbit-orb">
                  <WizardOrb
                    size={hasWorkspaces ? 300 : 340}
                    hue={orbHue}
                    speed={orbSpeed}
                    intensity={orbIntensity}
                    state={hasWorkspaces ? "thinking" : "idle"}
                    interactive
                    {...orbSettings}
                  />
                </div>
              )}
              <p className="orbit-sentence">{hasWorkspaces ? guidance.description : "Your profile learns from the choices you make here."}</p>
            </section>

            <section className="guided-start-panel" aria-label="Start here">
              <div>
                <span className="object-label">START HERE</span>
                <h2>{hasWorkspaces ? guidance.label : "Start by using NeuralNexus."}</h2>
                <p>{hasWorkspaces ? guidance.description : "Ask a question, choose what feels right or edit an answer. Your profile grows from real preferences."}</p>
              </div>
              <div className="guided-start-steps" aria-label="How it works">
                <span><strong>1</strong> Ask a normal question</span>
                <span><strong>2</strong> Choose what feels right</span>
                <span><strong>3</strong> Export when it becomes useful</span>
              </div>
            </section>

            {hasWorkspaces && (
              <section className="orbit-workspace-field" aria-label="Workspace field">
                {projects.slice(0, 8).map((project) => {
                  const mode = inferMode(project);
                  return (
                    <button
                      key={project.id}
                      className="orbit-workspace-object"
                      onClick={() => descendToSystem(project.id)}
                      disabled={transitionLocked}
                    >
                      <span className="nn-chip-emboss">WORKSPACE</span>
                      <strong>{project.name}</strong>
                      <small>{mode.output}</small>
                    </button>
                  );
                })}
                {projects.length > 8 && (
                  <button className="orbit-workspace-object is-quiet" onClick={() => setActiveShelf("vault")}>
                    All workspaces
                  </button>
                )}
              </section>
            )}

            <section className="orbit-primary">
              {hasWorkspaces ? (
                <PremiumSlideAction
                  label="Slide to start session"
                  completionText="Opening workspace"
                  loading={sessionState === "loading"}
                  completed={sessionState === "complete"}
                  onComplete={startWorkspaceSession}
                />
              ) : (
                <>
                  <HeroCTA onClick={() => setView("chat")}>
                    <MessageCircle size={18} /> Open chat
                  </HeroCTA>
                  <button className="profile-secondary-action" type="button" onClick={() => setWizardOpen(true)}>Create a workspace</button>
                </>
              )}
            </section>

            <section className="home-context-strip" aria-label="Workspace context">
              <button onClick={() => setActiveShelf("vault")}><RollingNumber value={projects.length} /> workspaces</button>
              <button onClick={() => setActiveShelf("skills")}><RollingNumber value={skills.length} /> skills</button>
              <button onClick={() => setActiveShelf("vault")}><RollingNumber value={formatUsd(usage.month)} /> this month</button>
              <button onClick={() => setWhyOpen(true)}>{POSITIONING_UI.home.whyLabel}</button>
            </section>
          </div>
        )}

        {altitude.level === 1 && selectedWorkspace && (
          <div className="craft-focus">
            <header className="craft-header">
              <span className="eyebrow">FOCUS</span>
              <h1>{currentOutput?.stepName || workspaceSteps[0]?.name || selectedWorkspaceMode.steps[0]}</h1>
              <p>{currentOutput ? "Review, revise, finalize or fork this output." : "One task. One output. No extra workspace chrome."}</p>
            </header>
            <section className="craft-body">
              {currentOutput ? (
                <OutputCard
                  output={currentOutput}
                  onRefine={(content, instruction) => runNextStep(`previous output:\n${content}\n\nRefine instruction: ${instruction}`)}
                  onRegenerate={() => runNextStep()}
                  onFinalize={(content) => saveAsFinal(content)}
                  onFork={forkOutput}
                />
              ) : stepState === "loading" ? (
                <Crucible
                  projectId={selectedWorkspace.id}
                  stepName={workspaceSteps[0]?.name ?? selectedWorkspaceMode.steps[0]}
                  stepDescription={workspaceSteps[0]?.description ?? selectedWorkspaceMode.purpose}
                  userInput={crucibleInput}
                  skillId={skills[0]?.id}
                  checklist={checklist}
                  strictFacts={keys[`STRICT_FACTS_${selectedWorkspace.id}`] === "1"}
                  onCancel={() => setStepState("idle")}
                  onFinal={async (data) => {
                    setCurrentOutput({
                      id: data.outputId,
                      stepName: workspaceSteps[0]?.name ?? selectedWorkspaceMode.steps[0],
                      model: data.model,
                      provider: data.provider,
                      costUsd: data.costUsd,
                      content: data.content,
                      skillVersion: skills[0]?.version ?? 1,
                      qualityReport: data.qualityReport,
                      claims: data.claims,
                      claimsJson: data.claims ? JSON.stringify(data.claims) : "",
                      trustUnavailable: data.trustUnavailable,
                    });
                    await loadOutputs(selectedWorkspace.id);
                    await loadStream();
                    setStepState("complete");
                  }}
                />
              ) : (
                <div className="action-panel craft-run-panel">
                  <span className="object-label">NEXT STEP</span>
                  <h3>{workspaceSteps[0]?.name ?? selectedWorkspaceMode.steps[0]}</h3>
                  <p>{workspaceSteps[0]?.description ?? selectedWorkspaceMode.purpose}</p>
                  <PremiumSlideAction
                    label="Slide to run"
                    completionText="Step prepared"
                    loading={false}
                    completed={stepState === "complete"}
                    onComplete={() => runNextStep()}
                  />
                </div>
              )}
            </section>
          </div>
        )}

        {altitude.level !== 1 && view === "workspaces" && (
          <div className="screen-stack altitude-system">
            <header className="screen-header">
              <div>
                <span className="eyebrow">WORKSPACE</span>
                <h1>{selectedWorkspace?.name || "Reusable execution systems"}</h1>
                <p>{selectedWorkspace?.goal || "One workspace: spine, next step, outputs and client mode."}</p>
              </div>
              <button className="primary-pill" onClick={() => setWizardOpen(true)}>
                <Plus size={18} /> Create workspace
              </button>
            </header>

            {!hasWorkspaces ? (
              <div className="empty-state">
                <WorkspaceObject mode={selectedMode} />
                <h2>No workspaces yet.</h2>
                <p>{POSITIONING_UI.emptyStates.workspaces}</p>
                <button className="primary-pill" onClick={() => setWizardOpen(true)}>
                  <Plus size={18} /> Create workspace
                </button>
              </div>
            ) : (
              <div className="workspace-layout">
                <div className="workspace-list">
                  {projects.map((project) => {
                    const mode = inferMode(project);
                    const active = selectedWorkspace?.id === project.id;
                    return (
                      <AuraCard
                        key={project.id}
                        variant="bloom"
                        className={`workspace-card aura-soft ${active ? "is-selected" : ""}`}
                        onClick={() => {
                          setSelectedWorkspaceId(project.id);
                          setAltitude({ level: 2, workspaceId: project.id });
                          setWorkspacePanel("overview");
                        }}
                      >
                        <span className="nn-chip-emboss">WORKSPACE</span>
                        <h3>{project.name}</h3>
                        <p>{mode.output}</p>
                        <div className="card-meta workspace-card-meta">
                          <span>{mode.skills.length} skills</span>
                          <span>0 sources</span>
                          <span>{timeAgo(project.createdAt)}</span>
                        </div>
                      </AuraCard>
                    );
                  })}
                </div>

                {selectedWorkspace && (
                  <article className="workspace-detail liquid-panel">
                    <div className="detail-top">
                      <div>
                        <span className="object-label">WORKSPACE</span>
                        <h2>{selectedWorkspace.name}</h2>
                        <p>{selectedWorkspace.goal || selectedWorkspaceMode.purpose}</p>
                      </div>
                      <div className="status-stack">
                        <span>Strategic</span>
                        <span>{clientMode ? "Client Mode active" : "Internal mode"}</span>
                      </div>
                    </div>

                    <div className="detail-tabs">
                      {(["overview", "workflow", "outputs", "client"] as WorkspacePanel[]).map((panel) => (
                        <button
                          key={panel}
                          className={workspacePanel === panel ? "is-active" : ""}
                          onClick={() => setWorkspacePanel(panel)}
                        >
                          {panel}
                        </button>
                      ))}
                    </div>

                    {workspacePanel === "overview" && (
                      <div className="workspace-overview-focus">
                        <section className="next-step-card liquid-card" onClick={() => descendToCraft("next-step")}>
                          <span className="object-label">NEXT STEP</span>
                          <h3>{selectedWorkspaceMode.steps[0]}</h3>
                          <p>{guidance.view === "workspaces" ? guidance.description : selectedWorkspaceMode.purpose}</p>
                          <PremiumSlideAction
                            label="Slide to run next step"
                            completionText="Step prepared"
                            estimatedCost="$0.03-$0.09"
                            loading={stepState === "loading"}
                            completed={stepState === "complete"}
                            onComplete={() => runNextStep()}
                          />
                        </section>
                        <section className="last-output-card liquid-card">
                          <span className="object-label">LAST OUTPUT</span>
                          <p>{POSITIONING_UI.emptyStates.outputs}</p>
                          <button className="quiet-link" onClick={() => outputs[0] ? void openOutput(outputs[0]) : setWorkspacePanel("outputs")}>View output</button>
                        </section>
                      </div>
                    )}

                    {workspacePanel === "workflow" && (
                      <div className="action-panel">
                        <span className="object-label">NEXT STEP</span>
                        <h3>{workspaceSteps[0]?.name ?? selectedWorkspaceMode.steps[0]}</h3>
                        <p>This step turns rough audience notes into a precise profile and gives the workspace a useful direction.</p>
                        <div className="run-summary">
                          <span>Active Skill: {selectedWorkspaceMode.skills[0]}</span>
                          <span>Mode: Strategic · Premium</span>
                          <span>Estimated cost: $0.03-$0.09</span>
                        </div>
                        <div className="checklist-editor">
                          <span className="object-label">QUALITY GATES</span>
                          <p className="muted-helper">{POSITIONING_UI.microcopy.qualityGates}</p>
                          <label className="strict-facts-toggle">
                            <span>
                              <strong>Strict facts</strong>
                              <small>External claims get cross-examined by a second provider before you see them.</small>
                            </span>
                            <input
                              type="checkbox"
                              checked={keys[`STRICT_FACTS_${selectedWorkspace.id}`] === "1"}
                              onChange={(event) => setStrictFacts(selectedWorkspace.id, event.target.checked)}
                            />
                          </label>
                          <div className="check-chip-row">
                            {checklist.map((check) => (
                              <button key={check} onClick={() => setChecklist((items) => items.filter((item) => item !== check))}>{check} <X size={12} /></button>
                            ))}
                          </div>
                          {checklist.length < 5 && (
                            <div className="refine-row">
                              <input value={newCheck} onChange={(event) => setNewCheck(event.target.value.slice(0, 120))} placeholder="Add check" />
                              <button onClick={() => { if (newCheck.trim()) setChecklist((items) => [...items, newCheck.trim()].slice(0, 5)); setNewCheck(""); }}>Add check</button>
                            </div>
                          )}
                        </div>
                        {stepState === "loading" && selectedWorkspace ? (
                          <Crucible
                            projectId={selectedWorkspace.id}
                            stepName={workspaceSteps[0]?.name ?? selectedWorkspaceMode.steps[0]}
                            stepDescription={workspaceSteps[0]?.description ?? selectedWorkspaceMode.purpose}
                            userInput={crucibleInput}
                            skillId={skills[0]?.id}
                            checklist={checklist}
                            strictFacts={keys[`STRICT_FACTS_${selectedWorkspace.id}`] === "1"}
                            onCancel={() => setStepState("idle")}
                            onFinal={async (data) => {
                              setCurrentOutput({
                                id: data.outputId,
                                stepName: workspaceSteps[0]?.name ?? selectedWorkspaceMode.steps[0],
                                model: data.model,
                                provider: data.provider,
                                costUsd: data.costUsd,
                                content: data.content,
                                skillVersion: skills[0]?.version ?? 1,
                                qualityReport: data.qualityReport,
                                claims: data.claims,
                                claimsJson: data.claims ? JSON.stringify(data.claims) : "",
                                trustUnavailable: data.trustUnavailable,
                              });
                              await loadOutputs(selectedWorkspace.id);
                              setStepState("complete");
                              setWorkspacePanel("outputs");
                            }}
                          />
                        ) : (
                          <WorkflowSpine
                            steps={workspaceSteps}
                            outputs={outputs}
                            built={builtMaterialization}
                            running={stepState === "loading"}
                            completed={stepState === "complete"}
                            onRun={() => runNextStep()}
                          />
                        )}
                      </div>
                    )}

                    {workspacePanel === "outputs" && (
                      <div className="action-panel">
                        {currentOutput ? (
                          <OutputCard
                            output={currentOutput}
                            onRefine={(content, instruction) => runNextStep(`previous output:\n${content}\n\nRefine instruction: ${instruction}`)}
                            onRegenerate={() => runNextStep()}
                            onFinalize={(content) => saveAsFinal(content)}
                            onFork={forkOutput}
                          />
                        ) : outputs.length ? (
                          <LineageCanvas outputs={outputs} onOpen={(output) => void openOutput(output)} />
                        ) : (
                          <div className="empty-inline">
                            <p>{POSITIONING_UI.emptyStates.outputs}</p>
                            <button className="secondary-pill" onClick={() => descendToCraft("next-step")}>Run first step</button>
                          </div>
                        )}
                      </div>
                    )}

                    {workspacePanel === "client" && (
                      <div className="action-panel">
                        <span className="object-label">CLIENT MODE</span>
                        <h3>Package this workspace for a client, audience or customer.</h3>
                        <p>Clients can follow your guided workflow, answer structured questions and receive outputs shaped by your method.</p>
                        <div className="privacy-list">
                          <span><Check size={15} /> Workflow and approved outputs are prepared for client access.</span>
                          <span><Lock size={15} /> Internal notes, API keys, cost settings and draft skills stay private.</span>
                          {clientMode && <span><Archive size={15} /> Sharing controls are prepared for the next release.</span>}
                        </div>
                        <PremiumSlideAction
                          label="Slide to activate client mode"
                          completionText="Client Mode active"
                          loading={clientState === "loading"}
                          completed={clientMode || clientState === "complete"}
                          disabled={clientMode}
                          onComplete={activateClientMode}
                        />
                      </div>
                    )}
                  </article>
                )}
              </div>
            )}
          </div>
        )}

        {view === "chat" && (
          <div className={`aurora-chat ${generalMessages.length === 0 ? "is-zero" : "has-messages"} ${generalBusy ? "is-generating" : ""}`}>
            {generalBusy && <div className="generation-edge" aria-hidden="true" />}
            <div className="chat-topbar">
              <strong>{selectedWorkspace?.name ? selectedWorkspace.name : "Quick chat"}</strong>
              <details className="chat-menu">
                <summary aria-label="Chat options">⋯</summary>
                <button type="button" onClick={() => setGeneralMessages([])} disabled={generalMessages.length === 0}>Clear conversation</button>
                <button type="button">Export</button>
              </details>
            </div>

            {generalMessages.length === 0 && (
              <section className="chat-zero-copy">
                <p>Hello, {userName || "there"}</p>
                <h1>What should your AI learn about you today?</h1>
              </section>
            )}

            <section className="chat-stream" aria-live="polite">
              {generalMessages.map((message, index) => (
                <article key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
                  {message.role === "assistant" && (
                    <div className="assistant-provenance">
                      <AuroraDisc size={20} />
                      <span>{message.model || "Wizard"}</span>
                    </div>
                  )}
                  <p className={message.role === "assistant" && index === generalMessages.length - 1 && generalBusy ? "is-streaming" : ""}>{message.content}</p>
                  {message.role === "assistant" && (
                    <MessageActions
                      text={message.content}
                      onRegenerate={() => void regenerateChatMessage(index)}
                      onFeedback={(signal) => void recordChatFeedback(index, message, signal)}
                      selectedSignals={chatFeedback[chatFeedbackKey(index, message.content)] ?? []}
                      disabled={generalBusy}
                    />
                  )}
                </article>
              ))}
              {profileReadyPrompt && (
                <div className="profile-ready-line" role="status">
                  <span>Your profile is ready to export.</span>
                  <button type="button" onClick={() => { setView("usage"); setProfileReadyPrompt(false); }}>
                    Open Your Profile
                  </button>
                </div>
              )}
              {generalBusy && (
                <div className="thinking-indicator" role="status" aria-live="polite">
                  <AuroraDisc size={20} />
                  <span>Thinking through your request</span>
                  <i />
                  <i />
                  <i />
                </div>
              )}
            </section>

              {generalAttachments.length > 0 && (
                <div className="source-list chat-attachment-list">
                  {generalAttachments.map((source) => (
                    <div key={source.id} className="source-chip">
                      {source.kind === "image" ? <ImageIcon size={15} /> : source.kind === "text" ? <FileText size={15} /> : <FileIcon size={15} />}
                      <span>{source.name}</span>
                      <button onClick={() => setGeneralAttachments((items) => items.filter((item) => item.id !== source.id))} aria-label={`Remove ${source.name}`}><X size={13} /></button>
                      {source.dataUrl && <img src={source.dataUrl} alt="" />}
                    </div>
                  ))}
                </div>
              )}

              {!apiKeyReady && (
                <div className="key-notice-chip">
                  <span>Connect a model to get answers.</span>
                  <button type="button" onClick={() => setSettingsOpen(true)}>Add key</button>
                </div>
              )}

              <motion.div className="chat-composer-shell aurora-focus" layoutId="nn-composer">
                <div className={`free-chat-composer hero-composer af-field ${generalInput.trim() ? "is-charged" : "is-empty"} ${generalBusy ? "is-sending" : ""}`}>
                  <label className="chat-file-button">
                    <Upload size={16} />
                    <input type="file" multiple accept=".txt,.md,.csv,.json,.html,.css,.js,.ts,.tsx,.pdf,image/*" onChange={(event) => event.target.files && void readGeneralChatFiles(event.target.files)} />
                  </label>
                  <textarea
                    value={generalInput}
                    onChange={(event) => setGeneralInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        void sendGeneralChat();
                      }
                    }}
                    placeholder="Ask a question. Cmd+Enter sends."
                    rows={3}
                  />
                  <button className={`primary-pill chat-send-button ${generalInput.trim() ? "is-charged" : "is-empty"}`} onClick={() => void sendGeneralChat()} disabled={generalBusy || (!generalInput.trim() && generalAttachments.length === 0)}>
                    {generalBusy && <span className="thinking-button-dot" aria-hidden="true" />}
                    {generalBusy ? "Thinking" : "Send"} <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
          </div>
        )}

        {view === "skills" && (
          <CollectionScreen
            eyebrow="SKILLS"
            title="Packaged intellectual products"
            description={POSITIONING_UI.emptyStates.skills}
          >
            {(skills.length ? skills : [
              { id: "brand-critic", name: "Brand Critic", description: "Finds weak positioning, generic messaging and visual inconsistencies." },
              { id: "offer-architect", name: "Offer Architect", description: "Turns rough expertise into a sharp, sellable offer structure." },
              { id: "copy-editor", name: "Copy Critic", description: "Improves clarity, specificity and conversion intent." },
            ]).map((skill) => (
              <AuraCard key={skill.id} variant="bloom" className="skill-card" onClick={() => setGenomeSkill(skill)}>
                <span className="skill-icon-badge" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3.75L13.75 10.25L20.25 12L13.75 13.75L12 20.25L10.25 13.75L3.75 12L10.25 10.25L12 3.75Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="skill-card-copy">
                  <h3>{skill.name}</h3>
                  <p>{skill.description}</p>
                  <span className="skill-micro">GENOME V{skill.version ?? 1} · CRITICAL</span>
                </div>
                <span className="skill-card-footer">
                  <span className="skill-card-link">Open Genome <i aria-hidden="true">→</i></span>
                </span>
              </AuraCard>
            ))}
          </CollectionScreen>
        )}

        {view === "eye" && <EyeView />}

        {view === "templates" && (
          <CollectionScreen
            eyebrow="TEMPLATES"
            title="Premium workspace library"
            description="Start from a valuable system, then adapt the knowledge, skills and workflow to your method."
          >
            <AuraCard variant="leak" className="template-card instant-workspace-card instant-aura-card">
              <span className="instant-spark" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3.75L13.75 10.25L20.25 12L13.75 13.75L12 20.25L10.25 13.75L3.75 12L10.25 10.25L12 3.75Z" stroke="url(#nn-aurora)" strokeWidth="1.7" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="nn-chip-emboss">INSTANT WORKSPACE</span>
              <h3>Turn any PDF, method or prompt pack into a runnable workspace.</h3>
              <button className="primary-pill instant-extract-button" onClick={() => setExtractorOpen(true)}>Extract now</button>
            </AuraCard>
            {templateCards.map((template) => (
              <AuraCard key={template.name} variant="leak" className="template-card template-aura-card">
                <span className="nn-chip-emboss">{template.category}</span>
                <h3>{template.name}</h3>
                <p>{template.forWho}</p>
                <button
                  className="secondary-pill"
                  onClick={() => {
                    const match = workspaceModes.find((mode) => template.name.toLowerCase().includes(mode.id)) ?? workspaceModes[0];
                    setSelectedModeId(match.id);
                    setWizardOpen(true);
                  }}
                >
                  Use template <ChevronRight size={16} />
                </button>
              </AuraCard>
            ))}
          </CollectionScreen>
        )}

        {view === "knowledge" && (
          <CollectionScreen
            eyebrow="KNOWLEDGE"
            title="Source material for reusable work"
            description={POSITIONING_UI.emptyStates.knowledge}
          >
            {starterKnowledge.map((source) => (
              <div key={source} className="knowledge-card liquid-card">
                <BookOpen size={22} />
                <h3>{source}</h3>
                <p>Ready to link into a workspace knowledge set.</p>
              </div>
            ))}
          </CollectionScreen>
        )}

        {view === "usage" && (
          <div className="screen-stack">
            <VaultIntro onOpenEye={() => setView("eye")} onOpenSkills={() => setView("skills")} />
            {FEATURE_FLAGS.autopilot && <header className="screen-header">
              <div>
              <span className="eyebrow">COSTS & AUTOPILOT</span>
                <h1>Cost clarity for serious work</h1>
                <p>Understand model usage, budget posture and cost per workspace output.</p>
              </div>
              <button className="secondary-pill" onClick={exportUsageCsv} disabled={usage.models.length === 0}>
                <Download size={16} /> Export CSV
              </button>
            </header>}
            {FEATURE_FLAGS.autopilot && <div className="usage-grid">
              <Stat label="Today" value={<RollingNumber value={formatUsd(usage.today)} />} />
              <Stat label="This month" value={<RollingNumber value={formatUsd(usage.month)} />} />
              <Stat label="Estimated Auto-Routing Savings" value={<RollingNumber value={formatUsd(usage.estimatedSavings)} />} />
            </div>}
            {FEATURE_FLAGS.autopilot && <section className="liquid-panel usage-panel">
              <div className="section-head">
                <span>AUTOPILOT</span>
                  <small>{POSITIONING_UI.microcopy.autopilot}</small>
              </div>
              {autopilot.disabled ? (
                <div className="empty-inline"><p>Autopilot needs a connected model.</p></div>
              ) : autopilot.recommendations?.length ? (
                <div className="collection-grid">
                  {autopilot.recommendations.map((recommendation) => selectedWorkspace && (
                    <AutopilotCard key={`${recommendation.stepName}-${recommendation.toModel}`} recommendation={recommendation} projectId={selectedWorkspace.id} onApplied={() => loadAutopilot(selectedWorkspace.id)} />
                  ))}
                </div>
              ) : (
                <div className="empty-inline"><p>{POSITIONING_UI.microcopy.autopilot}</p></div>
              )}
              {autopilot.policies?.length > 0 && (
                <div className="model-table">
                  {autopilot.policies.map((policy) => (
                    <div className="model-row" key={policy.id}>
                      <span>{policy.stepName} → {policy.model}</span>
                      <button onClick={async () => { await fetch("/api/autopilot", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: policy.projectId, stepName: policy.stepName }) }); await loadAutopilot(policy.projectId); }}>Revert</button>
                    </div>
                  ))}
                </div>
              )}
            </section>}
            <section className="liquid-panel usage-panel ground-truth-panel">
              <div className="section-head">
                <span>GROUND TRUTH</span>
                <small>Hallucination map</small>
              </div>
              {truthMap && truthMap.totalCorrections > 0 ? (
                <div className="truth-map">
                  <p>Your corrections: <RollingNumber value={truthMap.totalCorrections} /> — each one trains this workspace's truth layer.</p>
                  {truthMap.activeGuards > 0 && <strong>{truthMap.activeGuards} guard{truthMap.activeGuards === 1 ? "" : "s"} now injected into every matching generation.</strong>}
                  {truthMap.byModel.map((item) => (
                    <article key={item.model}>
                      <span>{item.model} · {item.count} corrected</span>
                      {item.topWarnings.map((warning) => <small key={warning}>{warning}</small>)}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-inline"><p>No corrections yet. Mark a wrong claim in any output — the layer learns from you.</p></div>
              )}
            </section>
            {FEATURE_FLAGS.autopilot && <div className="usage-layout">
              <div className="liquid-panel usage-panel">
                <div className="section-head">
                  <span>7-DAY COSTS</span>
                  <small>Estimated from tracked model runs</small>
                </div>
                <UsageBars days={usage.days} />
              </div>
              <div className="liquid-panel usage-panel">
                <div className="section-head">
                  <span>MODEL DISTRIBUTION</span>
                  <small>{usage.models.length} models</small>
                </div>
                {usage.models.length > 0 ? (
                  <div className="model-table">
                    <div className="model-table-head">
                      <span>Model</span>
                      <span>Calls</span>
                      <span>Tokens</span>
                      <span>Cost</span>
                      <span>Share</span>
                    </div>
                    {usage.models.map((model) => {
                      const share = costs.total ? (model.cost / costs.total) * 100 : 0;
                      return (
                        <div key={model.model} className="model-row">
                          <span><ProviderDot provider={model.provider} /> {model.model}</span>
                          <span>{model.calls}</span>
                          <span>{model.inputTokens + model.outputTokens}</span>
                          <strong>{formatUsd(model.cost)}</strong>
                          <span>{share.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-inline">
                    <BarChart3 size={22} />
                    <p>No model runs tracked yet. Usage appears here once workspaces generate live outputs.</p>
                    <button className="secondary-pill" onClick={() => setView("workspaces")}>Open workspaces</button>
                  </div>
                )}
              </div>
            </div>}
          </div>
        )}
        </motion.div>
        </AnimatePresence>
      </section>

      <ShelfPanel
        shelf={activeShelf}
        title={activeShelf === "skills" ? "Skills" : activeShelf === "templates" ? "Templates" : activeShelf === "knowledge" ? "Knowledge" : activeShelf === "vault" ? "Your Profile" : activeShelf === "chat" ? "Quick Chat" : activeShelf === "stream" ? "Stream" : "Settings"}
        onClose={() => setActiveShelf(null)}
      >
        {activeShelf === "skills" && (
          <div className="shelf-list">
            {(skills.length ? skills : [
              { id: "brand-critic", name: "Brand Critic", description: "Finds weak positioning, generic messaging and visual inconsistencies." },
              { id: "offer-architect", name: "Offer Architect", description: "Turns rough expertise into a sharp, sellable offer structure." },
              { id: "copy-editor", name: "Copy Critic", description: "Improves clarity, specificity and conversion intent." },
            ]).map((skill) => (
              <button key={skill.id} className="shelf-row" onClick={() => setGenomeSkill(skill)}>
                <strong>{skill.name}</strong>
                <span>{skill.description}</span>
              </button>
            ))}
          </div>
        )}
        {activeShelf === "templates" && (
          <div className="shelf-list">
            <button className="shelf-row is-primary" onClick={() => { setExtractorOpen(true); setActiveShelf(null); }}>
              <strong>Instant Workspace</strong>
              <span>Extract steps, skills and knowledge from your material.</span>
            </button>
            {templateCards.map((template) => (
              <button
                key={template.name}
                className="shelf-row"
                onClick={() => {
                  const match = workspaceModes.find((mode) => template.name.toLowerCase().includes(mode.id)) ?? workspaceModes[0];
                  setSelectedModeId(match.id);
                  setActiveShelf(null);
                  setWizardOpen(true);
                }}
              >
                <strong>{template.name}</strong>
                <span>{template.forWho}</span>
              </button>
            ))}
          </div>
        )}
        {activeShelf === "knowledge" && (
          <div className="shelf-list">
            {starterKnowledge.map((source) => (
              <div key={source} className="shelf-row">
                <strong>{source}</strong>
                <span>Ready to link into a workspace knowledge set.</span>
              </div>
            ))}
            <button className="secondary-pill" onClick={() => { setActiveShelf(null); setExtractorOpen(true); }}>Extract from material</button>
          </div>
        )}
        {activeShelf === "vault" && (
          <div className="shelf-list">
            <div className="shelf-row">
              <strong>Your profile</strong>
              <span>{workspaceSummary}</span>
            </div>
            <div className="shelf-row">
              <strong>{formatUsd(usage.month)} this month</strong>
              <span>Real choices, learned rules, truth and taste live here.</span>
            </div>
            <button className="secondary-pill" onClick={() => { setActiveShelf(null); setView("usage"); }}>Open full profile</button>
          </div>
        )}
        {activeShelf === "chat" && (
          <div className="shelf-chat">
            <textarea
              value={generalInput}
              onChange={(event) => setGeneralInput(event.target.value)}
              placeholder="Ask a quick question."
              rows={5}
            />
            <button className="primary-pill" disabled={generalBusy || !generalInput.trim()} onClick={() => void sendGeneralChat()}>
              {generalBusy ? "Thinking" : "Ask"}
            </button>
            {generalMessages.slice(-2).map((message, index) => (
              <div key={`${message.role}-${index}`} className={`shelf-chat-message ${message.role}`}>{message.content}</div>
            ))}
          </div>
        )}
        {activeShelf === "stream" && (
          <DecisionStream
            items={streamItems}
            onRefresh={async () => { await loadStream(); if (selectedWorkspace?.id) await loadOutputs(selectedWorkspace.id); }}
            onRevise={(item) => {
              setActiveShelf(null);
              if (item.projectId) {
                setSelectedWorkspaceId(item.projectId);
                setView("workspaces");
                setWorkspacePanel("outputs");
              }
              if (item.outputId) {
                const found = outputs.find((output) => output.id === item.outputId);
                if (found) void openOutput(found);
                else descendToCraft(item.outputId);
              } else {
                descendToCraft("next-step");
              }
            }}
          />
        )}
      </ShelfPanel>

      <nav className="mobile-tabbar" aria-label="Mobile navigation">
        {mobilePrimaryNav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={view === item.id ? "is-active" : ""}
              onClick={() => {
                setView(item.id as View);
                setMoreOpen(false);
              }}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button className={mobileMoreNav.some((item) => item.id === view) || settingsOpen ? "is-active" : ""} onClick={() => setMoreOpen(true)}>
          <Boxes size={19} />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="mobile-more-backdrop" role="dialog" aria-modal="true" onClick={() => setMoreOpen(false)}>
          <div className="mobile-more-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="floating-wizard-head">
              <span>More</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Close More"><X size={15} /></button>
            </div>
            {mobileMoreNav.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => { setView(item.id as View); setMoreOpen(false); }}>
                  <Icon size={17} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button onClick={() => { setSettingsOpen(true); setMoreOpen(false); }}>
              <Settings size={17} />
              <span>Settings</span>
            </button>
            <button onClick={() => { setWhyOpen(true); setMoreOpen(false); }}>
              <Compass size={17} />
              <span>{POSITIONING_UI.home.whyLabel}</span>
            </button>
            <div className="mobile-appearance-row">
              <span>Appearance</span>
              <ThemeSegmentedControl />
            </div>
          </div>
        </div>
      )}

      {wizardOpen && (
        <div className="wizard-backdrop" role="dialog" aria-modal="true">
          <div className="wizard-modal guided-wizard-modal">
            <button className="modal-close" onClick={() => setWizardOpen(false)}>Close</button>
            <div className="guided-wizard-head">
              <span className="eyebrow">CREATE WORKSPACE</span>
              <div className="wizard-progress">
                {(["type", "audience", "source", "purpose", "review"] as WorkspaceWizardStep[]).map((step) => (
                  <span key={step} className={wizardStep === step ? "is-active" : ""} />
                ))}
              </div>
            </div>
            <div key={wizardStep} className="guided-wizard-step">
              {wizardStep === "type" && (
                <>
                  <h2>{POSITIONING_UI.onboarding.typeHeading}</h2>
                  <p>Pick the closest mode. You can refine the exact workspace in the next steps.</p>
                  <ModeSelector selectedId={selectedModeId} onSelect={(id) => { setSelectedModeId(id); setTimeout(() => setWizardStep("audience"), 180); }} />
                </>
              )}

              {wizardStep === "audience" && (
                <>
                  <h2>Who is this workspace for?</h2>
                  <p>One clear audience keeps the AI system useful instead of generic.</p>
                  <label className="guided-field aurora-focus">
                    Audience
                    <input
                      autoFocus
                      value={workspaceAudience}
                      onChange={(event) => setWorkspaceAudience(event.target.value)}
                      onKeyDown={(event) => { if (event.key === "Enter") nextWizardStep(); }}
                      placeholder="Founders, designers, consultants..."
                    />
                  </label>
                </>
              )}

              {wizardStep === "source" && (
                <>
                  <h2>What should it learn from?</h2>
                  <p>Add notes, prompts, PDFs or images. Text files are read immediately; images are attached as visual context.</p>
                  <button className="liquid-card extractor-option" onClick={() => setExtractorOpen(true)}>
                    <span className="object-label">EXTRACT FROM DOCUMENT</span>
                    <strong>Fastest: we build steps and skills from your material.</strong>
                  </button>
                  <label
                    className="file-drop-zone"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      void readWorkspaceFiles(event.dataTransfer.files);
                    }}
                  >
                    <Upload size={22} />
                    <span>Drop files here or choose files</span>
                    <small>Text, Markdown, CSV, JSON, images and PDFs</small>
                    <input type="file" multiple accept=".txt,.md,.csv,.json,.html,.css,.js,.ts,.tsx,.pdf,image/*" onChange={(event) => event.target.files && void readWorkspaceFiles(event.target.files)} />
                  </label>
                  <label className="guided-field aurora-focus">
                    Quick source note
                    <textarea
                      value={workspaceSourceNote}
                      onChange={(event) => setWorkspaceSourceNote(event.target.value)}
                      placeholder="Paste a short method, prompt, client brief or framework..."
                      rows={4}
                    />
                  </label>
                  {workspaceSources.length > 0 && (
                    <div className="source-list">
                      {workspaceSources.map((source) => (
                        <div key={source.id} className="source-chip">
                          {source.kind === "image" ? <ImageIcon size={15} /> : source.kind === "text" ? <FileText size={15} /> : <FileIcon size={15} />}
                          <span>{source.name}</span>
                          <button onClick={() => setWorkspaceSources((items) => items.filter((item) => item.id !== source.id))} aria-label={`Remove ${source.name}`}><X size={13} /></button>
                          {source.dataUrl && <img src={source.dataUrl} alt="" />}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {wizardStep === "purpose" && (
                <>
                  <h2>What should the workspace produce?</h2>
                  <p>Write the outcome in plain language. This becomes the workspace's operating direction.</p>
                  <label className="guided-field aurora-focus">
                    Workspace name
                    <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
                  </label>
                  <label className="guided-field aurora-focus">
                    Purpose
                    <textarea
                      autoFocus
                      value={workspaceIntent}
                      onChange={(event) => setWorkspaceIntent(event.target.value)}
                      rows={4}
                      placeholder="A reusable system that helps..."
                    />
                  </label>
                </>
              )}

              {wizardStep === "review" && (
                <>
                  <h2>Your workspace is ready.</h2>
                  <p>{POSITIONING_UI.onboarding.reviewLine}</p>
                  <div className="summary-card guided-summary">
                    <span className="object-label">{selectedMode.label} WORKSPACE</span>
                    <strong>{workspaceName}</strong>
                    <span>For: {workspaceAudience}</span>
                    <span>Includes: {selectedMode.skills.join(" · ")} · {selectedMode.steps.length} workflow steps</span>
                    <span>Sources: {workspaceSources.length ? workspaceSources.map((source) => source.name).join(", ") : workspaceSourceNote ? "Quick note" : "No source yet"}</span>
                    <span>Mode: Strategic · Premium</span>
                  </div>
                  <PremiumSlideAction
                    label="Slide to build workspace"
                    completionText="Workspace created"
                    loading={buildState === "loading"}
                    completed={buildState === "complete"}
                    onComplete={buildWorkspace}
                  />
                </>
              )}
            </div>
            <div className="guided-wizard-footer">
              <button className="secondary-pill" onClick={previousWizardStep} disabled={wizardStep === "type"}>
                <ArrowLeft size={16} /> Back
              </button>
              {wizardStep !== "review" && (
                <button className="primary-pill" onClick={nextWizardStep}>
                  Continue <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {commandOpen && (
        <div className="command-backdrop" role="dialog" aria-modal="true" aria-label="Command center" onClick={() => setCommandOpen(false)}>
          <div className="command-panel" onClick={(event) => event.stopPropagation()}>
            <div className="command-input-row aurora-focus af-field">
              <Sparkles size={18} />
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => {
                  setCommandQuery(event.target.value);
                  setCommandIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runCommand(filteredCommands[commandIndex]);
                  }
                }}
                placeholder="Search workspaces, skills, templates and actions"
              />
              <kbd>Esc</kbd>
            </div>
            <div className="command-list">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((item, index) => (
                  <button
                    key={`${item.group}-${item.id}`}
                    className={`command-item ${index === commandIndex ? "is-active" : ""}`}
                    onMouseEnter={() => setCommandIndex(index)}
                    onClick={() => runCommand(item)}
                  >
                    <span>
                      <small>{item.group}</small>
                      <strong>{item.label}</strong>
                    </span>
                    <em>{item.hint}</em>
                  </button>
                ))
              ) : (
                <div className="empty-inline command-empty">
                  <Sparkles size={22} />
                  <p>No command found. Try “workspace”, “usage” or “template”.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {genomeSkill && <GenomePanel skill={genomeSkill} onClose={() => setGenomeSkill(null)} />}

      <WhySheet
        open={whyOpen}
        hasWorkspaces={hasWorkspaces}
        onClose={() => setWhyOpen(false)}
        onCreate={() => {
          setWhyOpen(false);
          setWizardOpen(true);
        }}
      />

      <ExtractorSheet
        open={extractorOpen}
        onClose={() => setExtractorOpen(false)}
        onDone={(projectId) => {
          setExtractorOpen(false);
          setWizardOpen(false);
          setSelectedWorkspaceId(projectId);
          setView("workspaces");
          setWorkspacePanel("workflow");
          setBuiltMaterialization(true);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.set("built", "1");
            window.history.pushState({}, "", url.toString());
            window.setTimeout(() => {
              const clean = new URL(window.location.href);
              clean.searchParams.delete("built");
              window.history.replaceState({}, "", clean.toString());
              setBuiltMaterialization(false);
            }, 900);
          }
          void loadData();
        }}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          if (view === "settings") setView("home");
        }}
        keys={keys}
        setKeys={updateKeys}
        costs={costs}
        initialsFrom="NN"
      />
    </main>
    )}
    </MotionConfig>
  );
}

function CollectionScreen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="screen-stack">
      <header className="screen-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      <div className="collection-grid">{children}</div>
    </div>
  );
}

function UsageBars({ days }: { days: { label: string; iso: string; cost: number }[] }) {
  const max = Math.max(0.0001, ...days.map((day) => day.cost));
  return (
    <div className="usage-chart" aria-label="Seven day usage chart">
      <svg viewBox="0 0 700 220" role="img">
        <title>Seven day model costs</title>
        {days.map((day, index) => {
          const width = 58;
          const gap = 42;
          const x = 36 + index * (width + gap);
          const height = Math.max(8, (day.cost / max) * 150);
          const y = 166 - height;
          return (
            <g key={day.iso}>
              <rect className="chart-track" x={x} y={16} width={width} height={150} rx={18} />
              <rect className="chart-bar" x={x} y={y} width={width} height={height} rx={18}>
                <title>{`${day.label}: ${formatUsd(day.cost)}`}</title>
              </rect>
              <text x={x + width / 2} y={198} textAnchor="middle">{day.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

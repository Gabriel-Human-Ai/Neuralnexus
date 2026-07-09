"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Archive,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Boxes,
  Check,
  ChevronRight,
  Compass,
  Database,
  Download,
  Eye,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Layers3,
  Lock,
  MessageCircle,
  Plus,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { PremiumSlideAction } from "@/components/PremiumSlideAction";
import { FloatingWizard } from "@/components/FloatingWizard";
import { DASHBOARD_WIDGETS, DEFAULT_HOME_WIDGETS, type DashboardWidgetId } from "@/lib/dashboardWidgets";
import type { WizardIntent } from "@/lib/wizardActions";

const SettingsModal = dynamic(() => import("@/components/SettingsModal").then((module) => module.SettingsModal), {
  ssr: false,
});
const WizardOrb = dynamic(() => import("@/components/WizardOrb").then((module) => module.WizardOrb), {
  ssr: false,
  loading: () => <div className="wizard-orb-fallback" aria-hidden="true" />,
});

type Project = {
  id: string;
  name: string;
  goal?: string;
  createdAt?: string;
  messages?: { content: string; createdAt: string }[];
};

type Skill = {
  id: string;
  name: string;
  description: string;
  instructions?: string;
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

type View = "home" | "chat" | "workspaces" | "skills" | "templates" | "knowledge" | "usage" | "settings";
type WorkspacePanel = "overview" | "workflow" | "outputs" | "client";
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
  preview: string;
  dataUrl?: string;
};
type GeneralChatMessage = {
  role: "user" | "assistant";
  content: string;
  model?: string;
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
  return workspaceModes.find((mode) => source.includes(mode.id) || source.includes(mode.label.toLowerCase().split(" ")[0])) ?? workspaceModes[1];
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

function HomeWidget({
  title,
  description,
  size,
  children,
}: {
  title: string;
  description: string;
  size: "small" | "medium" | "wide";
  children: React.ReactNode;
}) {
  return (
    <section className={`home-widget liquid-card widget-${size}`}>
      <div className="widget-head">
        <span className="object-label">{title}</span>
        <p>{description}</p>
      </div>
      {children}
    </section>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="nn-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
  const [view, setView] = useState<View>("home");
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [costs, setCosts] = useState<{ runs: any[]; total: number }>({ runs: [], total: 0 });
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
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
  const [clientMode, setClientMode] = useState(false);
  const [clientState, setClientState] = useState<"idle" | "loading" | "complete">("idle");
  const [sessionState, setSessionState] = useState<"idle" | "loading" | "complete">("idle");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [widgetSettingsOpen, setWidgetSettingsOpen] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<DashboardWidgetId[]>(DEFAULT_HOME_WIDGETS);
  const [xrayState, setXrayState] = useState<"idle" | "loading" | "complete">("idle");
  const [askState, setAskState] = useState<"idle" | "loading" | "complete">("idle");
  const [generalMessages, setGeneralMessages] = useState<GeneralChatMessage[]>([]);
  const [generalInput, setGeneralInput] = useState("");
  const [generalBusy, setGeneralBusy] = useState(false);
  const [generalAttachments, setGeneralAttachments] = useState<UploadedSource[]>([]);

  const selectedMode = useMemo(
    () => workspaceModes.find((mode) => mode.id === selectedModeId) ?? workspaceModes[1],
    [selectedModeId],
  );
  const selectedWorkspace = projects.find((project) => project.id === selectedWorkspaceId) ?? projects[0];
  const selectedWorkspaceMode = inferMode(selectedWorkspace);
  const hasWorkspaces = projects.length > 0;
  const runs = useMemo(() => (costs.runs ?? []) as ModelRun[], [costs.runs]);
  const usage = useMemo(() => buildUsageAnalytics(runs), [runs]);
  const userName = (keys.PREFERRED_NAME || keys.FULL_NAME || "").trim().split(/\s+/)[0] || "";
  const apiKeyReady = hasAnyApiKey(keys);
  const homeViewMode = keys.HOME_VIEW_MODE || "balanced";
  const showHomeStatus = keys.WIZARD_HOME_STATUS_ENABLED !== "0";
  const showHomeOrb = keys.WIZARD_HOME_ORB_ENABLED !== "0";
  const floatingWizardEnabled = keys.WIZARD_FLOATING_ENABLED !== "0";
  const orbHue = parseNumberSetting(keys.ORB_HUE, 238);
  const orbSpeed = keys.ORB_BREATHING === "0" ? 1 : parseNumberSetting(keys.ORB_SPEED, 18);
  const orbIntensity = parseNumberSetting(keys.ORB_INTENSITY || keys.ORB_GLOW, 68);
  const widgetDensity = keys.HOME_WIDGET_DENSITY || "comfortable";
  const recentWorkspace = projects[0];
  const wizardStatus = hasWorkspaces
    ? `Your ${recentWorkspace.name} workspace is ready.`
    : apiKeyReady
      ? "Your models are connected. Start with a reusable workspace."
      : "Ready when you are. Start with a workspace or connect models later.";
  const wizardDetail = hasWorkspaces
    ? `Next recommended step: ${inferMode(recentWorkspace).steps[0]}.`
    : "No fake setup required. Build a workspace first, then connect live AI when you need generation.";
  const workspaceSummary = `${projects.length} workspace${projects.length === 1 ? "" : "s"} · ${skills.length} skill${skills.length === 1 ? "" : "s"} · ${runs.length} model run${runs.length === 1 ? "" : "s"}`;

  useEffect(() => {
    void loadData();
    try {
      const stored = window.localStorage.getItem("CMDK_RECENT");
      if (stored) setRecentCommands(JSON.parse(stored).slice(0, 3));
      const storedWidgets = window.localStorage.getItem("HOME_WIDGETS");
      if (storedWidgets) setVisibleWidgets(JSON.parse(storedWidgets));
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
    try {
      window.localStorage.setItem("HOME_WIDGETS", JSON.stringify(visibleWidgets));
    } catch {
      // Widget preferences are local convenience when Settings storage is unavailable.
    }
  }, [visibleWidgets]);

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
    const mode = workspaceModes.find((item) => item.id === selectedModeId);
    if (!mode) return;
    setWorkspaceName(mode.label === "BRAND STRATEGY" ? "Brand Strategy System" : `${mode.label.replace(/\b\w/g, (m) => m.toUpperCase())} Workspace`);
    setWorkspaceAudience(mode.audience);
    setWorkspaceIntent(mode.purpose);
  }, [selectedModeId]);

  useEffect(() => {
    document.title = keys.BRAND_NAME?.trim() || "NeuralNexus";
  }, [keys.BRAND_NAME]);

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
      if (settingsData.HOME_WIDGETS) {
        try { setVisibleWidgets(JSON.parse(settingsData.HOME_WIDGETS)); } catch {}
      }
    }
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
      }),
    });
    await loadData();
    if (created?.id) setSelectedWorkspaceId(created.id);
    setBuildState("complete");
    setTimeout(() => {
      setWizardOpen(false);
      setView("workspaces");
      setWorkspacePanel("overview");
      setBuildState("idle");
      setWizardStep("type");
    }, 650);
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
      if (isPdf) return { id, name: file.name, kind: "pdf" as const, size: file.size, preview: "PDF attached as metadata. PDF parsing is not active in general chat yet." };
      return { id, name: file.name, kind: "file" as const, size: file.size, preview: "File attached as metadata." };
    }));
    setGeneralAttachments((current) => [...current, ...parsed.filter((source) => !current.some((item) => item.id === source.id))]);
  }

  async function askWizard(input: string, attachments: UploadedSource[] = []) {
    const response = await fetch("/api/wizard-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input,
        messages: generalMessages.slice(-8),
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

  function startWorkspaceSession() {
    setSessionState("loading");
    setTimeout(() => {
      setSessionState("complete");
      setSelectedWorkspaceId(projects[0]?.id ?? null);
      setView("workspaces");
      setWorkspacePanel("workflow");
      setTimeout(() => setSessionState("idle"), 500);
    }, 500);
  }

  function runNextStep() {
    setStepState("loading");
    setTimeout(() => {
      setStepState("complete");
      setWorkspacePanel("outputs");
    }, 750);
  }

  function saveAsFinal() {
    setFinalState("loading");
    setTimeout(() => setFinalState("complete"), 650);
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
      setView("chat");
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
      setView("skills");
      return;
    }
    if (intent === "open_knowledge") {
      setView("knowledge");
      return;
    }
    if (intent === "open_usage") {
      setView("usage");
      return;
    }
    if (intent === "open_templates") {
      setView("templates");
      return;
    }
    if (intent === "open_outputs" || intent === "open_workspaces") {
      setView("workspaces");
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
    { id: "chat", label: "General Chat", icon: MessageCircle },
    { id: "workspaces", label: "Workspaces", icon: Layers3 },
    { id: "skills", label: "Skills", icon: Sparkles },
    { id: "templates", label: "Templates", icon: Boxes },
    { id: "knowledge", label: "Knowledge", icon: Database },
    { id: "usage", label: "Usage", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  const commandItems = useMemo<CommandItem[]>(() => {
    const navigate = (target: View): (() => void) => () => {
      if (target === "settings") setSettingsOpen(true);
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
        id: "create-workspace",
        label: "Create workspace",
        group: "Actions",
        hint: "Open the workspace builder",
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
          setView("workspaces");
          setWorkspacePanel("overview");
        },
      })),
      ...skills.map((skill) => ({
        id: `skill-${skill.id}`,
        label: skill.name,
        group: "Skills",
        hint: skill.description || "Open skills library",
        action: () => setView("skills"),
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

  function runCommand(item?: CommandItem) {
    if (!item) return;
    rememberCommand(item.id);
    item.action();
    setCommandOpen(false);
    setCommandQuery("");
    setCommandIndex(0);
  }

  function renderWidget(widgetId: DashboardWidgetId) {
    const definition = DASHBOARD_WIDGETS.find((widget) => widget.id === widgetId);
    if (!definition) return null;

    if (widgetId === "workspace_progress") {
      const mode = inferMode(recentWorkspace);
      return (
        <HomeWidget key={widgetId} {...definition}>
          <h3>{recentWorkspace?.name || "No active workspace yet"}</h3>
          <p>{recentWorkspace ? `Next: ${mode.steps[0]}` : "Create a workspace to unlock guided progress."}</p>
          <button className="secondary-pill" onClick={() => recentWorkspace ? setView("workspaces") : setWizardOpen(true)}>
            {recentWorkspace ? "Continue" : "Create workspace"} <ChevronRight size={16} />
          </button>
        </HomeWidget>
      );
    }

    if (widgetId === "business_xray") {
      return (
        <HomeWidget key={widgetId} {...definition}>
          <h3>Scan your business system</h3>
          <p>Start from the closest real workspace flow: agency audit and strategic diagnosis.</p>
          <PremiumSlideAction
            label="Slide to scan"
            completionText="Opening scan"
            loading={xrayState === "loading"}
            completed={xrayState === "complete"}
            onComplete={startBusinessXray}
          />
        </HomeWidget>
      );
    }

    if (widgetId === "asset_library") {
      return (
        <HomeWidget key={widgetId} {...definition}>
          <h3>Outputs live in Workspaces</h3>
          <p>Generated assets are stored as approved outputs inside each workspace.</p>
          <button className="secondary-pill" onClick={() => { setView("workspaces"); setWorkspacePanel("outputs"); }}>
            Open outputs <ChevronRight size={16} />
          </button>
        </HomeWidget>
      );
    }

    if (widgetId === "knowledge_sources") {
      return (
        <HomeWidget key={widgetId} {...definition}>
          <h3>{starterKnowledge.length} prepared source types</h3>
          <p>PDFs, prompts, notes and client briefs can become workspace context.</p>
          <button className="secondary-pill" onClick={() => setView("knowledge")}>
            Open Knowledge <ChevronRight size={16} />
          </button>
        </HomeWidget>
      );
    }

    if (widgetId === "usage_snapshot") {
      return (
        <HomeWidget key={widgetId} {...definition}>
          <h3>{formatUsd(usage.today)} today</h3>
          <p>{formatUsd(usage.month)} tracked this month across {runs.length} model runs.</p>
          <button className="secondary-pill" onClick={() => setView("usage")}>
            View usage <ChevronRight size={16} />
          </button>
        </HomeWidget>
      );
    }

    if (widgetId === "wizard_suggestions") {
      const suggestions = hasWorkspaces
        ? ["Run the next workspace step", "Review saved outputs", "Package Client Mode"]
        : ["Create your first workspace", "Explore templates", "Prepare knowledge sources"];
      return (
        <HomeWidget key={widgetId} {...definition}>
          <div className="suggestion-list">
            {suggestions.map((suggestion) => <button key={suggestion} onClick={() => suggestion.includes("template") ? setView("templates") : setWizardOpen(true)}>{suggestion}</button>)}
          </div>
        </HomeWidget>
      );
    }

    if (widgetId === "recent_workspaces") {
      return (
        <HomeWidget key={widgetId} {...definition}>
          {projects.length ? (
            <div className="recent-workspace-list">
              {projects.slice(0, 3).map((project) => (
                <button key={project.id} onClick={() => { setSelectedWorkspaceId(project.id); setView("workspaces"); }}>
                  <span>{project.name}</span>
                  <small>{timeAgo(project.createdAt)}</small>
                </button>
              ))}
            </div>
          ) : (
            <p>No recent workspaces yet. Your first workspace becomes the product.</p>
          )}
        </HomeWidget>
      );
    }

    if (widgetId === "quick_actions") {
      return (
        <HomeWidget key={widgetId} {...definition}>
          <div className="quick-action-grid">
            <button onClick={() => setWizardOpen(true)}><Plus size={15} /> Create workspace</button>
            <button onClick={() => setView("knowledge")}><Database size={15} /> Add knowledge</button>
            <button onClick={() => setView("skills")}><Sparkles size={15} /> Build skill</button>
            <button onClick={startBusinessXray}><Eye size={15} /> Business X-Ray</button>
          </div>
        </HomeWidget>
      );
    }

    return null;
  }

  return (
    <main className="nn-shell">
      <aside className="nn-sidebar">
        <button className="brand-lockup" onClick={() => setView("home")}>
          <span className="brand-mark">N</span>
          <span>
            <strong>{keys.BRAND_NAME?.trim() || "NeuralNexus"}</strong>
            <small>Workspace Builder</small>
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
                  if (item.id === "settings") setSettingsOpen(true);
                  setView(item.id as View);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-snapshot">
          <span>MONTHLY USAGE</span>
          <strong>${(costs.total ?? 0).toFixed(4)}</strong>
          <small>{costs.runs?.length ?? 0} model runs tracked</small>
        </div>
      </aside>

      <section className="nn-stage">
        <button className="command-launcher" onClick={() => setCommandOpen(true)} aria-label="Open command center">
          <span>Command</span>
          <kbd>⌘K</kbd>
        </button>
        <div key={view} className="view-fade">
        {view === "home" && (
          <div className={`nn-home wizard-home home-density-${widgetDensity}`}>
            <section className={`wizard-home-hero home-mode-${homeViewMode}`}>
              <div className="wizard-home-copy">
                <PersonalHomeHeader userName={userName} status={wizardStatus} workspaceSummary={workspaceSummary} />
                {showHomeStatus && (
                  <WizardStatusCard
                    message={hasWorkspaces ? "I organized your next step." : "Ready when you are."}
                    detail={wizardDetail}
                    actionLabel={hasWorkspaces ? "Continue workspace" : "Create workspace"}
                    onAction={() => hasWorkspaces ? setView("workspaces") : setWizardOpen(true)}
                  />
                )}
                <div className="hero-actions wizard-actions">
                  <button className="primary-pill" onClick={() => setWizardOpen(true)}>
                    <Plus size={18} /> Create workspace
                  </button>
                  <button className="secondary-pill" onClick={() => setView("templates")}>
                    Explore templates <ChevronRight size={17} />
                  </button>
                  <button className="secondary-pill" onClick={() => setWidgetSettingsOpen(true)}>
                    <SlidersHorizontal size={17} /> Customize
                  </button>
                </div>
              </div>
              {showHomeOrb && (
                <div className="wizard-orb-panel">
                  <WizardOrb size={homeViewMode === "widgets" ? 280 : 360} hue={orbHue} speed={orbSpeed} intensity={orbIntensity} state={hasWorkspaces ? "thinking" : "idle"} interactive />
                  <div className="wizard-orb-caption">
                    <span>NeuralNexus Wizard</span>
                    <small>{apiKeyReady ? "Models connected" : "Works without keys until generation"}</small>
                  </div>
                </div>
              )}
            </section>

            <section className="mobile-wizard-slide">
              <PremiumSlideAction
                label={hasWorkspaces ? "Slide to ask" : "Slide to build"}
                completionText={hasWorkspaces ? "Opening wizard" : "Opening builder"}
                loading={askState === "loading"}
                completed={askState === "complete"}
                onComplete={hasWorkspaces ? startWizardAsk : () => setWizardOpen(true)}
              />
            </section>

            <section className="home-dashboard-shell">
              <div className="section-head">
                <span>YOUR WORKSPACE DASHBOARD</span>
                <button onClick={() => setWidgetSettingsOpen(true)}>Customize widgets</button>
              </div>
              <div className="home-widget-grid">
                {visibleWidgets.map((widgetId) => renderWidget(widgetId))}
              </div>
            </section>

            <section className="home-build-strip">
              <div className="panel-wide">
                <div className="section-head">
                  <span>WHAT DO YOU WANT TO BUILD TODAY?</span>
                  <button onClick={() => setWizardOpen(true)}>New workspace</button>
                </div>
                <div className="use-case-grid">
                  {workspaceModes.map((mode) => (
                    <button
                      key={mode.id}
                      className="liquid-card use-case-card"
                      onClick={() => {
                        setSelectedModeId(mode.id);
                        setWizardOpen(true);
                      }}
                    >
                      <span>{mode.label}</span>
                      <p>{mode.purpose}</p>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {view === "workspaces" && (
          <div className="screen-stack">
            <header className="screen-header">
              <div>
                <span className="eyebrow">WORKSPACES</span>
                <h1>Reusable execution systems</h1>
                <p>Projects, knowledge, skills, workflow steps and approved outputs live here.</p>
              </div>
              <button className="primary-pill" onClick={() => setWizardOpen(true)}>
                <Plus size={18} /> Create workspace
              </button>
            </header>

            {!hasWorkspaces ? (
              <div className="empty-state">
                <WorkspaceObject mode={selectedMode} />
                <h2>No workspaces yet.</h2>
                <p>Start with a reusable method, client process, prompt pack or PDF framework.</p>
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
                      <button
                        key={project.id}
                        className={`workspace-card liquid-card ${active ? "is-selected" : ""}`}
                        onClick={() => {
                          setSelectedWorkspaceId(project.id);
                          setWorkspacePanel("overview");
                        }}
                      >
                        <span className="object-label">WORKSPACE</span>
                        <h3>{project.name}</h3>
                        <p>{mode.output}</p>
                        <div className="card-meta">
                          <span>Skills: {mode.skills.slice(0, 2).join(" · ")}</span>
                          <span>Knowledge: prepared</span>
                          <span>{timeAgo(project.createdAt)}</span>
                        </div>
                      </button>
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
                      <div className="detail-grid">
                        <div className="liquid-card">
                          <span className="object-label">ACTIVE SKILLS</span>
                          {selectedWorkspaceMode.skills.map((skill) => (
                            <div key={skill} className="mini-row">
                              <Sparkles size={16} />
                              <span>{skill}</span>
                            </div>
                          ))}
                        </div>
                        <div className="liquid-card">
                          <span className="object-label">KNOWLEDGE</span>
                          {starterKnowledge.slice(0, 3).map((source) => (
                            <div key={source} className="mini-row">
                              <FileText size={16} />
                              <span>{source}</span>
                            </div>
                          ))}
                        </div>
                        <div className="liquid-card">
                          <span className="object-label">NEXT ACTION</span>
                          <h3>{selectedWorkspaceMode.steps[0]}</h3>
                          <p>{selectedWorkspaceMode.purpose}</p>
                          <button className="secondary-pill" onClick={() => setWorkspacePanel("workflow")}>
                            Review next step <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {workspacePanel === "workflow" && (
                      <div className="action-panel">
                        <span className="object-label">NEXT STEP</span>
                        <h3>{selectedWorkspaceMode.steps[0]}</h3>
                        <p>This step turns rough audience notes into a precise profile and gives the workspace a useful direction.</p>
                        <div className="run-summary">
                          <span>Active Skill: {selectedWorkspaceMode.skills[0]}</span>
                          <span>Mode: Strategic · Premium</span>
                          <span>Estimated cost: $0.03-$0.09</span>
                        </div>
                        <PremiumSlideAction
                          label="Slide to run next step"
                          completionText="Step prepared"
                          estimatedCost="$0.03-$0.09"
                          loading={stepState === "loading"}
                          completed={stepState === "complete"}
                          onComplete={runNextStep}
                        />
                      </div>
                    )}

                    {workspacePanel === "outputs" && (
                      <div className="action-panel">
                        <span className="object-label">POSITIONING STATEMENT</span>
                        <h3>Generated with {selectedWorkspaceMode.skills[0]} Skill</h3>
                        <div className="output-box">
                          NeuralNexus packages expert knowledge into guided AI workspaces that make high-value methods reusable for teams, clients and customers.
                        </div>
                        <div className="secondary-actions">
                          <button>Refine</button>
                          <button>Regenerate</button>
                          <button>Copy</button>
                        </div>
                        <PremiumSlideAction
                          label="Slide to save as final"
                          completionText="Saved as final"
                          loading={finalState === "loading"}
                          completed={finalState === "complete"}
                          onComplete={saveAsFinal}
                        />
                      </div>
                    )}

                    {workspacePanel === "client" && (
                      <div className="action-panel">
                        <span className="object-label">CLIENT MODE</span>
                        <h3>Package this workspace for a client, audience or customer.</h3>
                        <p>Clients can follow your guided workflow, answer structured questions and receive AI outputs powered by your method.</p>
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
          <div className="screen-stack free-chat-screen">
            <header className="screen-header">
              <div>
                <span className="eyebrow">GENERAL CHAT</span>
                <h1>Ask anything.</h1>
                <p>This chat is not tied to a workspace. It uses whichever configured API key can answer through NeuralNexus routing.</p>
              </div>
              <button className="secondary-pill" onClick={() => setGeneralMessages([])} disabled={generalMessages.length === 0}>
                Clear chat
              </button>
            </header>

            <section className="free-chat-panel liquid-panel">
              <div className="free-chat-orb">
                <WizardOrb size={160} hue={orbHue} speed={generalBusy ? 42 : orbSpeed} intensity={generalBusy ? 88 : orbIntensity} state={generalBusy ? "generating" : "listening"} interactive />
                <div>
                  <span className="object-label">WIZARD CHAT</span>
                  <h2>{generalBusy ? "Thinking..." : "Ready for a normal question."}</h2>
                  <p>{apiKeyReady ? "Connected to your available model keys." : "Add an API key in Settings to get live answers."}</p>
                </div>
              </div>

              <div className="free-chat-messages">
                {generalMessages.length === 0 ? (
                  <div className="empty-inline">
                    <MessageCircle size={24} />
                    <p>Ask a general question, paste text, or attach a readable file or image.</p>
                  </div>
                ) : (
                  generalMessages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
                      <span>{message.role === "user" ? "You" : "Wizard"}</span>
                      <p>{message.content}</p>
                    </div>
                  ))
                )}
              </div>

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

              <div className="free-chat-composer">
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
                  placeholder="Ask anything. Cmd+Enter sends."
                  rows={3}
                />
                <button className="primary-pill" onClick={() => void sendGeneralChat()} disabled={generalBusy || (!generalInput.trim() && generalAttachments.length === 0)}>
                  {generalBusy ? "Thinking" : "Send"} <ChevronRight size={16} />
                </button>
              </div>
            </section>
          </div>
        )}

        {view === "skills" && (
          <CollectionScreen
            eyebrow="SKILLS"
            title="Packaged intellectual products"
            description="A skill is not a saved prompt. It carries purpose, inputs, behavior, output format and quality rules."
          >
            {(skills.length ? skills : [
              { id: "brand-critic", name: "Brand Critic", description: "Finds weak positioning, generic messaging and visual inconsistencies." },
              { id: "offer-architect", name: "Offer Architect", description: "Turns rough expertise into a sharp, sellable offer structure." },
              { id: "copy-editor", name: "Copy Critic", description: "Improves clarity, specificity and conversion intent." },
            ]).map((skill) => (
              <div key={skill.id} className="skill-card liquid-card">
                <span className="object-label">SKILL</span>
                <h3>{skill.name}</h3>
                <p>{skill.description}</p>
                <div className="card-meta">
                  <span>Input: notes / docs</span>
                  <span>Output: structured result</span>
                  <span>Mode: critical</span>
                </div>
              </div>
            ))}
          </CollectionScreen>
        )}

        {view === "templates" && (
          <CollectionScreen
            eyebrow="TEMPLATES"
            title="Premium workspace library"
            description="Start from a valuable system, then adapt the knowledge, skills and workflow to your method."
          >
            {templateCards.map((template) => (
              <div key={template.name} className="template-card liquid-card">
                <span className="object-label">{template.category}</span>
                <h3>{template.name}</h3>
                <p>{template.forWho}</p>
                <p>{template.produces}</p>
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
              </div>
            ))}
          </CollectionScreen>
        )}

        {view === "knowledge" && (
          <CollectionScreen
            eyebrow="KNOWLEDGE"
            title="Source material for reusable work"
            description="PDFs, notes, prompts, frameworks and examples are prepared to connect with workspaces."
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
            <header className="screen-header">
              <div>
                <span className="eyebrow">USAGE</span>
                <h1>Cost clarity for serious work</h1>
                <p>Understand model usage, budget posture and cost per workspace output.</p>
              </div>
              <button className="secondary-pill" onClick={exportUsageCsv} disabled={usage.models.length === 0}>
                <Download size={16} /> Export CSV
              </button>
            </header>
            <div className="usage-grid">
              <Stat label="Today" value={formatUsd(usage.today)} />
              <Stat label="This month" value={formatUsd(usage.month)} />
              <Stat label="Estimated Auto-Routing Savings" value={formatUsd(usage.estimatedSavings)} />
            </div>
            <div className="usage-layout">
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
            </div>
          </div>
        )}
        </div>
      </section>

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
                  <h2>What kind of system are we building?</h2>
                  <p>Pick the closest mode. You can refine the exact workspace in the next steps.</p>
                  <ModeSelector selectedId={selectedModeId} onSelect={(id) => { setSelectedModeId(id); setTimeout(() => setWizardStep("audience"), 180); }} />
                </>
              )}

              {wizardStep === "audience" && (
                <>
                  <h2>Who is this workspace for?</h2>
                  <p>One clear audience keeps the AI system useful instead of generic.</p>
                  <label className="guided-field">
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
                  <label className="guided-field">
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
                  <label className="guided-field">
                    Workspace name
                    <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
                  </label>
                  <label className="guided-field">
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
                  <p>Review the system before building. This is the one high-intent action in the flow.</p>
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
            <div className="command-input-row">
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

      {widgetSettingsOpen && (
        <div className="widget-customizer-backdrop" role="dialog" aria-modal="true" aria-label="Customize Home widgets" onClick={() => setWidgetSettingsOpen(false)}>
          <div className="widget-customizer" onClick={(event) => event.stopPropagation()}>
            <div className="floating-wizard-head">
              <span><SlidersHorizontal size={15} /> Home widgets</span>
              <button onClick={() => setWidgetSettingsOpen(false)} aria-label="Close widget customizer"><X size={15} /></button>
            </div>
            <p>Choose which useful workspace objects appear on Home. This is stored locally for now.</p>
            <div className="widget-toggle-list">
              {DASHBOARD_WIDGETS.map((widget) => {
                const enabled = visibleWidgets.includes(widget.id);
                return (
                  <button
                    key={widget.id}
                    className={enabled ? "is-enabled" : ""}
                    onClick={() => {
                      setVisibleWidgets((current) => enabled ? current.filter((id) => id !== widget.id) : [...current, widget.id]);
                    }}
                  >
                    <span>
                      <strong>{widget.title}</strong>
                      <small>{widget.description}</small>
                    </span>
                    <Check size={16} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view !== "home" && (
        <FloatingWizard
          enabled={floatingWizardEnabled}
          status={wizardStatus}
          onIntent={handleWizardIntent}
          onAsk={(input) => askWizard(input)}
        />
      )}

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

"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThinkingOrb } from "@/components/ThinkingOrb";
import { FailoverWarp } from "@/components/FailoverWarp";
import { CostLedger } from "@/components/CostLedger";
import { WorkflowBuilder } from "@/components/WorkflowBuilder";
import { SpatialWorkroom, type WorkroomStep } from "@/components/SpatialWorkroom";
import { UsageTrackingPanel, SmartModelChoicePanel, HumanControlPanel, SecurityGatePanel, ActionRequestModal, WorkroomEventLog } from "@/components/WorkroomPanels";
import { SettingsModal } from "@/components/SettingsModal";
import { PenLine, GraduationCap, Code as CodeIcon, Coffee, Lightbulb, Plus, FolderOpen, Brain, BarChart3, GitBranch, Settings, ChevronRight } from "lucide-react";
import { estimateTokens, PRICING } from "@/lib/tokens";
import dynamic from "next/dynamic";
import type { OrbTone } from "@/components/ResonanceOrb";
const ResonanceOrb = dynamic(() => import("@/components/ResonanceOrb").then(m => ({ default: m.ResonanceOrb })), { ssr: false, loading: () => <div className="orb" /> });
import { usePIIMask } from "@/components/PrivacyShield";
import { ContextMenu, type ContextMenuState } from "@/components/ContextMenu";
import { ArtifactPanel, type Artifact } from "@/components/ArtifactPanel";
import { CommandPalette } from "@/components/CommandPalette";
import type { WarpEvent, ModelProfile } from "@/lib/types";

async function safeJson(url: string, init?: RequestInit) {
  try {
    const r = await fetch(url, init);
    const t = await r.text();
    if (!t) return null;
    try { return JSON.parse(t); } catch { return null; }
  } catch { return null; }
}

type Project = { id: string; name: string; createdAt?: string; messages?: { content: string; createdAt: string }[] };
function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h}h`;
  return `vor ${Math.floor(h / 24)}T`;
}
type Msg = { role: string; content: string; model?: string; warp?: WarpEvent; tone?: string; usedMemory?: boolean };
type Memory = { id: string; kind: string; content: string };
type Agent = { id: string; name: string; emoji: string; role: string; systemPrompt: string; preferredModel: string; skillIds: string };
type Skill = { id: string; name: string; description: string; instructions: string };

const MODELS = [
  { id: "auto",                                   label: "✦ Auto",              provider: "" },
  // Direct
  { id: "claude-sonnet-4-6",                      label: "Claude Sonnet",       provider: "anthropic" },
  { id: "claude-haiku-4-5",                       label: "Claude Haiku",        provider: "anthropic" },
  { id: "gpt-4o",                                 label: "GPT-4o",              provider: "openai" },
  { id: "gpt-4o-mini",                            label: "GPT-4o mini",         provider: "openai" },
  { id: "gemini-2.0-pro",                         label: "Gemini 2.0 Pro",      provider: "google" },
  { id: "deepseek-chat",                          label: "DeepSeek V3",         provider: "deepseek" },
  // OpenRouter
  { id: "x-ai/grok-3",                            label: "Grok 3",              provider: "openrouter" },
  { id: "x-ai/grok-3-mini",                       label: "Grok 3 Mini",         provider: "openrouter" },
  { id: "meta-llama/llama-4-maverick",            label: "Llama 4 Maverick",    provider: "openrouter" },
  { id: "meta-llama/llama-4-scout",               label: "Llama 4 Scout",       provider: "openrouter" },
  { id: "meta-llama/llama-3.3-70b-instruct",      label: "Llama 3.3 70B",       provider: "openrouter" },
  { id: "mistralai/mistral-large",                label: "Mistral Large",       provider: "openrouter" },
  { id: "mistralai/mistral-small",                label: "Mistral Small",       provider: "openrouter" },
  { id: "mistralai/codestral-latest",             label: "Codestral",           provider: "openrouter" },
  { id: "qwen/qwen-2.5-72b-instruct",             label: "Qwen 2.5 72B",        provider: "openrouter" },
  { id: "qwen/qwen-2.5-coder-32b-instruct",       label: "Qwen Coder 32B",      provider: "openrouter" },
  { id: "google/gemini-2.0-flash-001",            label: "Gemini Flash",        provider: "openrouter" },
  { id: "google/gemini-2.5-pro-preview",          label: "Gemini 2.5 Pro",      provider: "openrouter" },
  { id: "perplexity/sonar-pro",                   label: "Perplexity Sonar",    provider: "openrouter" },
  { id: "cohere/command-r-plus",                  label: "Command R+",          provider: "openrouter" },
  { id: "z-ai/glm-4.6",                           label: "GLM 4.6",             provider: "openrouter" },
];
const PROVIDER_LOGO: Record<string, string> = {
  anthropic: "/logos/anthropic.svg", openai: "/logos/openai.svg", google: "/logos/gemini.svg",
  deepseek: "/logos/deepseek.svg", openrouter: "/logos/openrouter.svg",
};
function ProviderChip({ provider }: { provider: string }) {
  if (!provider || !PROVIDER_LOGO[provider]) return null;
  return <span className="provider-chip"><img src={PROVIDER_LOGO[provider]} alt="" /></span>;
}
const KINDS = [
  ["note", "Notiz"], ["decision", "Entscheidung"], ["status", "Status"],
  ["bug", "Bug"], ["rule", "Nicht wiederholen"], ["preference", "Präferenz"], ["handoff", "Handoff"],
] as const;
const KEY_FIELDS = [
  { k: "OPENROUTER_API_KEY", label: "OpenRouter", hint: "ein Key für alle Modelle", provider: "openrouter" },
  { k: "ANTHROPIC_API_KEY", label: "Anthropic", hint: "Claude direkt", provider: "anthropic" },
  { k: "OPENAI_API_KEY", label: "OpenAI", hint: "GPT direkt", provider: "openai" },
  { k: "GOOGLE_API_KEY", label: "Google", hint: "Gemini direkt", provider: "google" },
  { k: "DEEPSEEK_API_KEY", label: "DeepSeek", hint: "DeepSeek direkt", provider: "deepseek" },
];
const ACTION_CHIPS = [
  { Icon: PenLine, label: "Schreiben", prompt: "Schreibe: " },
  { Icon: GraduationCap, label: "Lernen", prompt: "Erkläre mir: " },
  { Icon: CodeIcon, label: "Code", prompt: "Schreib mir Code für: " },
  { Icon: Coffee, label: "Privates", prompt: "" },
  { Icon: Lightbulb, label: "Empfehlungen", prompt: "Gib mir Empfehlungen für: " },
];

const STARTER_AGENTS: Omit<Agent, "id">[] = [
  { name: "Coder", emoji: "⌨️", role: "Code schreiben & debuggen", systemPrompt: "Du bist senior Full-Stack. Antworte mit Code. Kurze Erklärungen.", preferredModel: "claude-sonnet-4-6", skillIds: "" },
  { name: "Researcher", emoji: "R", role: "Recherchieren", systemPrompt: "Recherchiere gründlich. Fakten zuerst, Quellen wenn möglich.", preferredModel: "claude-sonnet-4-6", skillIds: "" },
  { name: "Writer", emoji: "W", role: "Texte verfassen", systemPrompt: "Schreib klar, kurz, natürlich. Kein KI-Ton.", preferredModel: "claude-haiku-4-5", skillIds: "" },
  { name: "Reviewer", emoji: "C", role: "Kritisch reviewen", systemPrompt: "Kritisch reviewen. Schwächen zuerst. Konkrete Verbesserungen.", preferredModel: "claude-sonnet-4-6", skillIds: "" },
];
const STARTER_SKILLS: Omit<Skill, "id">[] = [
  { name: "ADHD-Modus", description: "Kurz, direkt, wichtiges zuerst", instructions: "Extrem kurz und strukturiert. Wichtigste Info in Zeile 1. Keine Preamble." },
  { name: "Deutsch", description: "Immer auf Deutsch", instructions: "Antworte immer auf Deutsch, auch bei englischer Frage." },
  { name: "Nur Code", description: "Nur Code, kein Text drumherum", instructions: "Antworte NUR mit Code in einem Codeblock. Keine Erklärung außerhalb." },
];

// Word-by-word blur-in. Relies on React mounting a message only once (same key = same DOM node,
// animation already finished on re-renders), so history never replays — only the newest message animates.
function StreamText({ text }: { text: string }) {
  const words = text.split(/(\s+)/);
  return <>{words.map((w, i) => (
    <span key={i} className="stream-word" style={{ animationDelay: `${Math.min(i * 22, 900)}ms` }}>{w}</span>
  ))}</>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState(false);
  const click = () => {
    navigator.clipboard.writeText(text);
    setCopied(true); setBurst(true);
    setTimeout(() => setBurst(false), 450);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={click} className="icon-btn hover:text-snow relative inline-flex items-center gap-1">
      <span className={`copy-icon ${copied ? "morphed" : ""}`}>{copied ? "✓" : "⧉"}</span>
      {copied ? "Kopiert" : "Kopieren"}
      {burst && (
        <span className="particle-burst">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="particle" style={{ ["--angle" as any]: `${i * 60}deg` }} />
          ))}
        </span>
      )}
    </button>
  );
}

function FlyingThumb({ src, from, targetRef }: { src: string; from: { x: number; y: number }; targetRef: React.RefObject<HTMLElement> }) {
  const [pos, setPos] = useState(from);
  const [size, setSize] = useState(90);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const r = targetRef.current?.getBoundingClientRect();
      if (r) { setPos({ x: r.left + 16, y: r.top + 10 }); setSize(30); }
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <img src={src} alt=""
      style={{
        position: "fixed", left: pos.x, top: pos.y, width: size, height: size, borderRadius: 12,
        objectFit: "cover", zIndex: 60, pointerEvents: "none",
        transition: "left 460ms cubic-bezier(.22,1.4,.36,1), top 460ms cubic-bezier(.22,1.4,.36,1), width 460ms cubic-bezier(.22,1.4,.36,1), height 460ms cubic-bezier(.22,1.4,.36,1)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
      }} />
  );
}

// Smart-scroll magnet: eased interpolation instead of a hard jump; caller decouples it on manual scroll-up.
function smoothScrollTo(el: HTMLElement, target: number, duration = 260) {
  const start = el.scrollTop;
  const change = target - start;
  if (Math.abs(change) < 1) return;
  const startTime = performance.now();
  function step(now: number) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.scrollTop = start + change * eased;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export default function Home() {
  const [tab, setTab] = useState<"chat" | "memory" | "costs" | "workflows">("chat");
  const [projects, setProjects] = useState<Project[]>([]);
  const [pid, setPid] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [costs, setCosts] = useState<{ runs: any[]; total: number }>({ runs: [], total: 0 });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeAgent, setActiveAgent] = useState<string>("");
  const [model, setModel] = useState("agent");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyPid, setBusyPid] = useState("");
  const [err, setErr] = useState("");
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);
  const [sideHidden, setSideHidden] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [undoToast, setUndoToast] = useState<{ msg: string; undo: () => void } | null>(null);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [editSkill, setEditSkill] = useState<Skill | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const [memKind, setMemKind] = useState("note");
  const [memText, setMemText] = useState("");
  const [settingsTab, setSettingsTab] = useState<"keys" | "persona" | "ui">("keys");
  const [focusMode, setFocusMode] = useState(false);
  const [sparkIdx, setSparkIdx] = useState<number | null>(null);
  const [vaporFrags, setVaporFrags] = useState<{ text: string; tx: number; rot: number }[] | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ data: string; mediaType: string; name: string } | null>(null);
  const [flyingImage, setFlyingImage] = useState<{ src: string; from: { x: number; y: number } } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { shielded: piiPreview } = usePIIMask(input);
  const PROVIDER_KEY: Record<string, string> = { anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY", openrouter: "OPENROUTER_API_KEY", google: "GOOGLE_API_KEY", deepseek: "DEEPSEEK_API_KEY" };
  const hasKeyForModel = (m: typeof MODELS[number]) => !m.provider || !!keys[PROVIDER_KEY[m.provider]];
  const hasAnyKeyNow = Object.values(PROVIDER_KEY).some(k => !!keys[k]);

  const autoLabel = (() => {
    if (!hasAnyKeyNow) return "✦ Auto";
    const priority = ["claude-sonnet-4-6", "x-ai/grok-3", "gpt-4o", "gemini-2.0-pro", "deepseek-chat", "meta-llama/llama-4-maverick", "gpt-4o-mini"];
    const first = priority.find(id => { const m = MODELS.find(x => x.id === id); return m && hasKeyForModel(m as any); });
    return first ? `✦ Auto · ${MODELS.find(x => x.id === first)?.label}` : "✦ Auto";
  })();
  const [workflows, setWorkflows] = useState<{ id: string; name: string; agentIds: string }[]>([]);
  const [workflowResult, setWorkflowResult] = useState<{ steps: WorkroomStep[]; final: string; totalCost: number } | null>(null);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [orbTone, setOrbTone] = useState<OrbTone>(null);
  const [memoryPulse, setMemoryPulse] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>();
  const [artifactPanelWidth, setArtifactPanelWidth] = useState(480);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [cmdRecent, setCmdRecent] = useState<string[]>([]);
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // Extract code blocks from assistant messages as artifacts
  useEffect(() => {
    const newArtifacts = [...artifacts];
    let changed = false;
    msgs.forEach((msg, idx) => {
      if (msg.role === "assistant") {
        const key = `${idx}-${msg.content.slice(0, 50)}`;
        if (processedMessagesRef.current.has(key)) return;
        processedMessagesRef.current.add(key);

        const regex = /```(\w+)\n([\s\S]*?)```/g;
        let match;
        while ((match = regex.exec(msg.content)) !== null) {
          const type = match[1];
          const code = match[2].trim();
          const validTypes = ["html", "jsx", "jsx-render", "python", "js", "css", "json", "markdown"];
          if (validTypes.includes(type)) {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            newArtifacts.push({ id, type: type as Artifact["type"], code, timestamp: Date.now() });
            changed = true;
          }
        }
      }
    });
    if (changed) {
      setArtifacts(newArtifacts);
      const latest = newArtifacts[newArtifacts.length - 1];
      setSelectedArtifactId(latest.id);
    }
  }, [msgs]);
  const [workflowPrompt, setWorkflowPrompt] = useState("");
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [genSkillBusy, setGenSkillBusy] = useState(false);
  const [artifact, setArtifact] = useState<{ lang: string; code: string } | null>(null);
  const [statsProjectId, setStatsProjectId] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<{ runs: any[]; total: number } | null>(null);
  const [selectionHud, setSelectionHud] = useState<{ x: number; y: number; text: string } | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [spentToday, setSpentToday] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const savedKeysRef = useRef<string>("");
  const composerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProjects = async () => {
    const p = await safeJson("/api/projects");
    if (p && Array.isArray(p)) setProjects(p);
  };
  const seedingRef = useRef(false);
  const loadAgents = async () => {
    const a = await safeJson("/api/agents");
    if (a && Array.isArray(a)) {
      if (a.length === 0 && !seedingRef.current) {
        seedingRef.current = true;
        for (const s of STARTER_SKILLS) await fetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
        for (const g of STARTER_AGENTS) await fetch("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(g) });
        loadAgents(); loadSkills();
      } else setAgents(a);
    }
  };
  const loadSkills = async () => { const s = await safeJson("/api/skills"); if (s && Array.isArray(s)) setSkills(s); };
  const loadWorkflows = async () => { const w = await safeJson("/api/workflows"); if (w && Array.isArray(w)) setWorkflows(w); };
  const saveWorkflow = async (name: string, agentIds: string[]) => {
    await fetch("/api/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, agentIds: agentIds.join(",") }) });
    loadWorkflows();
  };
  const runWorkflow = async (agentIds: string[]) => {
    if (!workflowPrompt.trim()) { setErr("Erst einen Start-Prompt eingeben."); return; }
    setWorkflowResult(null); setReplayIndex(null); setWorkflowRunning(true);
    const r = await safeJson("/api/workflows/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentIds, prompt: workflowPrompt, projectId: pid || undefined }) });
    if (r?.error) { setErr(r.error); setWorkflowRunning(false); return; }
    setWorkflowResult(r);
    // Replay the REAL steps one by one (data is genuine — this only staggers the reveal, no fabricated content).
    for (let i = 0; i < r.steps.length; i++) {
      setReplayIndex(i);
      await new Promise(res => setTimeout(res, 700));
    }
    setWorkflowRunning(false);
    if (typeof r.totalCost === "number") setSpentToday(s => s + r.totalCost);
    loadTodaySpend();
  };
  const loadKeys = async () => {
    const k = await safeJson("/api/settings");
    if (!k) return;
    setKeys(k); savedKeysRef.current = JSON.stringify(k);
  };
  useEffect(() => { loadProjects(); loadKeys(); loadAgents(); loadSkills(); loadWorkflows(); }, []);
  useEffect(() => {
    if (!pid) { setMsgs([]); setMemories([]); return; }
    safeJson(`/api/chat?projectId=${pid}`).then(d => d && setMsgs(d));
    safeJson(`/api/memories?projectId=${pid}`).then(d => d && setMemories(d));
    inputRef.current?.focus();
  }, [pid]);
  useEffect(() => { if (tab === "costs" || tab === "workflows") safeJson("/api/costs").then(d => d && setCosts(d)); }, [tab]);
  // Smart-scroll magnet: eased scroll toward bottom; skipped entirely once the user has scrolled up (autoScroll=false).
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current; if (!el) return;
    smoothScrollTo(el, el.scrollHeight - el.clientHeight, 240);
  }, [msgs, busy, autoScroll]);

  // Focus dimmer: dim sidebar + older messages while the KI is generating; hold briefly after a long reply lands.
  useEffect(() => { if (busy) setFocusMode(true); }, [busy]);
  useEffect(() => {
    if (busy || msgs.length === 0) return;
    const last = msgs[msgs.length - 1];
    if (last.role !== "assistant") return;
    const words = last.content.split(/\s+/).length;
    if (words > 300) { const t = setTimeout(() => setFocusMode(false), 1800); return () => clearTimeout(t); }
    setFocusMode(false);
  }, [busy, msgs]);

  const onScroll = () => {
    const el = scrollRef.current; if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(near); setShowScrollBadge(!near && msgs.length > 0);
  };
  useEffect(() => {
    const el = inputRef.current; if (!el) return;
    el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  // Auto-save settings
  useEffect(() => {
    const current = JSON.stringify(keys);
    if (current === savedKeysRef.current || !savedKeysRef.current) return;
    const t = setTimeout(async () => {
      await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(keys) });
      savedKeysRef.current = current;
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1200);
      loadKeys();
    }, 600);
    return () => clearTimeout(t);
  }, [keys]);

  const newChat = () => { setPid(""); setMsgs([]); setErr(""); setTab("chat"); setSideOpen(false); inputRef.current?.focus(); };

  const send = useCallback(async () => {
    if (!input.trim() || busy) return;
    const text = input; const img = attachedImage;
    setInput(""); setAttachedImage(null); setErr(""); setBusy(true); setAutoScroll(true);
    setMsgs(m => [...m, { role: "user", content: text }]);

    // Auto-create chat if none selected
    let projectId = pid;
    if (!projectId) {
      const name = text.slice(0, 40).replace(/\n/g, " ") || "Neuer Chat";
      const p = await safeJson("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (p?.id) { projectId = p.id; setPid(p.id); loadProjects(); }
      else { setErr("Chat konnte nicht erstellt werden."); setBusy(false); return; }
    }
    setBusyPid(projectId);

    const t0 = performance.now();
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, model, content: text, agentId: activeAgent || undefined, image: img ? { data: img.data, mediaType: img.mediaType } : undefined }),
        signal: abortRef.current.signal,
      });
      const t = await res.text();
      const data = t ? JSON.parse(t) : null;
      setLastLatencyMs(Math.round(performance.now() - t0));
      if (!data) setErr("Server antwortet nicht.");
      else if (data.error) setErr(data.error);
      else {
        if (data.tone) setOrbTone(data.tone as OrbTone);
        if (data.usedMemory) {
          setMemoryPulse(true);
          setTimeout(() => setMemoryPulse(false), 2000);
        }
        setMsgs(m => [...m, { role: "assistant", content: data.text, model: data.model, warp: data.warp ?? undefined, tone: data.tone, usedMemory: data.usedMemory }]);
        if (typeof data.costUsd === "number") setSpentToday(s => s + data.costUsd);
      }
    } catch (e: any) { if (e.name !== "AbortError") setErr(e.message ?? "Fehler"); }
    setBusy(false); setBusyPid("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [input, pid, busy, model, activeAgent, attachedImage]);

  const stop = () => { abortRef.current?.abort(); setBusy(false); setBusyPid(""); };
  const pinMsg = async (idx: number, content: string) => {
    await saveMemory("note", content.slice(0, 500));
    setPinnedIdx(idx); setTimeout(() => setPinnedIdx(null), 1400);
    setSparkIdx(idx); setTimeout(() => setSparkIdx(null), 800);
  };

  // Bento docking: attach an image via drop / click / paste, with a flying-thumbnail hand-off into the composer.
  const MAX_IMAGE_BYTES = 8_000_000;
  const handleFile = (file: File, dropPoint?: { x: number; y: number }) => {
    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";
    if (!isImage && !isPDF) { setErr("Unterstützt: Bilder (JPG/PNG/WebP) und PDFs."); return; }
    if (file.size > 20 * 1024 * 1024) { setErr("Datei zu groß (max 20MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      const mediaType = file.type;
      if (dropPoint && isImage) {
        setFlyingImage({ src: dataUrl, from: dropPoint });
        setTimeout(() => { setAttachedImage({ data: base64, mediaType, name: file.name }); setFlyingImage(null); }, 460);
      } else {
        setAttachedImage({ data: base64, mediaType, name: file.name });
      }
    };
    reader.readAsDataURL(file);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file, { x: e.clientX, y: e.clientY });
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files)[0];
    if (file && file.type.startsWith("image/")) { e.preventDefault(); handleFile(file); }
  };

  // Draft vaporizer: text bursts into fading fragments instead of just vanishing.
  const vaporize = () => {
    if (!input.trim()) return;
    const frags = input.split(/(\s+)/).filter(Boolean).slice(0, 15)
      .map(text => ({ text, tx: Math.round(Math.random() * 60 - 30), rot: Math.round(Math.random() * 40 - 20) }));
    setVaporFrags(frags); setInput("");
    setTimeout(() => setVaporFrags(null), 480);
  };
  const saveMemory = async (kind: string, content: string) => {
    if (!pid) return;
    await fetch("/api/memories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: pid, kind, content }) });
    safeJson(`/api/memories?projectId=${pid}`).then(d => d && setMemories(d));
  };
  const delMemory = async (m: Memory) => {
    await fetch(`/api/memories?id=${m.id}`, { method: "DELETE" });
    setMemories(x => x.filter(y => y.id !== m.id));
    setUndoToast({ msg: "Eintrag gelöscht", undo: async () => { await saveMemory(m.kind, m.content); setUndoToast(null); } });
    setTimeout(() => setUndoToast(t => t?.msg === "Eintrag gelöscht" ? null : t), 5000);
  };
  const exportFiles = async () => {
    if (!pid) return;
    const files = await safeJson(`/api/export?projectId=${pid}`);
    if (!files) return;
    for (const [name, content] of Object.entries(files)) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([content as string], { type: "text/markdown" }));
      a.download = name; a.click();
    }
  };
  const saveAgent = async (a: Partial<Agent>) => {
    await fetch("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) });
    setEditAgent(null); loadAgents();
  };
  const delAgent = async (id: string) => {
    await fetch(`/api/agents?id=${id}`, { method: "DELETE" }); loadAgents();
    if (activeAgent === id) setActiveAgent("");
  };
  const saveSkill = async (s: Partial<Skill>) => {
    await fetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    setEditSkill(null); loadSkills();
  };
  const delSkill = async (id: string) => { await fetch(`/api/skills?id=${id}`, { method: "DELETE" }); loadSkills(); };

  // Context-menu actions
  const forceModelResend = async (text: string, forcedModel: string) => {
    setInput(""); setBusy(true); setErr("");
    setMsgs(m => [...m, { role: "user", content: text }]);
    const data = await safeJson("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: pid, model: forcedModel, content: text }) });
    setBusy(false);
    if (data?.error) setErr(data.error);
    else if (data) setMsgs(m => [...m, { role: "assistant", content: data.text, model: data.model, warp: data.warp ?? undefined }]);
  };
  const deepDive = (text: string) => { setInput(`Geh tiefer auf das Folgende ein, mit mehr Detail und Beispielen:\n\n"${text.slice(0, 300)}"`); inputRef.current?.focus(); };
  const convertMessageToSkill = async (text: string) => {
    setGenSkillBusy(true);
    const s = await safeJson("/api/skills/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ singleMessage: text }) });
    setGenSkillBusy(false);
    if (s?.error) setErr(s.error); else { loadSkills(); setUndoToast({ msg: `Skill "${s?.name}" erstellt.`, undo: () => setUndoToast(null) }); setTimeout(() => setUndoToast(null), 3000); }
  };
  const generateSkillFromChat = async () => {
    if (!pid) return;
    setGenSkillBusy(true);
    const s = await safeJson("/api/skills/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: pid }) });
    setGenSkillBusy(false);
    if (s?.error) setErr(s.error); else { loadSkills(); setUndoToast({ msg: `Skill "${s?.name}" aus Chat erstellt.`, undo: () => setUndoToast(null) }); setTimeout(() => setUndoToast(null), 3000); }
  };
  const archiveProject = async (id: string) => {
    await fetch("/api/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, archived: true }) });
    setProjects(p => p.filter(x => x.id !== id));
    if (pid === id) newChat();
  };
  const renameProject = async (id: string, name: string) => {
    if (!name.trim()) return;
    await fetch("/api/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name: name.trim() }) });
    setProjects(p => p.map(x => x.id === id ? { ...x, name: name.trim() } : x));
  };
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archived, setArchived] = useState<Project[]>([]);
  const loadArchived = async () => { const a = await safeJson("/api/projects?archived=1"); if (a) setArchived(a); };
  const unarchiveProject = async (id: string) => {
    await fetch("/api/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, archived: false }) });
    setArchived(a => a.filter(x => x.id !== id));
    loadProjects(); setPid(id); setTab("chat");
  };
  const forkProject = async (id: string) => {
    const copy = await safeJson("/api/projects/fork", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (copy?.id) { loadProjects(); setPid(copy.id); setTab("chat"); }
  };

  // Live cost/latency ticker: seed today's spend from real data on load.
  const loadTodaySpend = async () => {
    const c = await safeJson("/api/costs");
    if (!c?.runs) return;
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const sum = c.runs.filter((r: any) => new Date(r.createdAt) >= dayStart).reduce((s: number, r: any) => s + r.costUsd, 0);
    setSpentToday(sum);
  };
  useEffect(() => { loadTodaySpend(); }, []);

  // Artifacts: pull the first fenced code block out of a message, if any.
  const extractCodeBlock = (text: string): { lang: string; code: string } | null => {
    const m = text.match(/```(\w+)?\n([\s\S]*?)```/);
    return m ? { lang: m[1] || "text", code: m[2].trim() } : null;
  };

  // Glint & Shimmer Hover: track cursor position as CSS vars for the radial highlight.
  const glintMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--gx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--gy", `${e.clientY - r.top}px`);
  };

  // Contextual Text-Selection HUD
  const onMessagesMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 2 || !sel || sel.rangeCount === 0) { setSelectionHud(null); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setSelectionHud({ x: rect.left + rect.width / 2, y: rect.top - 10, text });
  };

  const openTokenStats = async (projectId: string) => {
    setStatsProjectId(projectId);
    const d = await safeJson(`/api/costs?projectId=${projectId}`);
    if (d) setStatsData(d);
  };

  // Shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") { e.preventDefault(); setCmdPaletteOpen(true); return; }
      if (mod && e.key === ".") { e.preventDefault(); setSideHidden(x => !x); return; }
      if (mod && e.key === ",") { e.preventDefault(); setSettingsOpen(true); return; }
      if (mod && e.key === "/") { e.preventDefault(); setShortcutsOpen(o => !o); return; }
      if (e.key === "Escape") { setCmdPaletteOpen(false); setCmdOpen(false); setSettingsOpen(false); setLibraryOpen(false); setEditAgent(null); setEditSkill(null); setSlashOpen(false); setModelMenuOpen(false); setShortcutsOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (!cmdOpen && !settingsOpen && !libraryOpen) inputRef.current?.focus(); }, [cmdOpen, settingsOpen, libraryOpen]);

  // Command palette commands
  const cmdPaletteCommands = [
    // Models
    ...MODELS.filter(m => m.id !== "auto").map(m => ({
      id: `model-${m.id}`,
      label: m.label,
      group: "Modelle",
      action: () => hasKeyForModel(m) && setModel(m.id),
      shortcut: hasKeyForModel(m) ? undefined : "kein Key",
    })),
    // Agents
    ...agents.map(a => ({
      id: `agent-${a.id}`,
      label: a.name,
      group: "Agenten",
      action: () => { setActiveAgent(a.id); setModel("agent"); },
    })),
    // Settings sections
    { id: "settings-general", label: "Allgemeine Einstellungen", group: "Einstellungen", action: () => { setSettingsOpen(true); } },
    { id: "settings-models", label: "API-Keys & Modelle", group: "Einstellungen", action: () => { setSettingsOpen(true); } },
    { id: "settings-orb", label: "Resonance Orb", group: "Einstellungen", action: () => { setSettingsOpen(true); } },
    // Actions
    { id: "action-new-chat", label: "Neuer Chat", group: "Aktionen", action: newChat },
    { id: "action-workflows", label: "Workflows", group: "Aktionen", action: () => setTab("workflows") },
    { id: "action-costs", label: "Kosten anzeigen", group: "Aktionen", action: () => setTab("costs") },
  ];
  useEffect(() => { setSlashOpen(input.startsWith("/") && input.length < 20 && !input.includes(" ")); }, [input]);

  // Neural depth parallax: mouse position drives two background dot layers at different depths.
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setMx((e.clientX / window.innerWidth - 0.5) * 2);
        setMy((e.clientY / window.innerHeight - 0.5) * 2);
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  const runCommand = (cmd: string) => {
    if (cmd === "/new") newChat();
    if (cmd === "/settings") setSettingsOpen(true);
    if (cmd === "/library") setLibraryOpen(true);
    if (cmd === "/export") exportFiles();
    setInput(""); setSlashOpen(false);
  };

  const project = projects.find(p => p.id === pid);
  const agent = agents.find(a => a.id === activeAgent);
  const agentSkills = agent ? skills.filter(s => agent.skillIds.split(",").includes(s.id)) : [];
  const userName = (keys.PREFERRED_NAME ?? "").trim() || (keys.USER_PROFILE ?? "").split(/[,\n]/)[0].trim();
  const greet = new Date().getHours() < 11 ? "Morgen" : new Date().getHours() < 18 ? "Tag" : "Abend";
  const anyOverlayOpen = settingsOpen || libraryOpen || cmdOpen || !!ctxMenu || !!statsProjectId;
  const themeValue = "dark";
  const contextTokenPct = Math.min(100, Math.round((Math.ceil(input.length / 4) / 1000) * 100));

  return (
    <div className="theme-root flex h-[100dvh] p-2 md:p-3 gap-3"
      data-theme={themeValue}
      style={{ fontSize: keys.UI_FONTSIZE === "large" ? "17px" : keys.UI_FONTSIZE === "small" ? "13px" : "15px" }}>

      {/* Dynamic Border Light Aura — active while the KI generates */}
      <div className="border-aura" data-active={busy ? "1" : "0"} />

      {/* ===== Sidebar (Claude-style) ===== */}
      {!sideHidden && (
      <aside className={`${sideOpen ? "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" : "hidden"} md:static md:block md:bg-transparent md:backdrop-blur-0 ${focusMode ? "focus-dim" : "focus-bright"}`} onClick={() => setSideOpen(false)}>
        <div className="glass card h-full w-72 p-3 flex flex-col m-2 md:m-0" onClick={e => e.stopPropagation()}>
          {/* Top: logo + collapse */}
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2.5">
              <div className="orb-sm shrink-0" />
              <span className="font-display font-semibold text-snow">{keys.BRAND_NAME || "Jarvis"}</span>
            </div>
            <button onClick={() => setSideHidden(true)} className="hidden md:grid icon-btn w-8 h-8 pill glass-input place-items-center text-mist text-xs">⟨</button>
          </div>

          {/* Search */}
          <button onClick={() => setCmdOpen(true)}
            className="glass-input pill mx-1 mt-2 px-3.5 py-2 flex items-center gap-2 text-sm text-mist hover:bg-white/10">
            <span></span><span className="flex-1 text-left">Suchen…</span>
            <kbd className="text-[10px] glass-input px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>

          {/* Main nav */}
          <nav className="mt-3 space-y-0.5 px-1">
            <button onClick={newChat} onMouseMove={glintMove}
              className="glint w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] text-snow hover:bg-white/10 transition">
              <span className="w-6 h-6 rounded-md accent-surface grid place-items-center shrink-0"><Plus size={14} className="accent-text" /></span> Neuer Chat
            </button>
            <button onClick={() => setLibraryOpen(true)} onMouseMove={glintMove}
              className="glint w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] text-mist hover:bg-white/10 hover:text-snow transition">
              <FolderOpen size={16} /> Projekte
            </button>
            <motion.button onClick={() => { setTab("memory"); setSideOpen(false); }} onMouseMove={glintMove}
              animate={memoryPulse ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={`glint w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] transition ${tab === "memory" ? "side-active text-snow" : "text-mist hover:bg-white/10 hover:text-snow"}`}>
              <Brain size={16} /> Gedächtnis
            </motion.button>
            <button onClick={() => { setTab("costs"); setSideOpen(false); }} onMouseMove={glintMove}
              className={`glint w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] transition ${tab === "costs" ? "side-active text-snow" : "text-mist hover:bg-white/10 hover:text-snow"}`}>
              <BarChart3 size={16} /> Kosten
            </button>
            <button onClick={() => { setTab("workflows"); setSideOpen(false); }} onMouseMove={glintMove}
              className={`glint w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] transition ${tab === "workflows" ? "side-active text-snow" : "text-mist hover:bg-white/10 hover:text-snow"}`}>
              <GitBranch size={16} /> Workflows
            </button>
            <button onClick={() => setSettingsOpen(true)} onMouseMove={glintMove}
              className="glint w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] text-mist hover:bg-white/10 hover:text-snow transition">
              <Settings size={16} /> Anpassen
            </button>
          </nav>

          {/* Recents */}
          <div className="text-[10px] text-mist uppercase tracking-widest px-4 pt-4 pb-1.5">Zuletzt</div>
          <div className="flex-1 overflow-y-auto px-1 space-y-0.5" style={{ perspective: "800px" }}>
            <AnimatePresence initial={false}>
              {projects.map(p => (
                <motion.div key={p.id} layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto", rotateX: 0 }}
                  exit={{ opacity: 0, height: 0, rotateX: -90, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
                  style={{ transformOrigin: "top center" }}>
                  {renamingId === p.id ? (
                    <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                      onBlur={() => { renameProject(p.id, renameVal); setRenamingId(null); }}
                      onKeyDown={e => {
                        if (e.key === "Enter") { renameProject(p.id, renameVal); setRenamingId(null); }
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="w-full glass-input px-3 py-2 rounded-lg text-[13px] outline-none" />
                  ) : (
                    <button onClick={() => { setPid(p.id); setTab("chat"); setSideOpen(false); }}
                      onDoubleClick={() => { setRenamingId(p.id); setRenameVal(p.name); }}
                      onMouseMove={glintMove}
                      onContextMenu={e => {
                        e.preventDefault();
                        setCtxMenu({ x: e.clientX, y: e.clientY, items: [
                          { label: "Umbenennen", icon: "", onClick: () => { setRenamingId(p.id); setRenameVal(p.name); } },
                          { label: "Chat forken / duplizieren", icon: "", onClick: () => forkProject(p.id) },
                          { label: "Token-Statistik", icon: "", onClick: () => openTokenStats(p.id) },
                          { label: "Express archivieren", icon: "", danger: true, onClick: () => archiveProject(p.id) },
                        ]});
                      }}
                      className={`glint w-full text-left px-3 py-2 rounded-lg text-[13px] truncate transition
                        ${busyPid === p.id ? "side-working text-snow" : p.id === pid && tab === "chat" ? "side-active text-snow" : "text-mist hover:bg-white/10 hover:text-snow"}`}>
                      <span className="relative z-10 flex items-center gap-2">
                        {busyPid === p.id && <span className="on-air" />}
                        <span className="truncate">{p.name}</span>
                      </span>
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {projects.length === 0 && <div className="text-xs text-mist px-3 py-2">Noch keine Chats.</div>}

            {/* Archive — real, loads lazily on open */}
            <div className="pt-1.5">
              <button onClick={() => { setArchivedOpen(o => !o); if (!archivedOpen) loadArchived(); }}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-mist hover:text-snow">
                <ChevronRight size={12} className={`transition-transform ${archivedOpen ? "rotate-90" : ""}`} /> Archiv
              </button>
              {archivedOpen && (
                <div className="space-y-0.5 pl-1">
                  {archived.length === 0 && <div className="text-[11px] text-mist px-3 py-1">Leer.</div>}
                  {archived.map(p => (
                    <button key={p.id} onClick={() => unarchiveProject(p.id)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-[12px] text-mist hover:bg-white/10 hover:text-snow truncate">
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.07] pt-2 mt-2 px-1">
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="w-8 h-8 pill bg-violet/30 border border-violet/40 grid place-items-center text-xs font-semibold text-snow">
                {(userName || "U").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-snow truncate">{userName || "Du"}</div>
                <div className="text-[10px] text-mist">Jarvis Bridge · lokal</div>
              </div>
              <button onClick={() => setSettingsOpen(true)} className="icon-btn w-8 h-8 pill glass-input grid place-items-center text-mist">⚙︎</button>
            </div>
          </div>
        </div>
      </aside>
      )}

      {/* ===== Main ===== */}
      <div className="depth-perspective flex-1 min-w-0 flex">
      <main className="depth-tilt glass card flex-1 flex flex-col min-w-0 overflow-hidden relative"
        data-tilted={anyOverlayOpen ? "1" : "0"}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}>
        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ scale: [0.9, 1.06, 1], opacity: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="absolute inset-0 z-40 bg-violet/10 backdrop-blur-sm border-2 border-dashed border-violet/50 rounded-[16px] grid place-items-center pointer-events-none">
              <div className="text-snow text-base">Bild hier ablegen</div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Cost/Latency Live-Ticker */}
        <div className="flex items-center justify-center gap-4 px-4 pt-2 text-[10px] text-mist font-mono">
          <span> ${spentToday.toFixed(4)} heute</span>
          {lastLatencyMs !== null && <span>⚡ {lastLatencyMs}ms letzte Antwort</span>}
        </div>
        {/* Header: model dropdown left, export right */}
        <header className={`flex items-center gap-2 px-3 md:px-4 py-2.5 ${focusMode ? "focus-dim" : "focus-bright"}`}>
          <button className="md:hidden icon-btn w-9 h-9 pill glass-input grid place-items-center" onClick={() => setSideOpen(true)}>☰</button>
          {sideHidden && <button className="hidden md:grid icon-btn w-9 h-9 pill glass-input place-items-center text-mist" onClick={() => setSideHidden(false)}>⟩</button>}

          {/* Model dropdown — grouped, scrollable, searchable */}
          <div className="relative">
            <button onClick={() => setModelMenuOpen(o => !o)}
              className="glass-input rounded-lg px-3 py-1.5 text-sm flex items-center gap-2 text-snow hover:bg-white/10">
              {model !== "agent" && <ProviderChip provider={MODELS.find(m => m.id === model)?.provider ?? ""} />}
              <span className="max-w-[140px] truncate">
                {model === "agent" ? (agent ? `${agent.name}` : "✦ Auto") : model === "auto" ? autoLabel : MODELS.find(m => m.id === model)?.label}
              </span>
              <span className="text-[10px] text-mist shrink-0">▾</span>
            </button>
            {modelMenuOpen && (
              <div className="absolute top-full mt-1.5 left-0 glass-dark card z-30 w-72 shadow-xl overflow-hidden flex flex-col"
                style={{ maxHeight: "min(420px, calc(100vh - 100px))" }}>
                {/* Search */}
                <div className="p-1.5 border-b border-white/8 shrink-0">
                  <input autoFocus placeholder="Modell suchen…"
                    onChange={e => setModelSearch(e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-1.5 text-xs outline-none" />
                </div>
                {/* Scrollable list */}
                <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5">
                  <button onClick={() => { setModel("agent"); setModelMenuOpen(false); setModelSearch(""); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${model === "agent" ? "accent-surface text-snow" : "text-mist hover:bg-white/10"}`}>
                    ✦ Vom Agent / Auto
                  </button>
                  {/* Group by provider */}
                  {[
                    { key: "anthropic", label: "Anthropic" },
                    { key: "openai",    label: "OpenAI" },
                    { key: "openrouter",label: "OpenRouter" },
                    { key: "google",    label: "Google" },
                    { key: "deepseek",  label: "DeepSeek" },
                  ].map(group => {
                    const groupModels = MODELS.filter(m =>
                      m.id !== "auto" &&
                      m.provider === group.key &&
                      (!modelSearch || m.label.toLowerCase().includes(modelSearch.toLowerCase()))
                    );
                    if (groupModels.length === 0) return null;
                    return (
                      <div key={group.key}>
                        <div className="text-[10px] uppercase tracking-widest text-mist px-3 py-1 flex items-center gap-1.5">
                          <ProviderChip provider={group.key} />{group.label}
                        </div>
                        {groupModels.map(m => {
                          const available = hasKeyForModel(m);
                          const price = PRICING[m.id]?.out;
                          return (
                            <button key={m.id}
                              onClick={() => available && (setModel(m.id), setModelMenuOpen(false), setModelSearch(""))}
                              disabled={!available}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center justify-between gap-2
                                ${!available ? "opacity-30 cursor-not-allowed" : model === m.id ? "accent-surface text-snow" : "text-snow/80 hover:bg-white/10"}`}>
                              <span className="truncate">{m.label}</span>
                              <span className="text-[10px] font-mono shrink-0 text-mist">
                                {!available ? "kein Key" : price != null ? `$${price}/M` : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {busy && <span className="on-air" title="Generiert…" />}

          <div className="flex-1 truncate text-center text-sm text-mist">{tab === "chat" ? (project?.name ?? "") : tab === "memory" ? "Gedächtnis" : tab === "workflows" ? "Workflows" : "Kosten"}</div>

          <button onClick={generateSkillFromChat} disabled={!pid || genSkillBusy}
            className="icon-btn px-3.5 py-2 pill glass-input text-xs text-snow hover:bg-white/10 disabled:opacity-30 flex items-center gap-1.5" title="Skill aus diesem Chat extrahieren">
            <span></span><span className="hidden sm:inline">{genSkillBusy ? "…" : "Skill"}</span>
          </button>
          <button onClick={exportFiles} disabled={!pid}
            className="icon-btn px-3.5 py-2 pill glass-input text-xs text-snow hover:bg-white/10 disabled:opacity-30 flex items-center gap-1.5">
            <span>⬆︎</span><span className="hidden sm:inline">Export</span>
          </button>
        </header>

        {!hasAnyKeyNow && (
          <button onClick={() => setSettingsOpen(true)} className="mx-4 mt-1 glass-dark card px-4 py-3 text-sm text-left flex items-center gap-3 soft-glow">
            <span className="text-plum text-lg">✦</span>
            <span className="text-snow"><b>Erster Schritt:</b> API-Key eintragen — hier tippen.</span>
          </button>
        )}

        {/* ===== Chat ===== */}
        {tab === "chat" && (
          <>
            <div ref={scrollRef} onScroll={onScroll} onMouseUp={onMessagesMouseUp} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3 max-w-3xl w-full mx-auto">
              {msgs.length === 0 && !busy && (
                <div className="h-full flex flex-col items-center justify-center gap-1">
                  {/* Photorealistic orb — centered, hero-sized */}
                  <ResonanceOrb
                    size={280}
                    tone={orbTone}
                    hue={parseInt(keys.ORB_HUE ?? "0") || 0}
                    speed={parseInt(keys.ORB_SPEED ?? "20") || 20}
                    morph={parseInt(keys.ORB_MORPH ?? "50") || 50}
                    glow={parseInt(keys.ORB_GLOW ?? "60") || 60}
                  />

                  <div className="flex flex-col items-center -mt-2">
                    <span className="font-serif font-medium text-snow" style={{ fontSize: 44, lineHeight: 1.08, letterSpacing: "-0.01em" }}>
                      {greet}{userName ? `, ${userName}` : ""}
                    </span>
                    {hasAnyKeyNow && (
                      <p className="font-serif italic text-mist mt-1.5" style={{ fontSize: 17 }}>
                        Antwortet nicht nur — versteht.
                      </p>
                    )}
                  </div>

                  {/* Smart-resume cards */}
                  {(() => {
                    const recent = projects.filter(p => p.messages && p.messages.length > 0).slice(0, 2);
                    if (recent.length === 0) return null;
                    return (
                      <div className="flex gap-2 mt-4 max-w-md w-full px-4">
                        {recent.map(p => (
                          <button key={p.id} onClick={() => { setPid(p.id); setTab("chat"); }}
                            className="glass card px-3 py-2.5 text-left flex-1 min-w-0 hover:bg-white/8 transition">
                            <div className="text-xs text-snow truncate font-medium">{p.name}</div>
                            <div className="text-[11px] text-mist truncate mt-0.5">{p.messages![0].content.slice(0, 60)}</div>
                            <div className="text-[10px] text-mist mt-1 font-mono">{timeAgo(p.messages![0].createdAt)}</div>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
              {msgs.map((m, i) => {
                const isLast = i === msgs.length - 1;
                return (
                <div key={i} className={`msg-in flex ${m.role === "user" ? "justify-end" : "justify-start"} group transition-all duration-500 ${focusMode && !isLast ? "opacity-40 saturate-50" : ""}`}>
                  <div onContextMenu={e => {
                    e.preventDefault();
                    const code = extractCodeBlock(m.content);
                    setCtxMenu({ x: e.clientX, y: e.clientY, items: [
                      { label: "Anderes Modell erzwingen: Sonnet", icon: "⇄", onClick: () => forceModelResend(m.content, "claude-sonnet-4-6") },
                      { label: "Anderes Modell erzwingen: GPT-4o", icon: "⇄", onClick: () => forceModelResend(m.content, "gpt-4o") },
                      { label: "In Skill umwandeln", icon: "", onClick: () => convertMessageToSkill(m.content) },
                      { label: "Deep Dive", icon: "", onClick: () => deepDive(m.content) },
                      ...(code ? [{ label: "Als Artifact öffnen", icon: "", onClick: () => setArtifact(code) }] : []),
                    ]});
                  }}
                    className={`relative max-w-[85%] px-4 py-3 leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "glass-dark rounded-xl text-snow" : "glass rounded-xl text-snow"} ${sparkIdx === i ? "memory-spark" : ""} ${m.usedMemory && isLast ? "ring-1 ring-inset ring-amber-400/20" : ""}`}>
                    {m.model && <div className="text-[10px] text-plum mb-1 font-mono font-medium flex items-center gap-1.5"><ProviderChip provider={MODELS.find(x => x.id === m.model)?.provider ?? ""} />{MODELS.find(x => x.id === m.model)?.label ?? m.model}</div>}
                    {m.role === "assistant" && isLast ? (
                      m.warp ? <FailoverWarp event={m.warp}><StreamText text={m.content} /></FailoverWarp> : <StreamText text={m.content} />
                    ) : m.content}
                    {m.role === "assistant" && (
                      <div className="flex gap-4 mt-2.5 text-[11px] text-mist opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => pinMsg(i, m.content)} className="icon-btn hover:text-snow">
                          {pinnedIdx === i ? "Gemerkt" : "Merken"}
                        </button>
                        <CopyButton text={m.content} />
                        {extractCodeBlock(m.content) && (
                          <button onClick={() => setArtifact(extractCodeBlock(m.content))} className="icon-btn hover:text-snow">Artifact</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );})}
              {busy && (
                <div className="flex justify-start msg-in">
                  <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 w-56">
                    <ThinkingOrb isLoading size="sm" />
                    <div className="flex-1 space-y-1.5">
                      <div className="sk h-2 w-full" />
                      <div className="sk h-2 w-2/3" />
                    </div>
                  </div>
                </div>
              )}
              {err && (
                <div className="glass-dark border border-violet/30 card px-4 py-3 text-sm text-snow">
                  {err}
                  {/key/i.test(err) && <button onClick={() => setSettingsOpen(true)} className="block mt-1 text-plum font-medium">→ Einstellungen</button>}
                </div>
              )}
              <div ref={endRef} />
            </div>

            {showScrollBadge && (
              <button onClick={() => { setAutoScroll(true); endRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                className="icon-btn absolute bottom-44 right-6 md:right-10 w-10 h-10 pill glass-dark grid place-items-center soft-glow-white z-10">↓</button>
            )}

            {/* Composer */}
            {flyingImage && <FlyingThumb src={flyingImage.src} from={flyingImage.from} targetRef={composerRef} />}
            <div className={`p-3 md:p-4 transition-all duration-500 ${focusMode ? "focus-dim" : "focus-bright"}`}>
              <div ref={composerRef} className="max-w-3xl mx-auto space-y-2.5 relative">
                {slashOpen && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 glass-dark card p-2 z-20 soft-glow-white">
                    {[["/new","＋ Neuer Chat"],["/library"," Bibliothek"],["/settings","⚙︎ Einstellungen"],["/export","⬆︎ Export"]]
                      .filter(([c]) => c.startsWith(input))
                      .map(([c, l]) => (
                        <button key={c} onClick={() => runCommand(c)}
                          className="w-full text-left px-3 py-2 pill hover:bg-white/10 text-sm flex justify-between text-snow">
                          <span>{l}</span><span className="text-plum text-[11px]">{c}</span>
                        </button>
                      ))}
                  </div>
                )}

                {/* Action chips (only when empty chat) */}
                {msgs.length === 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-0.5 justify-center [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {ACTION_CHIPS.map((c, i) => (
                      <motion.button key={c.label}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, type: "spring", stiffness: 350, damping: 30 }}
                        onClick={() => { setInput(c.prompt); inputRef.current?.focus(); }}
                        className="icon-btn glass-input rounded-lg px-3.5 py-2 text-[13px] whitespace-nowrap text-snow flex items-center gap-2">
                        <c.Icon size={14} className="text-mist" />{c.label}
                      </motion.button>
                    ))}
                  </div>
                )}

                {agentSkills.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap px-1 justify-center">
                    {agentSkills.map(s => (
                      <span key={s.id} className="px-2.5 py-0.5 pill text-[10px] glass-input text-plum"> {s.name}</span>
                    ))}
                  </div>
                )}

                {piiPreview.maskCount > 0 && (
                  <div className="px-2 text-[11px] text-plum flex items-center gap-1.5">
                    <span className="accent-text">•</span> {piiPreview.maskCount} sensible {piiPreview.maskCount === 1 ? "Angabe" : "Angaben"} erkannt — wird vor dem Senden maskiert.
                  </div>
                )}

                {/* Input dock */}
                <div className="composer" data-busy={busy ? "1" : "0"}>
                  <div className="glass edge-glow rounded-[16px] p-2 pl-3 relative overflow-hidden">
                    {/* Draft vaporizer overlay */}
                    {vaporFrags && (
                      <div className="absolute inset-0 pointer-events-none flex flex-wrap items-center gap-1 px-5 z-10">
                        {vaporFrags.map((f, i) => (
                          <span key={i} className="vapor-frag text-snow/70 text-sm"
                            style={{ animationDelay: `${i * 12}ms`, ["--tx" as any]: `${f.tx}px`, ["--rot" as any]: `${f.rot}deg` }}>
                            {f.text}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Attached image chip */}
                    {attachedImage && (
                      <div className="flex items-center gap-2 px-2 pt-1 pb-2">
                        {attachedImage.mediaType === "application/pdf" ? (
                          <div className="w-9 h-9 rounded-lg glass-input flex items-center justify-center text-[10px] font-mono accent-text">PDF</div>
                        ) : (
                          <img src={`data:${attachedImage.mediaType};base64,${attachedImage.data}`} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        )}
                        <span className="text-xs text-mist truncate max-w-[160px]">{attachedImage.name}</span>
                        <button onClick={() => setAttachedImage(null)} className="icon-btn text-mist text-xs">✕</button>
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                      <button onClick={() => fileInputRef.current?.click()} className="icon-btn text-mist hover:text-plum text-lg pb-2.5 pl-1" title="Bild anhängen"></button>
                      <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                        onPaste={onPaste}
                        onKeyDown={e => {
                          const enterSends = keys.UI_ENTERSENDS !== "false";
                          if (e.key === "Enter" && enterSends && !e.shiftKey) { e.preventDefault(); send(); }
                          if (e.key === "Enter" && !enterSends && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
                          if (e.key === "ArrowUp" && !input) {
                            const last = [...msgs].reverse().find(m => m.role === "user");
                            if (last) setInput(last.content);
                          }
                        }}
                        rows={1} placeholder="Frag irgendwas…"
                        className="flex-1 bg-transparent resize-none outline-none py-2.5 max-h-48 placeholder:text-mist text-snow" />
                      {input.trim() && !busy && (
                        <button onClick={vaporize} className="icon-btn text-mist hover:text-plum text-sm pb-2.5" title="Verwerfen">✕</button>
                      )}
                      {busy ? (
                        <button onClick={stop} className="icon-btn glint w-11 h-11 pill bg-violet text-white grid place-items-center soft-glow shrink-0" onMouseMove={glintMove}>
                          <span className="w-3 h-3 bg-white rounded-sm" />
                        </button>
                      ) : (
                        <div className="relative w-11 h-11 shrink-0">
                          <svg className="siphon-ring absolute inset-0 w-11 h-11 pointer-events-none" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                            <circle cx="22" cy="22" r="19" fill="none" strokeWidth="2" strokeLinecap="round"
                              stroke={contextTokenPct > 90 ? "#E2574C" : contextTokenPct > 60 ? "#E8B84B" : "#6FCF97"}
                              className={contextTokenPct > 90 ? "siphon-flicker" : ""}
                              strokeDasharray={2 * Math.PI * 19} strokeDashoffset={2 * Math.PI * 19 * (1 - contextTokenPct / 100)} />
                          </svg>
                          <button onClick={send} disabled={!input.trim()} onMouseMove={glintMove}
                            className="icon-btn glint absolute inset-0 w-11 h-11 pill bg-violet text-white text-lg grid place-items-center disabled:opacity-30 soft-glow">↑</button>
                        </div>
                      )}
                    </div>
                    {/* Bottom toolbar in dock */}
                    <div className="flex items-center gap-1 pt-1.5 pl-1">
                      <button onClick={() => setLibraryOpen(true)} className="icon-btn px-2.5 py-1 rounded-lg text-[11px] text-mist hover:bg-white/10 flex items-center gap-1">Agenten</button>
                      <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button onClick={() => setActiveAgent("")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap ${!activeAgent ? "accent-surface accent-text" : "text-mist hover:bg-white/10"}`}>Kein</button>
                        {agents.slice(0, 5).map(a => (
                          <button key={a.id} onClick={() => setActiveAgent(a.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap ${activeAgent === a.id ? "accent-surface accent-text" : "text-mist hover:bg-white/10"}`}>
                            {a.name}
                          </button>
                        ))}
                      </div>
                      {/* Live token/cost estimate */}
                      {input.trim() && (() => {
                        const tok = estimateTokens(input);
                        const priceModel = model === "auto" || model === "agent" ? "gpt-4o-mini" : model;
                        const price = PRICING[priceModel]?.out ?? 1;
                        const est = (tok / 1_000_000) * price;
                        const prefix = model === "auto" || model === "agent" ? "ab " : "";
                        return <span className="ml-auto text-[10px] text-mist font-mono shrink-0 pr-1">~{tok} Tok · {prefix}${est.toFixed(4)}</span>;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== Memory ===== */}
        {tab === "memory" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-3xl w-full mx-auto space-y-2.5">
            {!pid && <div className="text-mist text-sm text-center mt-8">Wähle links einen Chat, um sein Gedächtnis zu sehen.</div>}
            {pid && <>
            <div className="glass card p-3 space-y-2">
              <div className="flex gap-2 flex-wrap">
                <select value={memKind} onChange={e => setMemKind(e.target.value)} className="glass-input pill px-3 py-2 text-sm outline-none">
                  {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <input value={memText} onChange={e => setMemText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && memText.trim()) { saveMemory(memKind, memText); setMemText(""); } }}
                  placeholder="Neuer Eintrag…"
                  className="flex-1 min-w-[160px] glass-input pill px-4 py-2 text-sm outline-none focus:ring-2 ring-violet/50" />
                <button onClick={() => { if (memText.trim()) { saveMemory(memKind, memText); setMemText(""); } }}
                  className="icon-btn px-4 py-2 pill bg-violet text-white text-sm soft-glow">Speichern</button>
              </div>
            </div>
            {memories.map(m => (
              <div key={m.id} className="glass card p-3.5 flex gap-3 items-start group">
                <span className="text-[10px] uppercase tracking-wider text-plum font-medium mt-0.5 w-24 shrink-0">
                  {KINDS.find(k => k[0] === m.kind)?.[1] ?? m.kind}
                </span>
                <p className="flex-1 text-sm text-snow">{m.content}</p>
                <button onClick={() => delMemory(m)} className="icon-btn text-mist hover:text-plum text-sm opacity-0 group-hover:opacity-100">✕</button>
              </div>
            ))}
            {memories.length === 0 && <div className="text-mist text-sm text-center mt-16">Noch leer. Nutze Merken im Chat.</div>}
            </>}
          </div>
        )}

        {/* ===== Costs ===== */}
        {tab === "costs" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-3xl w-full mx-auto space-y-2.5">
            {(() => {
              // Real savings: actual spend vs. a baseline where every run used the priciest model (claude-sonnet-4-6).
              const baselineRate = 3 / 1_000_000 * 0.7 + 15 / 1_000_000 * 0.3; // rough blended in/out baseline
              const baselineTotal = costs.runs.reduce((s, r: any) => s + (r.inputTokens + r.outputTokens) * baselineRate, 0);
              const saved = Math.max(0, baselineTotal - costs.total);
              const profiles: ModelProfile[] = [
                { id: "claude-sonnet-4-6", provider: "anthropic", inputPer1M: 3, outputPer1M: 15, qualityTier: 3, healthy: true, avgLatencyMs: 900 },
                { id: "claude-haiku-4-5", provider: "anthropic", inputPer1M: 1, outputPer1M: 5, qualityTier: 2, healthy: true, avgLatencyMs: 500 },
                { id: "gpt-4o", provider: "openai", inputPer1M: 2.5, outputPer1M: 10, qualityTier: 3, healthy: true, avgLatencyMs: 800 },
                { id: "gpt-4o-mini", provider: "openai", inputPer1M: 0.15, outputPer1M: 0.6, qualityTier: 1, healthy: true, avgLatencyMs: 400 },
                { id: "z-ai/glm-4.6", provider: "openrouter", inputPer1M: 0.6, outputPer1M: 2.2, qualityTier: 2, healthy: true, avgLatencyMs: 700 },
              ];
              return <CostLedger profiles={profiles} savedUsd={saved} />;
            })()}
            {costs.runs.map((r: any) => (
              <div key={r.id} className="glass card px-4 py-3 flex justify-between items-center text-sm">
                <div>
                  <div className="font-medium text-snow">{r.model}</div>
                  <div className="text-[11px] text-mist">{r.project?.name} · {r.inputTokens} in / {r.outputTokens} out</div>
                </div>
                <div className="text-plum font-medium">${r.costUsd.toFixed(4)}</div>
              </div>
            ))}
            {costs.runs.length === 0 && <div className="text-mist text-sm text-center mt-16">Noch keine Anfragen.</div>}
          </div>
        )}

        {/* ===== Workflows ===== */}
        {tab === "workflows" && (() => {
          const dailyBudget = parseFloat(keys.DAILY_BUDGET_USD || "0");
          const monthlyBudget = parseFloat(keys.MONTHLY_BUDGET_USD || "0");
          const dayRatio = dailyBudget > 0 ? spentToday / dailyBudget : 0;
          const monthRatio = monthlyBudget > 0 ? costs.total / monthlyBudget : 0;
          const ratio = Math.max(dayRatio, monthRatio);
          const gateStatus: "green" | "amber" | "red" = ratio >= 1 ? "red" : ratio >= 0.8 ? "amber" : "green";
          const lastStep = workflowResult?.steps[workflowResult.steps.length - 1] ?? null;

          return (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-4">
                {/* Center: isometric workroom + builder */}
                <div className="space-y-4 min-w-0">
                  <div className="glass card p-4 space-y-3">
                    <h3 className="font-medium text-snow text-sm">Neuer Workflow</h3>
                    <input value={workflowPrompt} onChange={e => setWorkflowPrompt(e.target.value)} placeholder="Start-Prompt für die Kette…"
                      className="w-full glass-input pill px-4 py-2 text-sm outline-none focus:ring-2 ring-violet/50" />
                    <WorkflowBuilder
                      availableAgents={agents.map(a => ({ id: a.id, emoji: a.emoji, name: a.name }))}
                      onRun={runWorkflow}
                      onSave={saveWorkflow}
                    />
                  </div>

                  <SpatialWorkroom
                    steps={workflowResult?.steps ?? []}
                    activeStepIndex={replayIndex}
                    running={workflowRunning}
                    gateStatus={gateStatus}
                  />

                  <WorkroomEventLog
                    steps={workflowResult?.steps ?? []}
                    budgetWarning={gateStatus !== "green" ? `Budget-Auslastung bei ${Math.round(ratio * 100)}%` : undefined}
                  />

                  {workflows.length > 0 && (
                    <div>
                      <div className="text-[10px] text-mist uppercase tracking-widest mb-1.5">Gespeicherte Workflows</div>
                      <div className="space-y-1.5">
                        {workflows.map(w => (
                          <div key={w.id} className="glass card px-3.5 py-2.5 flex items-center justify-between text-sm">
                            <span className="text-snow">{w.name}</span>
                            <button onClick={() => runWorkflow(w.agentIds.split(","))} className="text-xs accent-text">Ausführen</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right control column */}
                <div className="space-y-3">
                  <UsageTrackingPanel runs={costs.runs} />
                  <SmartModelChoicePanel lastStep={lastStep} threshold={parseFloat(keys.ROUTING_THRESHOLD || "50")} />
                  <HumanControlPanel approvalsPending={gateStatus !== "green" ? 1 : 0} onOpen={() => setActionModalOpen(true)} />
                  <SecurityGatePanel gateStatus={gateStatus} ratio={ratio} />
                </div>
              </div>

              <ActionRequestModal
                open={actionModalOpen}
                onClose={() => setActionModalOpen(false)}
                onAdjustBudget={() => { setActionModalOpen(false); setSettingsOpen(true); setSettingsTab("ui"); }}
              />
            </div>
          );
        })()}
      </main>
      </div>

      {/* ===== Command Menu ===== */}
      {cmdOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-start pt-[15vh] p-4" onClick={() => setCmdOpen(false)}>
          <div className="glass card w-full max-w-lg p-3 space-y-2 soft-glow-white mx-auto" onClick={e => e.stopPropagation()}>
            <input autoFocus value={cmdQuery} onChange={e => setCmdQuery(e.target.value)} placeholder=" Chats, Agenten, Aktionen…"
              className="w-full bg-transparent px-3 py-3 text-lg outline-none text-snow placeholder:text-mist" />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {[
                { label: "＋ Neuer Chat", action: () => { setCmdOpen(false); newChat(); } },
                ...projects.filter(p => p.name.toLowerCase().includes(cmdQuery.toLowerCase())).slice(0, 5).map(p => ({ label: p.name, action: () => { setPid(p.id); setTab("chat"); setCmdOpen(false); } })),
                ...agents.filter(a => a.name.toLowerCase().includes(cmdQuery.toLowerCase())).slice(0, 3).map(a => ({ label: `${a.emoji} Agent: ${a.name}`, action: () => { setActiveAgent(a.id); setCmdOpen(false); } })),
                { label: "⚙︎ Einstellungen", action: () => { setCmdOpen(false); setSettingsOpen(true); } },
                { label: " Bibliothek", action: () => { setCmdOpen(false); setLibraryOpen(true); } },
              ].slice(0, 9).map((item, i) => (
                <button key={i} onClick={item.action} className="w-full text-left px-3 py-2 pill hover:bg-white/10 text-sm text-snow">{item.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== Settings ===== */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        keys={keys}
        setKeys={setKeys}
        costs={costs}
        initialsFrom={keys.FULL_NAME || keys.PREFERRED_NAME || userName || "Du"}
      />

      {/* ===== Library ===== */}
      {libraryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => { setLibraryOpen(false); setEditAgent(null); setEditSkill(null); }}>
          <div className="glass card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-5 soft-glow-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-xl text-snow"> Bibliothek</h2>
              <button onClick={() => { setLibraryOpen(false); setEditAgent(null); setEditSkill(null); }} className="icon-btn w-8 h-8 pill glass-input grid place-items-center">✕</button>
            </div>

            {editAgent ? (
              <div className="space-y-3">
                <h3 className="font-medium text-snow">{editAgent.id ? "Agent bearbeiten" : "Neuer Agent"}</h3>
                <div className="flex gap-2">
                  <input value={editAgent.emoji} onChange={e => setEditAgent({ ...editAgent, emoji: e.target.value })}
                    className="w-14 glass-input pill px-3 py-2 text-center text-lg outline-none" maxLength={2} />
                  <input value={editAgent.name} onChange={e => setEditAgent({ ...editAgent, name: e.target.value })} placeholder="Name"
                    className="flex-1 glass-input pill px-4 py-2 text-sm outline-none focus:ring-2 ring-violet/50" />
                </div>
                <input value={editAgent.role} onChange={e => setEditAgent({ ...editAgent, role: e.target.value })} placeholder="Rolle"
                  className="w-full glass-input pill px-4 py-2 text-sm outline-none" />
                <textarea value={editAgent.systemPrompt} onChange={e => setEditAgent({ ...editAgent, systemPrompt: e.target.value })} placeholder="System-Prompt"
                  rows={5} className="w-full glass-input card px-4 py-3 text-sm outline-none focus:ring-2 ring-violet/50 resize-none" />
                <select value={editAgent.preferredModel} onChange={e => setEditAgent({ ...editAgent, preferredModel: e.target.value })}
                  className="w-full glass-input pill px-4 py-2 text-sm outline-none">
                  {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <div>
                  <div className="text-[11px] text-mist uppercase tracking-wider mb-1">Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(s => {
                      const ids = editAgent.skillIds.split(",").filter(Boolean);
                      const on = ids.includes(s.id);
                      return (
                        <button key={s.id} onClick={() => {
                          const next = on ? ids.filter(x => x !== s.id) : [...ids, s.id];
                          setEditAgent({ ...editAgent, skillIds: next.join(",") });
                        }} className={`px-3 py-1 pill text-xs ${on ? "bg-violet text-white" : "glass-input text-mist"}`}>
                          {on && "✓ "}{s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditAgent(null)} className="flex-1 py-2.5 pill glass-input text-sm">Abbrechen</button>
                  <button onClick={() => saveAgent(editAgent)} className="flex-1 py-2.5 pill bg-violet text-white text-sm font-medium soft-glow">Speichern</button>
                </div>
              </div>
            ) : editSkill ? (
              <div className="space-y-3">
                <h3 className="font-medium text-snow">{editSkill.id ? "Skill bearbeiten" : "Neuer Skill"}</h3>
                <input value={editSkill.name} onChange={e => setEditSkill({ ...editSkill, name: e.target.value })} placeholder="Name"
                  className="w-full glass-input pill px-4 py-2 text-sm outline-none focus:ring-2 ring-violet/50" />
                <input value={editSkill.description} onChange={e => setEditSkill({ ...editSkill, description: e.target.value })} placeholder="Kurzbeschreibung"
                  className="w-full glass-input pill px-4 py-2 text-sm outline-none" />
                <textarea value={editSkill.instructions} onChange={e => setEditSkill({ ...editSkill, instructions: e.target.value })} placeholder="Anweisungen"
                  rows={6} className="w-full glass-input card px-4 py-3 text-sm outline-none focus:ring-2 ring-violet/50 resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => setEditSkill(null)} className="flex-1 py-2.5 pill glass-input text-sm">Abbrechen</button>
                  <button onClick={() => saveSkill(editSkill)} className="flex-1 py-2.5 pill bg-violet text-white text-sm font-medium soft-glow">Speichern</button>
                </div>
              </div>
            ) : (
              <>
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-snow">Agenten</h3>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-plum icon-btn cursor-pointer">
                        ⇩ Importieren
                        <input type="file" accept=".nnagent,.json" className="hidden" onChange={async e => {
                          const f = e.target.files?.[0]; if (!f) return;
                          const text = await f.text();
                          try { const a = JSON.parse(text); await saveAgent({ name: a.name, emoji: a.emoji, role: a.role, systemPrompt: a.systemPrompt, preferredModel: a.preferredModel ?? "auto", skillIds: "" }); }
                          catch { setErr("Ungültige .nnagent-Datei"); }
                          e.target.value = "";
                        }} />
                      </label>
                      <button onClick={() => setEditAgent({ id: "", name: "", emoji: "✦", role: "", systemPrompt: "", preferredModel: "auto", skillIds: "" })}
                        className="text-xs text-plum icon-btn">＋ Neuer Agent</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {agents.map(a => (
                      <div key={a.id} className="glass card p-3 group relative hover:soft-glow-white transition">
                        <div className="text-2xl mb-1">{a.emoji}</div>
                        <div className="font-medium text-sm text-snow">{a.name}</div>
                        <div className="text-[11px] text-mist truncate">{a.role}</div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                          <button onClick={() => {
                            const blob = new Blob([JSON.stringify(a, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a"); link.href = url; link.download = `${a.name}.nnagent`; link.click();
                          }} className="icon-btn w-6 h-6 pill glass-input text-xs" title="Exportieren">⇧</button>
                          <button onClick={() => setEditAgent(a)} className="icon-btn w-6 h-6 pill glass-input text-xs">✎</button>
                          <button onClick={() => delAgent(a.id)} className="icon-btn w-6 h-6 pill glass-input text-xs text-plum">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-snow">Skills</h3>
                    <button onClick={() => setEditSkill({ id: "", name: "", description: "", instructions: "" })}
                      className="text-xs text-plum icon-btn">＋ Neuer Skill</button>
                  </div>
                  <div className="space-y-1.5">
                    {skills.map(s => (
                      <div key={s.id} className="glass card px-3.5 py-2.5 flex items-center gap-3 group">
                        <span className="text-plum"></span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-snow">{s.name}</div>
                          <div className="text-[11px] text-mist truncate">{s.description}</div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <button onClick={() => setEditSkill(s)} className="icon-btn w-7 h-7 pill glass-input text-xs">✎</button>
                          <button onClick={() => delSkill(s.id)} className="icon-btn w-7 h-7 pill glass-input text-xs text-plum">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      )}

      <ContextMenu state={ctxMenu} onClose={() => setCtxMenu(null)} />

      <AnimatePresence>
        {shortcutsOpen && (
          <motion.div className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm grid place-items-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={() => setShortcutsOpen(false)}>
            <motion.div className="glass-dark modal p-5 max-w-md w-full"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }} onClick={e => e.stopPropagation()}>
              <div className="text-sm font-medium text-snow mb-3">Tastenkürzel</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                {[["Suche / Befehle", "⌘K"], ["Einstellungen", "⌘,"], ["Sidebar", "⌘."], ["Letzte Nachricht", "↑"], ["Diese Übersicht", "⌘/"], ["Schließen", "Esc"]].map(([l, k]) => (
                  <div key={l} className="flex justify-between text-mist"><span>{l}</span><kbd className="glass-input px-2 py-0.5 rounded text-[10px] text-snow">{k}</kbd></div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Artifacts Sidebar: code slides out on the right, chat keeps flowing */}
      <AnimatePresence>
        {artifact && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-2 md:top-3 right-2 md:right-3 bottom-2 md:bottom-3 w-full max-w-md z-[65] glass-dark card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-widest text-plum">{artifact.lang}</span>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(artifact.code)} className="icon-btn text-xs glass-input px-2.5 py-1 pill">⧉ Kopieren</button>
                <button onClick={() => setArtifact(null)} className="icon-btn w-7 h-7 pill glass-input grid place-items-center">✕</button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto text-xs bg-black/30 rounded-xl p-3 text-snow whitespace-pre-wrap">{artifact.code}</pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Token-Statistik Mini-Diagramm */}
      {statsProjectId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => { setStatsProjectId(null); setStatsData(null); }}>
          <div className="glass card w-full max-w-sm p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-snow text-sm">Token-Statistik</h3>
              <button onClick={() => { setStatsProjectId(null); setStatsData(null); }} className="icon-btn w-7 h-7 pill glass-input grid place-items-center">✕</button>
            </div>
            {statsData ? (() => {
              const byModel: Record<string, number> = {};
              for (const r of statsData.runs) byModel[r.model] = (byModel[r.model] ?? 0) + r.costUsd;
              const max = Math.max(...Object.values(byModel), 0.0001);
              return (
                <div className="space-y-2">
                  <div className="text-2xl font-light text-snow">${statsData.total.toFixed(4)}</div>
                  {Object.entries(byModel).map(([m, c]) => (
                    <div key={m}>
                      <div className="flex justify-between text-[11px] text-mist mb-0.5"><span>{m}</span><span>${c.toFixed(4)}</span></div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-violet rounded-full" style={{ width: `${(c / max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })() : <div className="text-mist text-sm">Lädt…</div>}
          </div>
        </div>
      )}

      {/* Contextual Text-Selection HUD */}
      <AnimatePresence>
        {selectionHud && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.18 }}
            style={{ position: "fixed", left: selectionHud.x, top: selectionHud.y, transform: "translate(-50%, -100%)" }}
            className="z-[70] glass-dark card px-1.5 py-1.5 flex gap-1">
            <button onClick={() => { deepDive(selectionHud.text); setSelectionHud(null); }} className="ctx-item hover:bg-white/10 text-snow text-xs">Einfacher erklären</button>
            <button onClick={() => { saveMemory("note", selectionHud.text); setSelectionHud(null); }} className="ctx-item hover:bg-white/10 text-snow text-xs">Zu Gedächtnis</button>
            <button onClick={() => { setInput(`Übersetze ins Englische: "${selectionHud.text}"`); setSelectionHud(null); inputRef.current?.focus(); }} className="ctx-item hover:bg-white/10 text-snow text-xs">Übersetzen</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Artifacts Panel v2 */}
      <AnimatePresence>
        {artifacts.length > 0 && (
          <div className="fixed right-0 top-0 bottom-0 z-[60]" style={{ width: artifactPanelWidth }}>
            <ArtifactPanel
              artifacts={artifacts}
              selectedId={selectedArtifactId}
              onSelectVersion={setSelectedArtifactId}
              onClose={() => setArtifacts([])}
              width={artifactPanelWidth}
              onWidthChange={setArtifactPanelWidth}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Command Palette */}
      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        commands={cmdPaletteCommands}
        recent={cmdRecent}
        onRecentUpdate={setCmdRecent}
      />

      {undoToast && (
        <div className="toast-in fixed bottom-6 left-1/2 z-50 glass-dark card px-4 py-3 flex items-center gap-4 text-sm soft-glow-white">
          <span className="text-snow">{undoToast.msg}</span>
          <button onClick={undoToast.undo} className="text-plum font-medium hover:text-white">Rückgängig</button>
          <button onClick={() => setUndoToast(null)} className="text-mist">✕</button>
        </div>
      )}
    </div>
  );
}

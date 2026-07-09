"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  BookOpen,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Database,
  FileText,
  Layers3,
  Lock,
  Plus,
  Settings,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { PremiumSlideAction } from "@/components/PremiumSlideAction";
import { SettingsModal } from "@/components/SettingsModal";

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

type WorkspaceMode = {
  id: string;
  label: string;
  purpose: string;
  audience: string;
  steps: string[];
  skills: string[];
  output: string;
};

type View = "home" | "workspaces" | "skills" | "templates" | "knowledge" | "usage" | "settings";
type WorkspacePanel = "overview" | "workflow" | "outputs" | "client";

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
  const [buildState, setBuildState] = useState<"idle" | "loading" | "complete">("idle");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [workspacePanel, setWorkspacePanel] = useState<WorkspacePanel>("overview");
  const [stepState, setStepState] = useState<"idle" | "loading" | "complete">("idle");
  const [finalState, setFinalState] = useState<"idle" | "loading" | "complete">("idle");
  const [clientMode, setClientMode] = useState(false);
  const [clientState, setClientState] = useState<"idle" | "loading" | "complete">("idle");
  const [sessionState, setSessionState] = useState<"idle" | "loading" | "complete">("idle");

  const selectedMode = useMemo(
    () => workspaceModes.find((mode) => mode.id === selectedModeId) ?? workspaceModes[1],
    [selectedModeId],
  );
  const selectedWorkspace = projects.find((project) => project.id === selectedWorkspaceId) ?? projects[0];
  const selectedWorkspaceMode = inferMode(selectedWorkspace);
  const hasWorkspaces = projects.length > 0;

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const mode = workspaceModes.find((item) => item.id === selectedModeId);
    if (!mode) return;
    setWorkspaceName(mode.label === "BRAND STRATEGY" ? "Brand Strategy System" : `${mode.label.replace(/\b\w/g, (m) => m.toUpperCase())} Workspace`);
    setWorkspaceAudience(mode.audience);
    setWorkspaceIntent(mode.purpose);
  }, [selectedModeId]);

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
    if (settingsData?.keys) setKeys(settingsData.keys);
  }

  async function buildWorkspace() {
    setBuildState("loading");
    const created = await safeJson("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: workspaceName,
        goal: `${workspaceIntent}\nAudience: ${workspaceAudience}\nMode: ${selectedMode.label}\nOutput: ${selectedMode.output}`,
        rules: `Workflow steps: ${selectedMode.steps.join(" | ")}\nSkills: ${selectedMode.skills.join(" | ")}`,
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
    }, 650);
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

  const navigation = [
    { id: "home", label: "Home", icon: Compass },
    { id: "workspaces", label: "Workspaces", icon: Layers3 },
    { id: "skills", label: "Skills", icon: Sparkles },
    { id: "templates", label: "Templates", icon: Boxes },
    { id: "knowledge", label: "Knowledge", icon: Database },
    { id: "usage", label: "Usage", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <main className="nn-shell">
      <aside className="nn-sidebar">
        <button className="brand-lockup" onClick={() => setView("home")}>
          <span className="brand-mark">N</span>
          <span>
            <strong>NeuralNexus</strong>
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
        {view === "home" && (
          <div className="nn-home">
            <section className="home-hero">
              <div className="hero-copy">
                <span className="eyebrow">AI WORKSPACE BUILDER</span>
                <h1>Turn your expertise into reusable AI workspaces.</h1>
                <p>Build client-ready systems from your knowledge, prompts, PDFs, methods and workflows.</p>
                <div className="hero-actions">
                  <button className="primary-pill" onClick={() => setWizardOpen(true)}>
                    <Plus size={18} /> Create workspace
                  </button>
                  <button className="secondary-pill" onClick={() => setView("templates")}>
                    Explore templates <ChevronRight size={17} />
                  </button>
                </div>
              </div>
              <WorkspaceObject mode={workspaceModes[1]} featured />
            </section>

            <section className="home-grid">
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

              {hasWorkspaces && (
                <div className="liquid-card focus-session">
                  <span className="object-label">CONTINUE WORKSPACE</span>
                  <h2>{projects[0].name}</h2>
                  <p>Next: {inferMode(projects[0]).steps[0]}.</p>
                  <PremiumSlideAction
                    label="Slide to start session"
                    completionText="Session starting"
                    loading={sessionState === "loading"}
                    completed={sessionState === "complete"}
                    onComplete={startWorkspaceSession}
                  />
                </div>
              )}

              {!hasWorkspaces && (
                <div className="liquid-card focus-session">
                  <span className="object-label">START HERE</span>
                  <h2>Your first workspace becomes the product.</h2>
                  <p>Choose a mode, add your method and package it into a reusable system.</p>
                  <button className="primary-pill full" onClick={() => setWizardOpen(true)}>
                    <Plus size={18} /> Create workspace
                  </button>
                </div>
              )}
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
            </header>
            <div className="usage-grid">
              <Stat label="Today" value="$0.0000" />
              <Stat label="This month" value={`$${(costs.total ?? 0).toFixed(4)}`} />
              <Stat label="Tracked runs" value={`${costs.runs?.length ?? 0}`} />
              <Stat label="Budget mode" value="Balanced" />
            </div>
            <div className="liquid-panel usage-panel">
              <span className="object-label">TOP MODELS</span>
              {(costs.runs ?? []).slice(0, 6).map((run, index) => (
                <div key={`${run.id ?? run.model}-${index}`} className="usage-row">
                  <span>{run.model ?? "Model"}</span>
                  <strong>${Number(run.costUsd ?? 0).toFixed(4)}</strong>
                </div>
              ))}
              {costs.runs?.length === 0 && <p>No model runs tracked yet. Usage appears here once workspaces generate live outputs.</p>}
            </div>
          </div>
        )}
      </section>

      {wizardOpen && (
        <div className="wizard-backdrop" role="dialog" aria-modal="true">
          <div className="wizard-modal">
            <button className="modal-close" onClick={() => setWizardOpen(false)}>Close</button>
            <div className="wizard-grid">
              <div>
                <span className="eyebrow">CREATE WORKSPACE</span>
                <h2>Choose the system you want to package.</h2>
                <ModeSelector selectedId={selectedModeId} onSelect={setSelectedModeId} />
              </div>

              <div className="summary-card">
                <span className="object-label">YOUR WORKSPACE IS READY</span>
                <label>
                  Workspace name
                  <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
                </label>
                <label>
                  Audience
                  <input value={workspaceAudience} onChange={(event) => setWorkspaceAudience(event.target.value)} />
                </label>
                <label>
                  Purpose
                  <textarea value={workspaceIntent} onChange={(event) => setWorkspaceIntent(event.target.value)} rows={3} />
                </label>
                <div className="summary-block">
                  <strong>{selectedMode.label} WORKSPACE</strong>
                  <span>Includes: {selectedMode.skills.join(" · ")} · {selectedMode.steps.length} workflow steps</span>
                  <span>Mode: Strategic · Premium</span>
                  <span>Budget: Balanced</span>
                </div>
                <PremiumSlideAction
                  label="Slide to build workspace"
                  completionText="Workspace created"
                  loading={buildState === "loading"}
                  completed={buildState === "complete"}
                  onComplete={buildWorkspace}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          if (view === "settings") setView("home");
        }}
        keys={keys}
        setKeys={setKeys}
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

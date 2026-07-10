"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, KeyRound, ShieldCheck, BarChart3, GitBranch, Monitor, Tag, Database, Search, X, Check, Sparkles } from "lucide-react";
import { POSITIONING_UI } from "@/lib/positioning";
import { AckField } from "@/components/ui/AckField";

type Keys = Record<string, string>;

const PROVIDER_LOGO: Record<string, string> = {
  anthropic: "/logos/anthropic.svg", openai: "/logos/openai.svg", google: "/logos/gemini.svg",
  deepseek: "/logos/deepseek.svg", openrouter: "/logos/openrouter.svg",
};
const KEY_FIELDS = [
  { k: "OPENROUTER_API_KEY", label: "OpenRouter", hint: "one key for many models", provider: "openrouter" },
  { k: "ANTHROPIC_API_KEY", label: "Anthropic", hint: "direct Claude access", provider: "anthropic" },
  { k: "OPENAI_API_KEY", label: "OpenAI", hint: "direct GPT access", provider: "openai" },
  { k: "GOOGLE_API_KEY", label: "Google", hint: "direct Gemini access", provider: "google" },
  { k: "DEEPSEEK_API_KEY", label: "DeepSeek", hint: "direct DeepSeek access", provider: "deepseek" },
];

const SECTIONS = [
  { id: "general", label: "General", icon: Settings, group: "Settings" },
  { id: "models", label: "Models & Keys", icon: KeyRound, group: "Settings" },
  { id: "privacy", label: "Privacy", icon: ShieldCheck, group: "Settings" },
  { id: "budget", label: "Usage & Budget", icon: BarChart3, group: "Settings" },
  { id: "routing", label: "Routing", icon: GitBranch, group: "Settings" },
  { id: "data", label: "Data", icon: Database, group: "Settings" },
  { id: "appearance", label: "Appearance", icon: Monitor, group: "Customize" },
  { id: "orb", label: "Resonance Orb", icon: Settings, group: "Customize" },
  { id: "wizard", label: "Wizard & Home", icon: Sparkles, group: "Customize" },
  { id: "whitelabel", label: "White-Label", icon: Tag, group: "Customize" },
] as const;

function Chip({ provider }: { provider: string }) {
  if (!PROVIDER_LOGO[provider]) return null;
  return <span className="provider-chip"><img src={PROVIDER_LOGO[provider]} alt="" /></span>;
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-white/8">
      <div className="min-w-0">
        <div className="text-sm text-snow">{label}</div>
        {hint && <div className="text-[11px] text-mist mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function OrbSlider({ value, min, max, step = "0.01", onChange, suffix = "" }: { value: string; min: number; max: number; step?: string; onChange: (value: string) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-2 w-64">
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(e.target.value)} className="flex-1 accent-[rgb(0,179,255)]" />
      <span className="text-xs font-mono text-mist w-14">{value}{suffix}</span>
    </div>
  );
}

function safeHexColor(value: string | undefined, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? "") ? value! : fallback;
}

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  keys: Keys;
  setKeys: (fn: (s: Keys) => Keys) => void;
  costs: { runs: any[]; total: number };
  initialsFrom: string;
}

export function SettingsModal({ open, onClose, keys, setKeys, costs, initialsFrom }: SettingsModalProps) {
  const [active, setActive] = useState<string>("general");
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<{ chats: number; messages: number; memories: number } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open && active === "data" && !stats) {
      fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
    }
  }, [open, active, stats]);

  const set = (k: string, v: string) => setKeys(s => ({ ...s, [k]: v }));
  const initials = useMemo(() => (initialsFrom || "NN").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "NN", [initialsFrom]);

  const filtered = query.trim()
    ? SECTIONS.filter(s => s.label.toLowerCase().includes(query.toLowerCase()))
    : SECTIONS;
  const groups = Array.from(new Set(filtered.map(s => s.group)));

  const exportAll = async () => {
    const r = await fetch("/api/export/all"); const data = await r.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "neuralnexus-export.json"; a.click();
  };
  const wipeMemory = async () => {
    if (!confirmWipe) { setConfirmWipe(true); setTimeout(() => setConfirmWipe(false), 3000); return; }
    await fetch("/api/memories/wipe", { method: "POST" }).catch(() => {});
    setConfirmWipe(false); setStats(s => s ? { ...s, memories: 0 } : s);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm grid place-items-center p-3 md:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          onClick={onClose}>
          <motion.div
            className="glass-dark modal w-full max-w-4xl h-[82vh] flex overflow-hidden"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            onClick={e => e.stopPropagation()}>

            {/* Left settings nav */}
            <div className="w-[190px] shrink-0 border-r border-white/8 p-2.5 flex flex-col gap-2 overflow-y-auto">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mist" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search"
                  className="w-full glass-input pl-8 pr-2 py-2 text-xs outline-none" />
              </div>
              {groups.map(group => (
                <div key={group}>
                  <div className="text-[10px] uppercase tracking-widest text-mist px-2 pt-2 pb-1">{group}</div>
                  {filtered.filter(s => s.group === group).map(s => {
                    const Icon = s.icon;
                    return (
                      <button key={s.id} onClick={() => setActive(s.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] transition ${active === s.id ? "side-active text-snow" : "text-mist hover:bg-white/6 hover:text-snow"}`}>
                        <Icon size={15} /> {s.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Right content */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center justify-between px-5 h-12 border-b border-white/8 shrink-0">
                <div className="text-sm font-medium text-snow">{SECTIONS.find(s => s.id === active)?.label}</div>
                <button onClick={onClose} className="icon-btn w-7 h-7 grid place-items-center rounded-lg hover:bg-white/8 text-mist"><X size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-3">
                {active === "general" && (
                  <>
                    <div className="text-[11px] uppercase tracking-widest text-mist py-2">Profile</div>
                    <Row label="Avatar">
                      <div className="w-9 h-9 rounded-full accent-surface grid place-items-center text-xs font-medium text-snow">{initials}</div>
                    </Row>
                    <Row label="Full name">
                        <AckField value={keys.FULL_NAME ?? ""}>{({ className }) => (
                          <input value={keys.FULL_NAME ?? ""} onChange={e => set("FULL_NAME", e.target.value)}
                            placeholder="Your name" className={`${className} glass-input px-3 py-1.5 text-sm w-52 outline-none`} />
                        )}</AckField>
                    </Row>
                    <Row label="Preferred name">
                      <AckField value={keys.PREFERRED_NAME ?? ""}>{({ className }) => (
                        <input value={keys.PREFERRED_NAME ?? ""} onChange={e => set("PREFERRED_NAME", e.target.value)}
                          placeholder="Name" className={`${className} glass-input px-3 py-1.5 text-sm w-52 outline-none`} />
                      )}</AckField>
                    </Row>
                    <Row label="Work type">
                      <AckField value={keys.WORK_TYPE ?? ""}>{({ className }) => (
                        <select value={keys.WORK_TYPE ?? ""} onChange={e => set("WORK_TYPE", e.target.value)}
                        className={`${className} glass-input px-3 py-1.5 text-sm w-52 outline-none`}>
                        <option value="">Select</option>
                        <option value="dev">Development</option>
                        <option value="design">Design</option>
                        <option value="marketing">Marketing</option>
                        <option value="founder">Founder</option>
                        <option value="study">Education</option>
                        <option value="other">Other</option>
                      </select>
                      )}</AckField>
                    </Row>
                    <div className="pt-4">
                      <div className="text-sm text-snow">Workspace instructions</div>
                      <div className="text-[11px] text-mist mt-0.5 mb-2">Used as guidance for workspace outputs.</div>
                      <textarea value={keys.CUSTOM_INSTRUCTIONS ?? ""} onChange={e => set("CUSTOM_INSTRUCTIONS", e.target.value)}
                        rows={6} placeholder="Keep outputs precise, structured and client-ready."
                        className="w-full glass-input px-3 py-2.5 text-sm outline-none resize-none" />
                    </div>
                  </>
                )}

                {active === "models" && (
                  <>
                    <p className="text-xs text-mist py-2">
                      {POSITIONING_UI.connectKey.bodyLine1}<br />
                      {POSITIONING_UI.connectKey.bodyLine2}
                    </p>
                    {KEY_FIELDS.map(f => (
                      <div key={f.k} className="py-2.5 border-b border-white/8">
                        <label className="text-sm text-snow flex items-center gap-2 mb-1.5"><Chip provider={f.provider} />{f.label} <span className="text-mist text-xs">· {f.hint}</span></label>
                        <AckField value={keys[f.k] ?? ""} maskOnSave>{({ className, displayValue }) => (
                          <input value={displayValue ?? keys[f.k] ?? ""} onChange={e => set(f.k, e.target.value)}
                            placeholder="sk-…" autoComplete="off" spellCheck={false}
                            className={`${className} w-full glass-input px-3 py-2 text-sm outline-none font-mono`} />
                        )}</AckField>
                      </div>
                    ))}
                  </>
                )}

                {active === "privacy" && (
                  <>
                    <Row label="Privacy Shield" hint="Masks sensitive data before model requests.">
                      <div className="flex gap-1.5">
                        {[["off", "Off"], ["pii", "PII"], ["strict", "Strict"]].map(([v, l]) => (
                          <button key={v} onClick={() => set("PRIVACY_LEVEL", v)}
                            className={`px-3 py-1.5 rounded-lg text-xs ${(keys.PRIVACY_LEVEL || "pii") === v ? "accent-surface accent-text" : "glass-input text-mist"}`}>{l}</button>
                        ))}
                      </div>
                    </Row>
                    {keys.PRIVACY_LEVEL === "strict" && (
                      <div className="pt-3">
                        <div className="text-sm text-snow mb-1.5">Company code names</div>
                        <input value={keys.COMPANY_CODENAMES ?? ""} onChange={e => set("COMPANY_CODENAMES", e.target.value)}
                          placeholder="Projekt Phoenix, Ares" className="w-full glass-input px-3 py-2 text-sm outline-none" />
                      </div>
                    )}
                  </>
                )}

                {active === "budget" && (
                  <>
                    <Row label="Daily budget (USD)" hint="Warnings and routing can use this limit.">
                      <input type="number" value={keys.DAILY_BUDGET_USD ?? ""} onChange={e => set("DAILY_BUDGET_USD", e.target.value)}
                        placeholder="—" className="glass-input px-3 py-1.5 text-sm w-28 outline-none" />
                    </Row>
                    <Row label="Monthly budget (USD)">
                      <input type="number" value={keys.MONTHLY_BUDGET_USD ?? ""} onChange={e => set("MONTHLY_BUDGET_USD", e.target.value)}
                        placeholder="—" className="glass-input px-3 py-1.5 text-sm w-28 outline-none" />
                    </Row>
                    <div className="pt-4 glass card p-3.5">
                      <div className="text-[11px] uppercase tracking-widest text-mist font-mono mb-2">Tracked usage</div>
                      <div className="text-2xl font-display text-snow">${costs.total.toFixed(4)}</div>
                      <div className="text-xs text-mist font-mono mt-1">{costs.runs.length} requests tracked</div>
                    </div>
                  </>
                )}

                {active === "routing" && (
                  <div className="pt-2">
                    <div className="text-sm text-snow">Cost ↔ Quality</div>
                    <div className="text-[11px] text-mist mt-0.5 mb-3">Controls how Auto chooses models.</div>
                    <input type="range" min={0} max={100} value={keys.ROUTING_THRESHOLD ?? "50"}
                      onChange={e => set("ROUTING_THRESHOLD", e.target.value)} className="w-full accent-[rgb(201,160,92)]" />
                    <div className="flex justify-between text-[10px] text-mist font-mono mt-1">
                      <span>Efficient</span><span>{keys.ROUTING_THRESHOLD ?? 50}%</span><span>Quality</span>
                    </div>
                  </div>
                )}

                {active === "data" && (
                  <>
                    {stats && (
                      <div className="glass card p-3.5 mb-3 text-xs font-mono text-mist">
                        {stats.chats} workspaces · {stats.messages} messages · {stats.memories} memories
                      </div>
                    )}
                    <Row label="Export workspace data" hint="Downloads available data as JSON.">
                      <button onClick={exportAll} className="glass-input px-3 py-1.5 text-xs text-snow">Export</button>
                    </Row>
                    <Row label="Clear memory" hint="Deletes saved memory entries.">
                      <button onClick={wipeMemory}
                        className={`px-3 py-1.5 text-xs rounded-lg ${confirmWipe ? "bg-[#E5544C] text-white" : "glass-input text-mist"}`}>
                        {confirmWipe ? "Confirm delete" : "Clear"}
                      </button>
                    </Row>
                  </>
                )}

                {active === "appearance" && (
                  <>
                    <Row label="Font size">
                      <div className="flex gap-1.5">
                        {[["small", "S"], ["", "M"], ["large", "L"]].map(([v, l]) => (
                          <button key={l} onClick={() => set("UI_FONTSIZE", v)}
                            className={`w-9 py-1.5 rounded-lg text-xs ${(keys.UI_FONTSIZE ?? "") === v ? "accent-surface accent-text" : "glass-input text-mist"}`}>{l}</button>
                        ))}
                      </div>
                    </Row>
                    <Row label="Enter submits input" hint="Off: Enter creates a new line. Cmd+Enter submits.">
                      <button onClick={() => set("UI_ENTERSENDS", keys.UI_ENTERSENDS === "0" ? "1" : "0")}
                        className={`w-11 h-6 rounded-full transition relative ${keys.UI_ENTERSENDS === "0" ? "bg-white/10" : "accent-solid"}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${keys.UI_ENTERSENDS === "0" ? "left-0.5" : "left-[22px]"}`} />
                      </button>
                    </Row>
                  </>
                )}

                {active === "orb" && (
                  <>
                    <div className="text-[11px] uppercase tracking-widest text-mist py-2">Resonance Orb</div>
                    <Row label="Preset" hint="Default matches the blue-magenta fractal orb reference.">
                      <select value={keys.ORB_PRESET || "Default"} onChange={e => {
                        set("ORB_PRESET", e.target.value);
                        if (e.target.value === "Default") {
                          set("ORB_PRIMARY_COLOR", "#00B3FF");
                          set("ORB_SECONDARY_COLOR", "#FF2ED2");
                          set("ORB_ATMOSPHERE_GLOW", "0.15");
                          set("ORB_ATMOSPHERE_LEVEL", "1");
                          set("ORB_ATMOSPHERE_SCALE", "1.03");
                          set("ORB_INTERNAL_SPEED", "0.5");
                          set("ORB_AUTO_ROTATION", "0.89");
                          set("ORB_GLOBAL_DENSITY", "3");
                          set("ORB_CHROMATIC_ABERRATION", "0.025");
                          set("ORB_RESOLUTION_DPR", "0.7");
                          set("ORB_INTERNAL_ANIM_SPEED", "0.43");
                          set("ORB_CORNER_SMOOTHNESS", "0.031");
                          set("ORB_ASYMMETRY", "0.55");
                          set("ORB_ITERATIONS", "4");
                          set("ORB_FRACTAL_SCALE", "0.97");
                          set("ORB_ENERGY_DECAY", "-16.7");
                        }
                      }} className="glass-input rounded px-3 py-2 text-sm text-snow">
                        <option>Default</option>
                        <option>Deep Glass</option>
                        <option>Electric Core</option>
                      </select>
                    </Row>
                    <div className="text-[11px] uppercase tracking-widest text-mist py-2">Energy Style</div>
                    <Row label="Primary Color">
                      <div className="flex items-center gap-2 w-64">
                        <input type="color" value={safeHexColor(keys.ORB_PRIMARY_COLOR, "#00B3FF")} onChange={e => set("ORB_PRIMARY_COLOR", e.target.value)} className="h-10 flex-1 rounded bg-transparent" />
                        <input value={(keys.ORB_PRIMARY_COLOR || "#00B3FF").replace("#", "")} onChange={e => set("ORB_PRIMARY_COLOR", `#${e.target.value.replace("#", "").slice(0, 6)}`)} className="glass-input rounded px-2 py-2 text-xs font-mono w-20 text-snow" />
                      </div>
                    </Row>
                    <Row label="Secondary Color">
                      <div className="flex items-center gap-2 w-64">
                        <input type="color" value={safeHexColor(keys.ORB_SECONDARY_COLOR, "#FF2ED2")} onChange={e => set("ORB_SECONDARY_COLOR", e.target.value)} className="h-10 flex-1 rounded bg-transparent" />
                        <input value={(keys.ORB_SECONDARY_COLOR || "#FF2ED2").replace("#", "")} onChange={e => set("ORB_SECONDARY_COLOR", `#${e.target.value.replace("#", "").slice(0, 6)}`)} className="glass-input rounded px-2 py-2 text-xs font-mono w-20 text-snow" />
                      </div>
                    </Row>
                    <Row label="Atmosphere Glow"><OrbSlider min={0} max={1} value={keys.ORB_ATMOSPHERE_GLOW ?? "0.15"} onChange={v => set("ORB_ATMOSPHERE_GLOW", v)} /></Row>
                    <Row label="Atmosphere Level"><OrbSlider min={0} max={2} value={keys.ORB_ATMOSPHERE_LEVEL ?? "1"} onChange={v => set("ORB_ATMOSPHERE_LEVEL", v)} /></Row>
                    <Row label="Atmosphere Scale"><OrbSlider min={0.5} max={1.8} value={keys.ORB_ATMOSPHERE_SCALE ?? "1.03"} onChange={v => set("ORB_ATMOSPHERE_SCALE", v)} /></Row>
                    <Row label="Internal Speed"><OrbSlider min={0} max={2} value={keys.ORB_INTERNAL_SPEED ?? "0.5"} onChange={v => set("ORB_INTERNAL_SPEED", v)} /></Row>
                    <Row label="Orb Auto-Rotation"><OrbSlider min={0} max={2} value={keys.ORB_AUTO_ROTATION ?? "0.89"} onChange={v => set("ORB_AUTO_ROTATION", v)} /></Row>
                    <Row label="Global Density"><OrbSlider min={0.5} max={6} value={keys.ORB_GLOBAL_DENSITY ?? "3"} onChange={v => set("ORB_GLOBAL_DENSITY", v)} /></Row>
                    <Row label="Chromatic Aberr."><OrbSlider min={0} max={0.12} step="0.001" value={keys.ORB_CHROMATIC_ABERRATION ?? "0.025"} onChange={v => set("ORB_CHROMATIC_ABERRATION", v)} /></Row>
                    <Row label="Resolution (DPR)"><OrbSlider min={0.5} max={1.5} value={keys.ORB_RESOLUTION_DPR ?? "0.7"} onChange={v => set("ORB_RESOLUTION_DPR", v)} /></Row>
                    <div className="text-[11px] uppercase tracking-widest text-mist py-2">Fractal Structure</div>
                    <Row label="Internal Anim Speed"><OrbSlider min={0} max={2} value={keys.ORB_INTERNAL_ANIM_SPEED ?? "0.43"} onChange={v => set("ORB_INTERNAL_ANIM_SPEED", v)} /></Row>
                    <Row label="Corner Smoothness"><OrbSlider min={0} max={0.2} step="0.001" value={keys.ORB_CORNER_SMOOTHNESS ?? "0.031"} onChange={v => set("ORB_CORNER_SMOOTHNESS", v)} /></Row>
                    <Row label="Asymmetry"><OrbSlider min={0} max={1.5} value={keys.ORB_ASYMMETRY ?? "0.55"} onChange={v => set("ORB_ASYMMETRY", v)} /></Row>
                    <Row label="Iterations"><OrbSlider min={1} max={7} step="1" value={keys.ORB_ITERATIONS ?? "4"} onChange={v => set("ORB_ITERATIONS", v)} /></Row>
                    <Row label="Scale"><OrbSlider min={0.2} max={2.5} value={keys.ORB_FRACTAL_SCALE ?? "0.97"} onChange={v => set("ORB_FRACTAL_SCALE", v)} /></Row>
                    <Row label="Energy Decay"><OrbSlider min={-30} max={-1} value={keys.ORB_ENERGY_DECAY ?? "-16.7"} onChange={v => set("ORB_ENERGY_DECAY", v)} /></Row>
                    <Row label="Legacy hue" hint="Kept for older orb presets.">
                      <div className="flex items-center gap-2 w-64">
                        <input type="range" min={0} max={330} value={keys.ORB_HUE ?? "238"}
                          onChange={e => set("ORB_HUE", e.target.value)} className="flex-1 accent-[rgb(0,179,255)]" />
                        <span className="text-xs font-mono text-mist w-12">{keys.ORB_HUE ?? 238}°</span>
                      </div>
                    </Row>
                    <Row label="Wizard intensity" hint="Controls the Home wizard orb glow.">
                      <div className="flex items-center gap-2 w-64">
                        <input type="range" min={1} max={100} value={keys.ORB_INTENSITY ?? keys.ORB_GLOW ?? "68"}
                          onChange={e => set("ORB_INTENSITY", e.target.value)} className="flex-1 accent-[rgb(0,179,255)]" />
                        <span className="text-xs font-mono text-mist w-8">{keys.ORB_INTENSITY ?? keys.ORB_GLOW ?? 68}%</span>
                      </div>
                    </Row>
                    <Row label="Breathing animation" hint="Turns the orb breathing motion on or off.">
                      <button onClick={() => set("ORB_BREATHING", keys.ORB_BREATHING === "0" ? "1" : "0")}
                        className={`w-11 h-6 rounded-full transition relative ${keys.ORB_BREATHING === "0" ? "bg-white/10" : "accent-solid"}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${keys.ORB_BREATHING === "0" ? "left-0.5" : "left-[22px]"}`} />
                      </button>
                    </Row>
                  </>
                )}

                {active === "wizard" && (
                  <>
                    <div className="text-[11px] uppercase tracking-widest text-mist py-2">Wizard & Home</div>
                    <Row label="Floating wizard" hint="Shows the mini orb assistant outside Home.">
                      <button onClick={() => set("WIZARD_FLOATING_ENABLED", keys.WIZARD_FLOATING_ENABLED === "0" ? "1" : "0")}
                        className={`w-11 h-6 rounded-full transition relative ${keys.WIZARD_FLOATING_ENABLED === "0" ? "bg-white/10" : "accent-solid"}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${keys.WIZARD_FLOATING_ENABLED === "0" ? "left-0.5" : "left-[22px]"}`} />
                      </button>
                    </Row>
                    <Row label="Home orb" hint="Shows the large living wizard orb on Home.">
                      <button onClick={() => set("WIZARD_HOME_ORB_ENABLED", keys.WIZARD_HOME_ORB_ENABLED === "0" ? "1" : "0")}
                        className={`w-11 h-6 rounded-full transition relative ${keys.WIZARD_HOME_ORB_ENABLED === "0" ? "bg-white/10" : "accent-solid"}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${keys.WIZARD_HOME_ORB_ENABLED === "0" ? "left-0.5" : "left-[22px]"}`} />
                      </button>
                    </Row>
                  </>
                )}

                {active === "whitelabel" && (
                  <Row label="App name" hint="Overrides the sidebar name for this workspace.">
                    <input value={keys.BRAND_NAME ?? ""} onChange={e => set("BRAND_NAME", e.target.value)}
                      placeholder="NeuralNexus" className="glass-input px-3 py-1.5 text-sm w-44 outline-none" />
                  </Row>
                )}
              </div>

              <div className="h-8 px-5 border-t border-white/8 shrink-0 settings-footer-saved" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

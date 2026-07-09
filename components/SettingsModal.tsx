"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, KeyRound, ShieldCheck, BarChart3, GitBranch, Monitor, Tag, Database, Search, X, Check } from "lucide-react";

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
  const [saved, setSaved] = useState(false);
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

  // reflect a lightweight "saved" pulse whenever keys change while open
  useEffect(() => {
    if (!open) return;
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1400);
    return () => clearTimeout(t);
  }, [keys, open]);

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
                      <input value={keys.FULL_NAME ?? ""} onChange={e => set("FULL_NAME", e.target.value)}
                        placeholder="Your name" className="glass-input px-3 py-1.5 text-sm w-52 outline-none" />
                    </Row>
                    <Row label="Preferred name">
                      <input value={keys.PREFERRED_NAME ?? ""} onChange={e => set("PREFERRED_NAME", e.target.value)}
                        placeholder="Name" className="glass-input px-3 py-1.5 text-sm w-52 outline-none" />
                    </Row>
                    <Row label="Work type">
                      <select value={keys.WORK_TYPE ?? ""} onChange={e => set("WORK_TYPE", e.target.value)}
                        className="glass-input px-3 py-1.5 text-sm w-52 outline-none">
                        <option value="">Select</option>
                        <option value="dev">Development</option>
                        <option value="design">Design</option>
                        <option value="marketing">Marketing</option>
                        <option value="founder">Founder</option>
                        <option value="study">Education</option>
                        <option value="other">Other</option>
                      </select>
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
                    <p className="text-xs text-mist py-2">Keys are only needed when a workspace generates live AI outputs.</p>
                    {KEY_FIELDS.map(f => (
                      <div key={f.k} className="py-2.5 border-b border-white/8">
                        <label className="text-sm text-snow flex items-center gap-2 mb-1.5"><Chip provider={f.provider} />{f.label} <span className="text-mist text-xs">· {f.hint}</span></label>
                        <input value={keys[f.k] ?? ""} onChange={e => set(f.k, e.target.value)}
                          placeholder="sk-…" autoComplete="off" spellCheck={false}
                          className="w-full glass-input px-3 py-2 text-sm outline-none font-mono" />
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
                        {stats.chats} projects · {stats.messages} messages · {stats.memories} memories
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
                    <Row label="Color hue" hint="0 = amber, 60 = green, 180 = cyan, 240 = blue, 300 = violet">
                      <div className="flex items-center gap-2 w-52">
                        <input type="range" min={0} max={330} value={keys.ORB_HUE ?? "0"}
                          onChange={e => set("ORB_HUE", e.target.value)} className="flex-1 accent-[rgb(201,160,92)]" />
                        <span className="text-xs font-mono text-mist w-8">{keys.ORB_HUE ?? 0}°</span>
                      </div>
                    </Row>
                    <Row label="Animation speed" hint="Lower values feel calmer.">
                      <div className="flex items-center gap-2 w-52">
                        <input type="range" min={1} max={100} value={keys.ORB_SPEED ?? "20"}
                          onChange={e => set("ORB_SPEED", e.target.value)} className="flex-1 accent-[rgb(201,160,92)]" />
                        <span className="text-xs font-mono text-mist w-8">{keys.ORB_SPEED ?? 20}%</span>
                      </div>
                    </Row>
                    <Row label="Surface morphing" hint="Controls how much the orb changes shape.">
                      <div className="flex items-center gap-2 w-52">
                        <input type="range" min={1} max={100} value={keys.ORB_MORPH ?? "50"}
                          onChange={e => set("ORB_MORPH", e.target.value)} className="flex-1 accent-[rgb(201,160,92)]" />
                        <span className="text-xs font-mono text-mist w-8">{keys.ORB_MORPH ?? 50}%</span>
                      </div>
                    </Row>
                    <Row label="Core glow" hint="Controls the inner glow intensity.">
                      <div className="flex items-center gap-2 w-52">
                        <input type="range" min={1} max={100} value={keys.ORB_GLOW ?? "60"}
                          onChange={e => set("ORB_GLOW", e.target.value)} className="flex-1 accent-[rgb(201,160,92)]" />
                        <span className="text-xs font-mono text-mist w-8">{keys.ORB_GLOW ?? 60}%</span>
                      </div>
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

              {/* Saved indicator */}
              <div className="h-8 px-5 flex items-center justify-end border-t border-white/8 shrink-0">
                <AnimatePresence>
                  {saved && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-[11px] text-mist flex items-center gap-1"><Check size={12} className="accent-text" /> Saved</motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

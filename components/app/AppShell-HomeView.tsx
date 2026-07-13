"use client";

/**
 * NeuralNexus — AppShell + HomeView (logged-in app)
 * Tool-mode redesign matching the marketing landing's Aurora system, both themes.
 * AppShell = sidebar + topbar + content slot (reused by all app views).
 * HomeView = the calm, dense entry: orb, compact heading, Ask/Build/Teach mode
 * switch, composer, quick suggestions. Scoped under .nna- to avoid collisions.
 *
 * Theme toggle flips document.documentElement[data-theme]. Reduced-motion safe.
 *
 * Wire real handlers via props; this component is presentational + local UI state.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------- icons ---------- */
const IconHome = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" strokeLinecap="round" /></svg>;
const IconChat = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinejoin="round" /></svg>;
const IconProfile = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" /><circle cx="12" cy="7" r="4" /></svg>;
const IconSettings = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
const IconSun = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" /></svg>;
const IconAsk = IconChat;
const IconBuild = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" strokeLinejoin="round" /></svg>;
const IconTeach = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>;
const IconChevron = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>;

type View = "home" | "chat" | "profile" | "settings";

/* ============ APP SHELL ============ */
export function AppShell({
  active, onNavigate, onLogout, onCommand, userInitial = "A", children,
}: {
  active: View;
  onNavigate?: (v: View) => void;
  onLogout?: () => void;
  onCommand?: () => void;
  userInitial?: string;
  children: ReactNode;
}) {
  const toggleTheme = () => {
    const r = document.documentElement;
    r.dataset.theme = r.dataset.theme === "dark" ? "light" : "dark";
  };
  const nav: { id: View; label: string; icon: ReactNode }[] = [
    { id: "home", label: "Home", icon: IconHome },
    { id: "chat", label: "Chat", icon: IconChat },
    { id: "profile", label: "Your Profile", icon: IconProfile },
  ];
  return (
    <div className="nna-app">
      <style>{CSS}</style>
      <aside className="nna-side">
        <div className="nna-brand">
          <div className="nna-disc" />
          <div className="nna-brand-txt"><b>NeuralNexus</b><span>AI personality profile</span></div>
        </div>
        <nav className="nna-nav">
          {nav.map((n) => (
            <button key={n.id} className={`nna-item${active === n.id ? " is-active" : ""}`} onClick={() => onNavigate?.(n.id)}>
              {n.icon}{n.label}
            </button>
          ))}
        </nav>
        <div className="nna-foot">
          <div className="nna-sep" />
          <button className={`nna-item${active === "settings" ? " is-active" : ""}`} onClick={() => onNavigate?.("settings")}>
            {IconSettings}Settings
          </button>
        </div>
      </aside>

      <div className="nna-main">
        <div className="nna-topbar">
          <span className="nna-status"><span className="nna-status-dot" />Ready</span>
          <button className="nna-tb-icon" onClick={toggleTheme} aria-label="Toggle theme">{IconSun}</button>
          <button className="nna-tb-btn" onClick={onCommand}>Command <span className="nna-mono nna-kbd">⌘K</span></button>
          <button className="nna-tb-btn" onClick={onLogout}>Log out</button>
          <span className="nna-avatar">{userInitial}</span>
        </div>
        <div className="nna-content">{children}</div>
      </div>
    </div>
  );
}

/* ============ HOME VIEW ============ */
export function HomeView({
  hasHistory = false,
  onSend,
  quickSuggestions = ["Draft a landing page headline", "Plan my week", "Review this copy"],
}: {
  hasHistory?: boolean;
  onSend?: (text: string, mode: "ask" | "build" | "teach") => void;
  quickSuggestions?: string[];
}) {
  const [mode, setMode] = useState<"ask" | "build" | "teach">("ask");
  const [text, setText] = useState("");
  const segRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const movePill = (m: string) => {
    const seg = segRef.current, pill = pillRef.current, btn = btnRefs.current[m];
    if (!seg || !pill || !btn) return;
    const r = btn.getBoundingClientRect(), sr = seg.getBoundingClientRect();
    pill.style.width = `${r.width}px`;
    pill.style.transform = `translateX(${r.left - sr.left - 4}px)`;
  };
  useEffect(() => { movePill(mode); }, [mode]);
  useEffect(() => {
    const onResize = () => movePill(mode);
    window.addEventListener("resize", onResize);
    const t = setTimeout(() => movePill(mode), 60);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(t); };
  }, []); // eslint-disable-line

  const send = () => { if (text.trim()) onSend?.(text.trim(), mode); };
  const modes: { id: "ask" | "build" | "teach"; label: string; icon: ReactNode }[] = [
    { id: "ask", label: "Ask", icon: IconAsk },
    { id: "build", label: "Build", icon: IconBuild },
    { id: "teach", label: "Teach", icon: IconTeach },
  ];

  return (
    <div className="nna-home">
      <div className="nna-home-orb" />
      <div className="nna-home-eyebrow nna-mono">Start here</div>
      <h1 className="nna-home-h1">
        {hasHistory ? "What should Nexus help with now?" : "What should NeuralNexus understand about you?"}
      </h1>
      <p className="nna-home-sub">Ask, build or teach. One clear move is enough to start.</p>

      <div className="nna-seg" ref={segRef}>
        <span className="nna-seg-pill" ref={pillRef} />
        {modes.map((m) => (
          <button key={m.id} ref={(el) => { btnRefs.current[m.id] = el; }}
            className={mode === m.id ? "is-active" : ""} onClick={() => setMode(m.id)}>
            {m.icon}{m.label}
          </button>
        ))}
      </div>

      <div className="nna-composer">
        <textarea
          placeholder="Ask anything, or attach files…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(); }}
        />
        <div className="nna-composer-bar">
          <span className="nna-composer-hint nna-mono">⌘↵ to send</span>
          <button className="nna-send-btn" onClick={send}>Send {IconChevron}</button>
        </div>
      </div>

      {quickSuggestions.length > 0 && (
        <div className="nna-quick">
          {quickSuggestions.map((q) => (
            <button key={q} className="nna-quick-chip" onClick={() => onSend?.(q, mode)}>{q}</button>
          ))}
        </div>
      )}
    </div>
  );
}

const CSS = `
.nna-app{--e:cubic-bezier(0.22,1,0.36,1);font-family:var(--font-ui),system-ui,sans-serif;color:var(--ink);display:grid;grid-template-columns:260px 1fr;height:100vh;overflow:hidden}
.nna-app *{box-sizing:border-box}
.nna-mono{font-family:var(--font-mono),monospace}
@media(max-width:768px){.nna-app{grid-template-columns:1fr}.nna-side{display:none}}
.nna-side{background:var(--sidebar);border-right:1px solid var(--hairline);display:flex;flex-direction:column;padding:20px 14px}
.nna-brand{display:flex;align-items:center;gap:11px;padding:8px 10px;margin-bottom:28px}
.nna-disc{width:30px;height:30px;border-radius:50%;background:var(--aurora);box-shadow:inset 0 1px 2px rgba(255,255,255,.35),var(--shadow-sm);flex-shrink:0}
.nna-brand-txt b{display:block;font-size:15px;font-weight:600;letter-spacing:-.01em}
.nna-brand-txt span{display:block;font-size:12px;color:var(--muted)}
.nna-nav{display:flex;flex-direction:column;gap:2px}
.nna-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;font-size:15px;font-weight:500;color:var(--secondary);cursor:pointer;border:none;background:none;font-family:inherit;text-align:left;width:100%;transition:background .16s var(--e),color .16s var(--e)}
.nna-item:hover{background:var(--surface-2);color:var(--ink)}
.nna-item.is-active{background:var(--surface);color:var(--ink);box-shadow:var(--shadow-sm)}
.nna-item svg{width:18px;height:18px;flex-shrink:0}
.nna-foot{margin-top:auto;display:flex;flex-direction:column;gap:2px}
.nna-sep{height:1px;background:var(--hairline);margin:12px 4px}
.nna-main{overflow:hidden;display:flex;flex-direction:column}
.nna-topbar{height:60px;display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:0 24px;border-bottom:1px solid var(--hairline);flex-shrink:0}
.nna-status{margin-right:auto;display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--secondary);padding:6px 12px;background:var(--surface-2);border-radius:999px}
.nna-status-dot{width:7px;height:7px;border-radius:50%;background:#3ECf8e}
.nna-tb-btn{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:999px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;transition:.15s var(--e)}
.nna-tb-btn:hover{background:var(--surface-2)}
.nna-kbd{color:var(--muted)}
.nna-tb-icon{width:34px;height:34px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--hairline);background:var(--surface);cursor:pointer;color:var(--secondary);transition:.15s var(--e)}
.nna-tb-icon:hover{background:var(--surface-2);color:var(--ink)}
.nna-tb-icon svg{width:16px;height:16px}
.nna-avatar{width:34px;height:34px;border-radius:50%;background:var(--aurora);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:600}
.nna-content{flex:1;overflow-y:auto}
.nna-home{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;max-width:760px;margin:0 auto;width:100%}
.nna-home-orb{width:96px;height:96px;border-radius:50%;background:var(--aurora);box-shadow:0 8px 40px color-mix(in srgb,var(--aurora-a) 40%,transparent);margin-bottom:28px;position:relative}
.nna-home-orb::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 2px 8px rgba(255,255,255,.4)}
.nna-home-eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:14px}
.nna-home-h1{font-size:30px;font-weight:600;letter-spacing:-.025em;text-align:center;line-height:1.1;margin:0 0 10px;max-width:20ch}
.nna-home-sub{font-size:15px;color:var(--secondary);text-align:center;margin:0 0 28px}
.nna-seg{position:relative;display:inline-flex;background:var(--surface-2);border:1px solid var(--hairline);border-radius:999px;padding:4px;margin-bottom:20px}
.nna-seg button{position:relative;z-index:1;display:inline-flex;align-items:center;gap:7px;border:none;background:none;font-family:inherit;font-size:14px;font-weight:500;color:var(--secondary);padding:8px 18px;border-radius:999px;cursor:pointer;transition:color .3s var(--e)}
.nna-seg button.is-active{color:var(--action-text)}
.nna-seg button svg{width:15px;height:15px}
.nna-seg-pill{position:absolute;top:4px;left:4px;height:calc(100% - 8px);background:var(--action);border-radius:999px;transition:transform .35s var(--e),width .35s var(--e);z-index:0}
.nna-composer{width:100%;background:var(--surface);border:1px solid var(--hairline);border-radius:20px;box-shadow:var(--shadow-md);padding:18px 18px 14px;position:relative}
.nna-composer::before{content:"";position:absolute;inset:0;border-radius:20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);pointer-events:none}
:root[data-theme="dark"] .nna-composer::before{box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.nna-composer textarea{width:100%;border:none;background:none;resize:none;font-family:inherit;font-size:15px;color:var(--ink);min-height:56px;outline:none;line-height:1.5}
.nna-composer textarea::placeholder{color:var(--muted)}
.nna-composer-bar{display:flex;align-items:center;justify-content:space-between;margin-top:8px}
.nna-composer-hint{font-size:12px;color:var(--muted)}
.nna-send-btn{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 18px;border-radius:999px;background:var(--action);color:var(--action-text);border:none;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.15),var(--shadow-sm);transition:transform .16s var(--e),box-shadow .16s var(--e)}
.nna-send-btn:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
.nna-send-btn:active{transform:scale(.97)}
.nna-send-btn svg{width:14px;height:14px}
.nna-quick{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;justify-content:center}
.nna-quick-chip{padding:8px 14px;background:var(--surface-2);border:1px solid var(--hairline);border-radius:999px;font-size:13px;color:var(--secondary);cursor:pointer;font-family:inherit;transition:.15s var(--e)}
.nna-quick-chip:hover{background:var(--surface);color:var(--ink);border-color:var(--hairline-strong)}
@media(prefers-reduced-motion:reduce){
  .nna-item,.nna-tb-btn,.nna-tb-icon,.nna-seg button,.nna-seg-pill,.nna-send-btn,.nna-quick-chip{transition:none}
}
`;

export default HomeView;

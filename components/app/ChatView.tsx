"use client";

/**
 * NeuralNexus — ChatView (logged-in app)
 * Calm, dense conversation in tool-mode, both themes, matching the marketing landing.
 * Aurora message bubbles (user = --action, ai = --surface), feedback actions under
 * each AI reply (Copy / Regenerate / Shorter / Longer / More casual) that quietly
 * feed the profile, and a quiet "Saved to your profile" notice. Fixed composer.
 * Scoped under .nnc-. Reduced-motion safe. Renders inside AppShell.
 *
 * Presentational + local input state; wire real handlers via props.
 */

import { useState, type ReactNode } from "react";

const IconCopy = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>;
const IconRegen = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15" /></svg>;
const IconCheck = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>;
const IconChevron = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>;

export type ChatMessage = {
  id: string;
  role: "user" | "ai";
  content: ReactNode;
  savedInsight?: string; // if present, shows the quiet "Saved to your profile" notice
};

type FeedbackSignal = "good" | "bad" | "shorter" | "longer" | "formal" | "casual";

export function ChatView({
  title = "Quick chat",
  model = "Claude Sonnet",
  messages,
  onSend,
  onFeedback,
  onCopy,
  onRegenerate,
}: {
  title?: string;
  model?: string;
  messages: ChatMessage[];
  onSend?: (text: string) => void;
  onFeedback?: (messageId: string, signal: FeedbackSignal) => void;
  onCopy?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
}) {
  const [text, setText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const send = () => { if (text.trim()) { onSend?.(text.trim()); setText(""); } };
  const copy = (id: string) => { onCopy?.(id); setCopiedId(id); setTimeout(() => setCopiedId(null), 1200); };

  return (
    <div className="nnc-root">
      <style>{CSS}</style>
      <div className="nnc-head">
        <span className="nnc-title">{title}</span>
        <span className="nnc-model">{model}</span>
      </div>

      <div className="nnc-stream">
        <div className="nnc-stream-inner">
          {messages.map((m) => (
            <div key={m.id} className={`nnc-msg nnc-${m.role}`}>
              <div className="nnc-bubble">{m.content}</div>
              {m.role === "ai" && (
                <>
                  <div className="nnc-actions">
                    <button className="nnc-act" title="Copy" onClick={() => copy(m.id)}>
                      {copiedId === m.id ? <span className="nnc-aurora">{IconCheck}</span> : IconCopy}
                    </button>
                    <button className="nnc-act" title="Regenerate" onClick={() => onRegenerate?.(m.id)}>{IconRegen}</button>
                    <span className="nnc-act-group">
                      <button className="nnc-act-txt" onClick={() => onFeedback?.(m.id, "shorter")}>Shorter</button>
                      <button className="nnc-act-txt" onClick={() => onFeedback?.(m.id, "longer")}>Longer</button>
                      <button className="nnc-act-txt" onClick={() => onFeedback?.(m.id, "casual")}>More casual</button>
                    </span>
                  </div>
                  {m.savedInsight && (
                    <div className="nnc-saved"><span className="nnc-saved-dot" />Saved to your profile: {m.savedInsight}</div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="nnc-composer-wrap">
        <div className="nnc-composer">
          <textarea
            placeholder="Ask anything…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(); }}
          />
          <div className="nnc-composer-bar">
            <span className="nnc-hint nnc-mono">⌘↵ to send</span>
            <button className="nnc-send" onClick={send}>Send {IconChevron}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.nnc-root{--e:cubic-bezier(0.22,1,0.36,1);font-family:var(--font-ui),system-ui,sans-serif;color:var(--ink);display:flex;flex-direction:column;height:100%;overflow:hidden}
.nnc-root *{box-sizing:border-box}
.nnc-mono{font-family:var(--font-mono),monospace}
.nnc-head{height:52px;display:flex;align-items:center;padding:0 24px;border-bottom:1px solid var(--hairline);flex-shrink:0}
.nnc-title{font-size:15px;font-weight:600}
.nnc-model{margin-left:10px;font-size:12px;color:var(--muted);padding:4px 10px;background:var(--surface-2);border-radius:999px}
.nnc-stream{flex:1;overflow-y:auto;padding:32px 24px}
.nnc-stream-inner{max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
.nnc-msg{display:flex;flex-direction:column;max-width:100%}
.nnc-user{align-items:flex-end}
.nnc-bubble{padding:14px 18px;border-radius:18px;font-size:15px;line-height:1.55}
.nnc-user .nnc-bubble{background:var(--action);color:var(--action-text);border-bottom-right-radius:6px;max-width:80%}
.nnc-ai .nnc-bubble{background:var(--surface);border:1px solid var(--hairline);border-bottom-left-radius:6px;box-shadow:var(--shadow-sm);max-width:88%}
.nnc-actions{display:flex;align-items:center;gap:4px;margin-top:8px;padding-left:2px}
.nnc-act{width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;border:none;background:none;color:var(--muted);cursor:pointer;transition:.15s var(--e)}
.nnc-act:hover{background:var(--surface-2);color:var(--ink)}
.nnc-act svg{width:15px;height:15px}
.nnc-aurora{color:var(--aurora-a);display:inline-flex}
.nnc-act-group{display:flex;gap:4px;margin-left:8px;padding-left:8px;border-left:1px solid var(--hairline)}
.nnc-act-txt{height:32px;padding:0 12px;border-radius:8px;border:none;background:none;color:var(--muted);cursor:pointer;font-family:inherit;font-size:13px;transition:.15s var(--e)}
.nnc-act-txt:hover{background:var(--surface-2);color:var(--ink)}
.nnc-saved{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;margin-top:8px;padding:7px 13px;background:var(--surface-2);border-radius:999px;font-size:13px;color:var(--secondary)}
.nnc-saved-dot{width:6px;height:6px;border-radius:50%;background:var(--aurora-a);box-shadow:0 0 0 3px color-mix(in srgb,var(--aurora-a) 20%,transparent)}
.nnc-composer-wrap{padding:16px 24px 24px;flex-shrink:0}
.nnc-composer{max-width:720px;margin:0 auto;background:var(--surface);border:1px solid var(--hairline);border-radius:18px;box-shadow:var(--shadow-md);padding:14px 16px 10px;position:relative}
.nnc-composer::before{content:"";position:absolute;inset:0;border-radius:18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);pointer-events:none}
:root[data-theme="dark"] .nnc-composer::before{box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.nnc-composer textarea{width:100%;border:none;background:none;resize:none;font-family:inherit;font-size:15px;color:var(--ink);min-height:24px;outline:none;line-height:1.5}
.nnc-composer textarea::placeholder{color:var(--muted)}
.nnc-composer-bar{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.nnc-hint{font-size:12px;color:var(--muted)}
.nnc-send{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 16px;border-radius:999px;background:var(--action);color:var(--action-text);border:none;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.15),var(--shadow-sm);transition:transform .16s var(--e),box-shadow .16s var(--e)}
.nnc-send:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
.nnc-send:active{transform:scale(.97)}
.nnc-send svg{width:14px;height:14px}
@media(prefers-reduced-motion:reduce){
  .nnc-act,.nnc-act-txt,.nnc-send{transition:none}
}
`;

export default ChatView;

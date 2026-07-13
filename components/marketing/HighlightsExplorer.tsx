"use client";

/**
 * NeuralNexus — HighlightsExplorer (marketing)
 * Apple-Watch-style: a left column of expandable feature pills with a rotating +,
 * synced to a crossfading visual on the right. Click a pill → it expands (smooth
 * height via grid-rows), the + rotates to an aurora ×, and the matching mock
 * visual fades in. Scoped under .nnh2-. Reduced-motion safe, responsive.
 *
 * Drop into the landing between the story and closing sections.
 */

import { useState } from "react";

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
);

type Item = { title: string; bodyBold: string; body: string };
const ITEMS: Item[] = [
  { title: "Learns as you use it", bodyBold: "No setup, ever.", body: "NeuralNexus reads how you write and decide while you work normally — no forms, no quizzes. The profile builds itself." },
  { title: "A mirror you own", bodyBold: "See yourself, honestly.", body: "Every insight is drawn only from your own words. Keep what fits, remove what doesn't — it never leaves without you." },
  { title: "Works with every AI", bodyBold: "One profile, everywhere.", body: "Export a block any assistant understands — ChatGPT, Claude, image models — and they instantly adapt to you." },
  { title: "Private by design", bodyBold: "You're always in control.", body: "Pause learning anytime, see exactly what's stored, and clear it in one click. Transparency isn't a setting — it's the default." },
];

export function HighlightsExplorer() {
  const [open, setOpen] = useState(0);

  return (
    <section className="nnh2-section">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="nnh2-head">
        <div className="nnh2-eyebrow nnh2-mono">The highlights</div>
        <h2 className="nnh2-title">Everything that makes your profile yours.</h2>
      </div>

      <div className="nnh2-explorer">
        <div className="nnh2-pills">
          {ITEMS.map((it, i) => (
            <div key={it.title} className={`nnh2-pill${open === i ? " is-open" : ""}`}>
              <button type="button" className="nnh2-pill-btn" onClick={() => setOpen(i)} aria-expanded={open === i}>
                <span className="nnh2-plus" />
                {it.title}
              </button>
              <div className="nnh2-pill-body">
                <div className="nnh2-pill-body-inner">
                  <div className="nnh2-pill-text"><b>{it.bodyBold}</b> {it.body}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="nnh2-visual">
          <div className="nnh2-glow" />
          <div className="nnh2-frame">
            {/* 0 learning */}
            <div className={`nnh2-card${open === 0 ? " is-active" : ""}`}>
              <div className="nnh2-mock">
                <div className="nnh2-bubble nnh2-u">Make this shorter, drop the buzzwords.</div>
                <div className="nnh2-bubble nnh2-a">Done — tightened and plain.</div>
                <div className="nnh2-row"><span className="nnh2-mdot" />Noticed: you prefer plain language</div>
              </div>
            </div>
            {/* 1 mirror */}
            <div className={`nnh2-card${open === 1 ? " is-active" : ""}`}>
              <div className="nnh2-mock">
                <div className="nnh2-mock-h"><span className="nnh2-mdot" /><span className="nnh2-mock-t nnh2-mono">YOUR PROFILE</span></div>
                <div className="nnh2-row"><span className="nnh2-ic">{CHECK}</span>You prefer plain language over jargon.</div>
                <div className="nnh2-row"><span className="nnh2-ic">{CHECK}</span>You want the answer first.</div>
              </div>
            </div>
            {/* 2 export */}
            <div className={`nnh2-card${open === 2 ? " is-active" : ""}`}>
              <div className="nnh2-mock">
                <div className="nnh2-code"><span className="nnh2-k">Address</span> directly, plain language.<br /><span className="nnh2-k">Lead</span> with the answer.</div>
                <div className="nnh2-arrow">↓</div>
                <div className="nnh2-chips">
                  <span className="nnh2-chip"><span className="nnh2-cd" />ChatGPT</span>
                  <span className="nnh2-chip"><span className="nnh2-cd" />Claude</span>
                </div>
              </div>
            </div>
            {/* 3 privacy */}
            <div className={`nnh2-card${open === 3 ? " is-active" : ""}`}>
              <div className="nnh2-mock">
                <div className="nnh2-mock-h"><span className="nnh2-mdot" /><span className="nnh2-mock-t nnh2-mono">CONTROL</span></div>
                <div className="nnh2-row nnh2-between"><span>Learning</span><span className="nnh2-accent">Active</span></div>
                <div className="nnh2-row nnh2-between"><span>Pause anytime</span><span className="nnh2-muted">1 tap</span></div>
                <div className="nnh2-row nnh2-between"><span>Clear everything</span><span className="nnh2-muted">1 click</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const CSS = `
.nnh2-section{--e:cubic-bezier(0.22,1,0.36,1);font-family:var(--font-ui),system-ui,sans-serif;color:var(--ink);max-width:1200px;margin:0 auto;padding:80px clamp(20px,5vw,40px)}
.nnh2-section *{box-sizing:border-box}
.nnh2-mono{font-family:var(--font-mono),monospace}
.nnh2-head{margin-bottom:48px}
.nnh2-eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--aurora-a);margin-bottom:14px}
.nnh2-title{font-size:clamp(28px,4vw,44px);font-weight:600;letter-spacing:-.03em;max-width:18ch;margin:0}
.nnh2-explorer{display:grid;grid-template-columns:minmax(320px,440px) 1fr;gap:48px;align-items:center;min-height:520px}
@media(max-width:860px){.nnh2-explorer{grid-template-columns:1fr;gap:32px}}
.nnh2-pills{display:flex;flex-direction:column;gap:12px}
.nnh2-pill{background:var(--surface-2);border:1px solid transparent;border-radius:18px;overflow:hidden;transition:background .4s var(--e),box-shadow .4s var(--e),border-color .4s var(--e)}
.nnh2-pill.is-open{background:var(--surface);box-shadow:var(--shadow-md);border-color:var(--hairline)}
.nnh2-pill-btn{width:100%;display:flex;align-items:center;gap:14px;padding:18px 22px;background:none;border:none;cursor:pointer;font-family:inherit;font-size:18px;font-weight:600;color:var(--ink);text-align:left;letter-spacing:-.01em}
.nnh2-plus{position:relative;flex-shrink:0;width:24px;height:24px;border:1.5px solid var(--hairline-strong);border-radius:50%;transition:border-color .3s var(--e),transform .4s var(--e)}
.nnh2-plus::before,.nnh2-plus::after{content:"";position:absolute;top:50%;left:50%;background:var(--ink);border-radius:2px;transition:transform .4s var(--e),background .3s var(--e)}
.nnh2-plus::before{width:11px;height:1.5px;transform:translate(-50%,-50%)}
.nnh2-plus::after{width:1.5px;height:11px;transform:translate(-50%,-50%)}
.nnh2-pill.is-open .nnh2-plus{border-color:var(--aurora-a);transform:rotate(90deg)}
.nnh2-pill.is-open .nnh2-plus::after{transform:translate(-50%,-50%) scaleY(0)}
.nnh2-pill.is-open .nnh2-plus::before,.nnh2-pill.is-open .nnh2-plus::after{background:var(--aurora-a)}
.nnh2-pill-body{display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s var(--e)}
.nnh2-pill.is-open .nnh2-pill-body{grid-template-rows:1fr}
.nnh2-pill-body-inner{overflow:hidden}
.nnh2-pill-text{padding:0 22px 22px;font-size:15px;color:var(--secondary);line-height:1.6;opacity:0;transform:translateY(-6px);transition:opacity .4s var(--e) .1s,transform .4s var(--e) .1s}
.nnh2-pill.is-open .nnh2-pill-text{opacity:1;transform:none}
.nnh2-pill-text b{color:var(--ink);font-weight:600}
.nnh2-visual{position:relative;height:520px;display:flex;align-items:center;justify-content:center}
@media(max-width:860px){.nnh2-visual{height:380px;order:-1}}
.nnh2-glow{position:absolute;width:340px;height:340px;border-radius:50%;background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b));filter:blur(90px);opacity:.16;transition:opacity .6s var(--e)}
.nnh2-frame{position:relative;width:min(420px,100%);height:420px;display:flex;align-items:center;justify-content:center}
.nnh2-card{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.96);transition:opacity .6s var(--e),transform .6s var(--e);pointer-events:none}
.nnh2-card.is-active{opacity:1;transform:none;pointer-events:auto}
.nnh2-mock{width:min(360px,90%);background:var(--surface);border:1px solid var(--hairline);border-radius:22px;box-shadow:var(--shadow-lg);padding:24px;position:relative}
.nnh2-mock::before{content:"";position:absolute;inset:0;border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);pointer-events:none}
:root[data-theme="dark"] .nnh2-mock::before{box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.nnh2-mock-h{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.nnh2-mdot{width:8px;height:8px;border-radius:50%;background:var(--aurora-a);box-shadow:0 0 0 4px color-mix(in srgb,var(--aurora-a) 20%,transparent);flex-shrink:0}
.nnh2-mock-t{font-size:12px;font-weight:600;color:var(--secondary);letter-spacing:.05em}
.nnh2-row{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:var(--surface-2);border-radius:12px;margin-bottom:8px;font-size:14px}
.nnh2-between{justify-content:space-between}
.nnh2-accent{color:var(--aurora-a);font-weight:600}
.nnh2-muted{color:var(--muted)}
.nnh2-ic{flex-shrink:0;width:15px;height:15px;margin-top:2px;color:var(--aurora-a);display:inline-flex}
.nnh2-ic svg{width:100%;height:100%}
.nnh2-bubble{padding:12px 16px;border-radius:16px;font-size:14px;max-width:88%;margin-bottom:8px}
.nnh2-u{margin-left:auto;background:var(--action);color:var(--action-text);border-bottom-right-radius:5px}
.nnh2-a{background:var(--surface-2);border-bottom-left-radius:5px}
.nnh2-code{font-family:var(--font-mono),monospace;font-size:12px;color:var(--secondary);line-height:1.7}
.nnh2-k{color:var(--aurora-a)}
.nnh2-arrow{text-align:center;margin:16px 0;color:var(--muted)}
.nnh2-chips{text-align:center}
.nnh2-chip{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;background:var(--surface-2);border-radius:999px;font-size:13px;margin:4px}
.nnh2-cd{width:7px;height:7px;border-radius:50%;background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b))}
@media(prefers-reduced-motion:reduce){
  .nnh2-pill,.nnh2-pill-body,.nnh2-pill-text,.nnh2-plus,.nnh2-plus::before,.nnh2-plus::after,.nnh2-card,.nnh2-glow{transition:none}
}
`;

export default HighlightsExplorer;

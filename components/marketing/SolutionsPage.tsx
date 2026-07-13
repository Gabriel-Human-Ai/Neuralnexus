"use client";

/**
 * NeuralNexus — SolutionsPage (marketing)
 * Matches ImmersiveLanding + PricingPage style. Scoped under .nns-.
 * Shows who NeuralNexus is for, tied to the "one profile, every AI" core.
 * Reveal-on-scroll, hover micro-interactions, reduced-motion safe.
 */

import { useEffect, useRef } from "react";

type Solution = { tag: string; title: string; body: string };

const SOLUTIONS: Solution[] = [
  { tag: "For creators", title: "Your taste, on every AI you touch.",
    body: "Image models, writing tools, editors — they all start guessing. NeuralNexus hands them your aesthetic and voice, so what comes back already looks like you." },
  { tag: "For founders & solo operators", title: "Stop re-explaining yourself to every tool.",
    body: "You switch between ChatGPT, Claude and a dozen tabs a day. Carry one profile across all of them and never brief an AI from scratch again." },
  { tag: "For consultants & agencies", title: "Your judgment, repeatable across the team.",
    body: "Turn how you decide and communicate into a profile your whole team can apply — consistent output, even when you're not in the room." },
  { tag: "For anyone using AI daily", title: "Every assistant, tuned to how you think.",
    body: "The more you use NeuralNexus, the sharper it gets — and the more every other AI feels like it was built for you specifically." },
];

const STEPS = [
  { n: "01", t: "It learns you", d: "Quietly, from how you actually work. No forms." },
  { n: "02", t: "You see yourself", d: "A precise, honest profile you fully own and control." },
  { n: "03", t: "You take it anywhere", d: "One click into ChatGPT, Claude, image models and more." },
];

type Props = { onGetStarted?: () => void };

export function SolutionsPage({ onGetStarted }: Props) {
  const revealRefs = useRef<HTMLElement[]>([]);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      revealRefs.current.forEach((el) => el.classList.add("is-vis"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-vis"); io.unobserve(e.target); } }),
      { threshold: 0.2, rootMargin: "0px 0px -8%" },
    );
    revealRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  const rv = (el: HTMLElement | null) => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el); };

  return (
    <div className="nns-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="nns-wrap">
        <div className="nns-head nns-rv" ref={rv}>
          <div className="nns-eyebrow nns-mono">Solutions</div>
          <h1>One profile. However you work.</h1>
          <p>NeuralNexus learns how you think and hands it to every AI you use — whatever you build, decide, or create.</p>
        </div>

        <div className="nns-grid">
          {SOLUTIONS.map((s) => (
            <div key={s.tag} className="nns-card nns-rv" ref={rv}>
              <div className="nns-tag nns-mono">{s.tag}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>

        <div className="nns-steps-head nns-rv" ref={rv}>
          <div className="nns-eyebrow nns-mono">How it works</div>
          <h2>The same three steps, whoever you are.</h2>
        </div>
        <div className="nns-steps nns-rv" ref={rv}>
          {STEPS.map((s) => (
            <div key={s.n} className="nns-step">
              <div className="nns-step-num nns-mono">{s.n}</div>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
            </div>
          ))}
        </div>

        <div className="nns-cta nns-rv" ref={rv}>
          <h2>Build yours in minutes.</h2>
          <button type="button" className="nns-btn nns-btn-primary" onClick={onGetStarted}>
            Start building yours
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="nns-chev"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.nns-root{--e:cubic-bezier(0.22,1,0.36,1);font-family:var(--font-ui),system-ui,sans-serif;color:var(--ink)}
.nns-root *{box-sizing:border-box}
.nns-mono{font-family:var(--font-mono),monospace}
.nns-wrap{max-width:1100px;margin:0 auto;padding:140px clamp(20px,5vw,40px) 80px}
.nns-eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--aurora-a);margin-bottom:16px}
.nns-head{text-align:center;margin-bottom:56px}
.nns-head h1{font-size:clamp(34px,5vw,56px);font-weight:600;letter-spacing:-.03em;line-height:1.03;margin:0 0 16px}
.nns-head p{font-size:18px;color:var(--secondary);max-width:48ch;margin:0 auto}
.nns-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:100px}
@media(max-width:820px){.nns-grid{grid-template-columns:1fr}}
.nns-card{position:relative;background:var(--surface);border:1px solid var(--hairline);border-radius:22px;padding:32px;box-shadow:var(--shadow-sm);transition:transform .2s var(--e),box-shadow .2s var(--e),border-color .2s var(--e)}
.nns-card::before{content:"";position:absolute;inset:0;border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);pointer-events:none}
:root[data-theme="dark"] .nns-card::before{box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.nns-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-md);border-color:var(--hairline-strong)}
.nns-tag{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--aurora-a);margin-bottom:14px}
.nns-card h3{font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.15;margin:0 0 12px}
.nns-card p{font-size:15px;color:var(--secondary);line-height:1.6;margin:0}
.nns-steps-head{text-align:center;margin-bottom:40px}
.nns-steps-head h2{font-size:clamp(26px,3.5vw,38px);font-weight:600;letter-spacing:-.02em;margin:0}
.nns-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:100px}
@media(max-width:768px){.nns-steps{grid-template-columns:1fr}}
.nns-step{background:var(--surface);border:1px solid var(--hairline);border-radius:20px;padding:26px;position:relative;transition:transform .16s var(--e),box-shadow .16s var(--e)}
.nns-step:hover{transform:translateY(-3px);box-shadow:var(--shadow-md)}
.nns-step-num{font-size:13px;color:var(--aurora-a);margin-bottom:14px}
.nns-step h4{font-size:17px;font-weight:600;margin:0 0 6px;letter-spacing:-.01em}
.nns-step p{font-size:14px;color:var(--secondary);margin:0;line-height:1.5}
.nns-cta{text-align:center}
.nns-cta h2{font-size:clamp(28px,4vw,44px);font-weight:600;letter-spacing:-.03em;margin:0 0 24px}
.nns-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:52px;padding:0 28px;border-radius:999px;font-family:inherit;font-size:17px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:transform .16s var(--e),box-shadow .16s var(--e)}
.nns-btn:active{transform:scale(.97)}
.nns-btn-primary{background:var(--action);color:var(--action-text);box-shadow:inset 0 1px 0 rgba(255,255,255,.15),var(--shadow-sm)}
.nns-btn-primary:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
.nns-chev{width:16px;height:16px;transition:transform .16s var(--e)}
.nns-btn-primary:hover .nns-chev{transform:translateX(3px)}
.nns-rv{opacity:0;transform:translateY(30px);filter:blur(6px);transition:opacity .8s var(--e),transform .8s var(--e),filter .8s var(--e)}
.nns-rv.is-vis{opacity:1;transform:none;filter:none}
@media(prefers-reduced-motion:reduce){
  .nns-rv{opacity:1;transform:none;filter:none;transition:none}
  .nns-card,.nns-step,.nns-btn,.nns-chev{transition:none}
}
`;

export default SolutionsPage;

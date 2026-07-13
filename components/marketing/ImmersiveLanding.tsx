"use client";

/**
 * NeuralNexus — ImmersiveLanding (marketing)
 * A long, cinematic Apple-style scroll story built around the product's core:
 * "it learns you → you see yourself → take it anywhere". Self-contained, scoped
 * under .nnl- to avoid CSS collisions. Uses the app's Aurora tokens.
 *
 * Render <ImmersiveLanding onGetStarted={...} onLogin={...} /> as the signed-out landing.
 * Scroll-driven hero fade/scale, progress bar, blurred reveals, hover micro-interactions.
 * Reduced-motion safe, responsive to 375px, keyboard-safe.
 */

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { HighlightsExplorer } from "@/components/marketing/HighlightsExplorer";

const CHEVRON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
);
const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
);
const ARROW_DOWN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

type Props = {
  onGetStarted?: () => void;
  onLogin?: () => void;
  onSolutions?: () => void;
  onPricing?: () => void;
  onSecurity?: () => void;
};

function LandingLoginButton({ children, className, onLogin }: { children: ReactNode; className: string; onLogin?: () => void }) {
  if (!clerkEnabled) {
    return <button type="button" className={className} onClick={onLogin}>{children}</button>;
  }
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <button type="button" className={className} disabled>{children}</button>;
  if (isSignedIn) return <button type="button" className={className} onClick={onLogin}>Open app</button>;
  return (
    <SignInButton mode="modal">
      <button type="button" className={className}>{children}</button>
    </SignInButton>
  );
}

function LandingGetStartedButton({ children, className, onGetStarted }: { children: ReactNode; className: string; onGetStarted?: () => void }) {
  if (!clerkEnabled) {
    return <button type="button" className={className} onClick={onGetStarted}>{children}</button>;
  }
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <button type="button" className={className} disabled>{children}</button>;
  if (isSignedIn) return <button type="button" className={className} onClick={onGetStarted}>{children}</button>;
  return (
    <SignUpButton mode="modal">
      <button type="button" className={className}>{children}</button>
    </SignUpButton>
  );
}

export function ImmersiveLanding({ onGetStarted, onLogin, onSolutions, onPricing, onSecurity }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const progRef = useRef<HTMLDivElement | null>(null);
  const revealRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        if (progRef.current) {
          const h = document.body.scrollHeight - window.innerHeight;
          progRef.current.style.width = h > 0 ? `${(y / h) * 100}%` : "0%";
        }
        if (heroRef.current && !reduce) {
          const p = Math.min(y / window.innerHeight, 1);
          heroRef.current.style.opacity = String(1 - p);
          heroRef.current.style.transform = `scale(${1 - p * 0.06})`;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      revealRefs.current.forEach((el) => el.classList.add("is-vis"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-vis"); io.unobserve(e.target); } }),
      { threshold: 0.2, rootMargin: "0px 0px -10%" },
    );
    revealRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const rv = (el: HTMLElement | null) => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el); };
  const scrollToStory = () => {
    document.querySelector(".nnl-story")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="nnl-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="nnl-progress" ref={progRef} />

      <header className={`nnl-hdr${scrolled ? " is-scrolled" : ""}`}>
        <div className="nnl-hdr-in">
          <div className="nnl-brand"><div className="nnl-disc" /><span className="nnl-bname">NeuralNexus</span></div>
          <nav className="nnl-nav">
            <button type="button" className="nnl-nav-item" onClick={onSolutions ?? scrollToStory}>Solutions</button>
            <button type="button" className="nnl-nav-item" onClick={onPricing}>Pricing</button>
            <button type="button" className="nnl-nav-item" onClick={onSecurity}>Security</button>
          </nav>
          <div className="nnl-hactions">
            <LandingLoginButton className="nnl-btn nnl-bq" onLogin={onLogin}>Log in</LandingLoginButton>
            <LandingGetStartedButton className="nnl-btn nnl-bp" onGetStarted={onGetStarted}>Get started <span className="nnl-chev">{CHEVRON}</span></LandingGetStartedButton>
          </div>
        </div>
      </header>

      <div className="nnl-hero-wrap">
        <section className="nnl-hero" ref={heroRef}>
          <div className="nnl-hero-eyebrow nnl-mono">Your AI personality profile</div>
          <h1 className="nnl-hero-h1">One profile.<br /><span className="nnl-grad">Every AI knows you.</span></h1>
          <p className="nnl-hero-sub">NeuralNexus learns how you think just by being used — then tunes every AI you touch to match.</p>
          <div className="nnl-scroll-hint nnl-mono">Scroll<span className="nnl-ic20">{ARROW_DOWN}</span></div>
        </section>
      </div>

      <div className="nnl-story">
        <section className="nnl-act">
          <div className="nnl-rv" ref={rv}>
            <div className="nnl-act-num nnl-mono">01 — IT LEARNS</div>
            <h2>It notices how you think. You do nothing.</h2>
            <p>No forms. No quizzes. You just use NeuralNexus normally — and every real choice quietly reveals how you like to be met. The learning is invisible. What it learns is not.</p>
          </div>
          <div className="nnl-visual nnl-rv" ref={rv}>
            <div className="nnl-vglow" />
            <div className="nnl-chat">
              <div className="nnl-bubble nnl-user">Can you make this shorter and drop the buzzwords?</div>
              <div className="nnl-bubble nnl-ai">Done — here's the tightened version, plain and direct.</div>
              <div className="nnl-learn-tag"><span className="nnl-learn-dot" />Noticed: you prefer plain language over jargon</div>
            </div>
          </div>
        </section>

        <section className="nnl-act nnl-reverse">
          <div className="nnl-rv" ref={rv}>
            <div className="nnl-act-num nnl-mono">02 — YOU SEE YOURSELF</div>
            <h2>A mirror of how you think — that you own.</h2>
            <p>Open your profile and read precise, honest observations drawn only from your own words. Keep what fits. Remove what doesn't. It never leaves without you.</p>
          </div>
          <div className="nnl-visual nnl-rv" ref={rv}>
            <div className="nnl-vglow" />
            <div className="nnl-pcard">
              <div className="nnl-pc-head"><span className="nnl-learn-dot" /><span className="nnl-pc-title nnl-mono">YOUR PROFILE</span></div>
              <div className="nnl-pc-label">How you like to be spoken to</div>
              <div className="nnl-ins"><span className="nnl-ic16">{CHECK}</span>You prefer plain language over jargon.</div>
              <div className="nnl-ins"><span className="nnl-ic16">{CHECK}</span>You want the answer first, reasoning after.</div>
              <div className="nnl-pc-label">How you think</div>
              <div className="nnl-ins"><span className="nnl-ic16">{CHECK}</span>You reach for a concrete example before trusting a claim.</div>
            </div>
          </div>
        </section>

        <section className="nnl-act">
          <div className="nnl-rv" ref={rv}>
            <div className="nnl-act-num nnl-mono">03 — TAKE IT ANYWHERE</div>
            <h2>One click, and every AI speaks your language.</h2>
            <p>Your profile becomes a block any AI understands. Paste it into ChatGPT, Claude, or an image model — and it just clicks. Switch tools without ever starting from zero again.</p>
          </div>
          <div className="nnl-visual nnl-rv" ref={rv}>
            <div className="nnl-vglow" />
            <div className="nnl-export-viz">
              <div className="nnl-exp-block"><span className="nnl-k">Address</span> the user directly, plain language.<br /><span className="nnl-k">Lead</span> with the answer, reasoning after.<br /><span className="nnl-k">Ground</span> claims in concrete examples.</div>
              <span className="nnl-exp-arrow nnl-ic24">{ARROW_DOWN}</span>
              <div className="nnl-exp-targets">
                <div className="nnl-exp-chip"><span className="nnl-d" />ChatGPT</div>
                <div className="nnl-exp-chip"><span className="nnl-d" />Claude</div>
                <div className="nnl-exp-chip"><span className="nnl-d" />Midjourney</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <HighlightsExplorer />

      <section className="nnl-closing">
        <div className="nnl-vglow nnl-vglow-lg" />
        <h2 className="nnl-rv" ref={rv}>Every AI, instantly tuned to you.</h2>
        <p className="nnl-rv" ref={rv}>Build your profile just by using NeuralNexus. Then take yourself everywhere.</p>
        <div className="nnl-rv" ref={rv}>
          <LandingGetStartedButton className="nnl-btn nnl-bp nnl-bp-lg" onGetStarted={onGetStarted}>Start building yours <span className="nnl-chev">{CHEVRON}</span></LandingGetStartedButton>
        </div>
      </section>

      <footer className="nnl-footer">
        <div className="nnl-footer-in">
          <div className="nnl-brand"><div className="nnl-disc" /><span className="nnl-bname">NeuralNexus</span></div>
          <small>Your AI personality, in one profile.</small>
        </div>
      </footer>
    </div>
  );
}

const CSS = `
.nnl-root{--e:cubic-bezier(0.22,1,0.36,1);font-family:var(--font-ui),system-ui,sans-serif;color:var(--ink)}
.nnl-root *{box-sizing:border-box}
.nnl-mono{font-family:var(--font-mono),monospace}
.nnl-grad{background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b));-webkit-background-clip:text;background-clip:text;color:transparent}
.nnl-ic16{display:inline-flex;width:16px;height:16px}.nnl-ic16 svg{width:100%;height:100%}
.nnl-ic20{display:inline-flex;width:20px;height:20px}.nnl-ic20 svg{width:100%;height:100%}
.nnl-ic24{display:inline-flex;width:24px;height:24px}.nnl-ic24 svg{width:100%;height:100%}
.nnl-chev{display:inline-flex;width:15px;height:15px;transition:transform .16s var(--e)}
.nnl-progress{position:fixed;top:0;left:0;height:2px;background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b));z-index:200;width:0}
.nnl-hdr{position:fixed;top:0;left:0;right:0;z-index:100;height:64px;display:flex;align-items:center;padding:0 clamp(20px,5vw,40px);transition:background .3s var(--e),border-color .3s var(--e);border-bottom:1px solid transparent}
.nnl-hdr.is-scrolled{background:color-mix(in srgb,var(--canvas) 80%,transparent);backdrop-filter:blur(14px) saturate(1.3);-webkit-backdrop-filter:blur(14px) saturate(1.3);border-bottom-color:var(--hairline)}
.nnl-hdr-in{width:100%;max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between}
.nnl-brand{display:flex;align-items:center;gap:10px}
.nnl-disc{width:24px;height:24px;border-radius:50%;background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b));box-shadow:inset 0 1px 2px rgba(255,255,255,.35)}
.nnl-bname{font-weight:600;font-size:16px;letter-spacing:-.02em}
.nnl-nav{display:flex;gap:4px}
@media(max-width:768px){.nnl-nav{display:none}}
.nnl-nav-item{appearance:none;border:0;background:transparent;font-family:inherit;padding:8px 12px;font-size:15px;font-weight:500;color:var(--secondary);cursor:pointer;border-radius:8px;transition:.15s var(--e)}
.nnl-nav-item:hover{color:var(--ink);background:var(--surface-2)}
.nnl-hactions{display:flex;gap:12px;align-items:center}
.nnl-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 18px;border-radius:999px;font-family:inherit;font-size:15px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:transform .16s var(--e),box-shadow .16s var(--e),background .16s var(--e)}
.nnl-btn:active{transform:scale(.97)}
.nnl-bq{background:transparent;color:var(--ink);border-color:var(--hairline)}
.nnl-bq:hover{background:var(--surface-2)}
.nnl-bp{background:var(--action);color:var(--action-text);box-shadow:inset 0 1px 0 rgba(255,255,255,.15),var(--shadow-sm);padding:0 20px}
.nnl-bp:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
.nnl-bp:hover .nnl-chev{transform:translateX(3px)}
.nnl-bp-lg{height:52px;font-size:17px;padding:0 28px}
.nnl-hero-wrap{position:relative;height:100svh}
.nnl-hero{height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 20px;position:sticky;top:0}
.nnl-hero-eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:24px}
.nnl-hero-h1{font-size:clamp(44px,8vw,104px);font-weight:600;letter-spacing:-.04em;line-height:.98;max-width:14ch;margin:0}
.nnl-hero-sub{margin-top:28px;font-size:clamp(17px,2vw,22px);color:var(--secondary);max-width:44ch}
.nnl-scroll-hint{position:absolute;bottom:40px;display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--muted);font-size:12px;letter-spacing:.1em;text-transform:uppercase;animation:nnl-bob 2s ease-in-out infinite}
@keyframes nnl-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
.nnl-story{position:relative}
.nnl-act{min-height:100svh;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:60px;max-width:1200px;margin:0 auto;padding:80px clamp(20px,5vw,40px)}
@media(max-width:900px){.nnl-act{grid-template-columns:1fr;gap:32px;min-height:auto;padding:100px 20px}}
.nnl-act-num{font-size:13px;color:var(--aurora-a);letter-spacing:.1em;margin-bottom:16px}
.nnl-act h2{font-size:clamp(30px,4.5vw,52px);font-weight:600;letter-spacing:-.03em;line-height:1.05;margin:0 0 20px;max-width:16ch}
.nnl-act p{font-size:clamp(16px,1.5vw,19px);color:var(--secondary);max-width:46ch;margin:0}
.nnl-reverse{direction:rtl}.nnl-reverse>*{direction:ltr}
@media(max-width:900px){.nnl-reverse{direction:ltr}}
.nnl-rv{opacity:0;transform:translateY(40px);filter:blur(8px);transition:opacity .9s var(--e),transform .9s var(--e),filter .9s var(--e)}
.nnl-rv.is-vis{opacity:1;transform:none;filter:none}
.nnl-visual{position:relative;display:flex;align-items:center;justify-content:center;min-height:400px}
.nnl-vglow{position:absolute;width:300px;height:300px;border-radius:50%;background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b));filter:blur(90px);opacity:.18;animation:nnl-breathe 9s ease-in-out infinite}
.nnl-vglow-lg{width:500px;height:500px;opacity:.15}
@keyframes nnl-breathe{0%,100%{transform:scale(1);opacity:.14}50%{transform:scale(1.1);opacity:.22}}
.nnl-chat{width:min(400px,90vw);display:flex;flex-direction:column;gap:12px}
.nnl-bubble{padding:14px 18px;border-radius:18px;font-size:15px;max-width:85%;box-shadow:var(--shadow-sm)}
.nnl-user{align-self:flex-end;background:var(--action);color:var(--action-text);border-bottom-right-radius:6px}
.nnl-ai{align-self:flex-start;background:var(--surface);border:1px solid var(--hairline);border-bottom-left-radius:6px}
.nnl-learn-tag{align-self:flex-start;margin-top:4px;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;background:var(--surface-2);border-radius:999px;font-size:13px;color:var(--secondary)}
.nnl-learn-dot{width:7px;height:7px;border-radius:50%;background:var(--aurora-a);box-shadow:0 0 0 4px color-mix(in srgb,var(--aurora-a) 20%,transparent);flex-shrink:0}
.nnl-pcard{width:min(400px,90vw);background:var(--surface);border:1px solid var(--hairline);border-radius:22px;box-shadow:var(--shadow-lg);padding:26px;position:relative}
.nnl-pcard::before{content:"";position:absolute;inset:0;border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);pointer-events:none}
:root[data-theme="dark"] .nnl-pcard::before{box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.nnl-pc-head{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.nnl-pc-title{font-size:13px;font-weight:600;color:var(--secondary);letter-spacing:.04em}
.nnl-pc-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;margin:16px 0 8px}
.nnl-ins{display:flex;gap:10px;align-items:flex-start;padding:11px 12px;background:var(--surface-2);border-radius:12px;margin-bottom:8px;font-size:14px;line-height:1.45}
.nnl-ins .nnl-ic16{flex-shrink:0;margin-top:2px;color:var(--aurora-a)}
.nnl-export-viz{width:min(400px,90vw);display:flex;flex-direction:column;align-items:center;gap:24px}
.nnl-exp-block{width:100%;background:var(--surface);border:1px solid var(--hairline);border-radius:16px;padding:18px;font-family:var(--font-mono),monospace;font-size:12px;color:var(--secondary);line-height:1.7;box-shadow:var(--shadow-md)}
.nnl-k{color:var(--aurora-a)}
.nnl-exp-arrow{color:var(--muted)}
.nnl-exp-targets{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}
.nnl-exp-chip{display:flex;align-items:center;gap:8px;padding:10px 16px;background:var(--surface-2);border-radius:999px;font-size:14px;font-weight:500}
.nnl-d{width:8px;height:8px;border-radius:50%;background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b))}
.nnl-closing{min-height:90svh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 20px;position:relative;overflow:hidden}
.nnl-closing h2{font-size:clamp(36px,6vw,72px);font-weight:600;letter-spacing:-.03em;line-height:1;max-width:16ch;margin:0 0 24px}
.nnl-closing p{font-size:19px;color:var(--secondary);margin:0 0 36px;max-width:40ch}
.nnl-footer{border-top:1px solid var(--hairline)}
.nnl-footer-in{max-width:1200px;margin:0 auto;padding:40px clamp(20px,5vw,40px);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.nnl-footer .nnl-bname{font-size:15px}
.nnl-footer small{color:var(--muted);font-size:13px}
@media(prefers-reduced-motion:reduce){
  .nnl-rv{opacity:1!important;transform:none!important;filter:none!important;transition:none}
  .nnl-scroll-hint,.nnl-vglow{animation:none}
  .nnl-hdr,.nnl-btn,.nnl-chev{transition:none}
}
@media(max-width:560px){
  .nnl-hactions{gap:8px}
  .nnl-hactions .nnl-bq{display:none}
  .nnl-hactions .nnl-bp{height:38px;padding:0 14px;font-size:14px}
}
`;

export default ImmersiveLanding;

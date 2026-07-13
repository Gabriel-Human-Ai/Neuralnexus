"use client";

/**
 * NeuralNexus — Hero (marketing)
 * Self-contained landing hero. Uses the app's Aurora tokens (--canvas, --surface,
 * --ink, --aurora-a/b, --hairline, --action…) which are already defined in globals.css.
 * All component styles are scoped under .nnh- to avoid collisions with the existing CSS.
 *
 * Drop-in: render <Hero onGetStarted={...} onLogin={...} /> as the signed-out landing.
 * Apple-grade micro-interactions: header scroll-condensation, staggered hero entrance,
 * a self-assembling "living profile" signature card, copy-morph, scroll reveals.
 * Reduced-motion safe. Keyboard safe. Responsive to 375px.
 */

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState, type ReactNode } from "react";

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const CHEVRON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

type HeroProps = {
  onGetStarted?: () => void;
  onLogin?: () => void;
  onPricing?: () => void;
  onSecurity?: () => void;
};

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function HeroLoginButton({ onLogin }: { onLogin?: () => void }) {
  if (!clerkEnabled) {
    return <button className="nnh-btn nnh-btn-quiet" onClick={onLogin}>Log in</button>;
  }

  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <button className="nnh-btn nnh-btn-quiet" disabled>Log in</button>;
  }

  if (isSignedIn) {
    return <button className="nnh-btn nnh-btn-quiet" onClick={onLogin}>Open app</button>;
  }

  return (
    <SignInButton mode="modal">
      <button className="nnh-btn nnh-btn-quiet">Log in</button>
    </SignInButton>
  );
}

function HeroGetStartedButton({ children, className = "", onGetStarted }: { children: ReactNode; className?: string; onGetStarted?: () => void }) {
  if (!clerkEnabled) {
    return <button className={className} onClick={onGetStarted}>{children}</button>;
  }

  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <button className={className} disabled>{children}</button>;
  }

  if (isSignedIn) {
    return <button className={className} onClick={onGetStarted}>{children}</button>;
  }

  return (
    <SignUpButton mode="modal">
      <button className={className}>{children}</button>
    </SignUpButton>
  );
}

export function Hero({ onGetStarted, onLogin, onPricing, onSecurity }: HeroProps) {
  const [scrolled, setScrolled] = useState(false);
  const [copied, setCopied] = useState(false);
  const revealRefs = useRef<(HTMLElement | null)[]>([]);

  // Header condensation
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll reveals
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      revealRefs.current.forEach((el) => el?.classList.add("is-vis"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-vis");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8%" },
    );
    revealRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  // Insight stagger inside the signature card
  const [shownInsights, setShownInsights] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShownInsights(3);
      return;
    }
    const timers = [0, 1, 2].map((i) =>
      setTimeout(() => setShownInsights((n) => Math.max(n, i + 1)), 1400 + i * 260),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  function handleCopy() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function scrollToHowItWorks() {
    document.querySelector(".nnh-section")?.scrollIntoView({ behavior: "smooth" });
  }

  const addReveal = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  return (
    <div className="nnh-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className={`nnh-hdr${scrolled ? " is-scrolled" : ""}`}>
        <div className="nnh-hdr-in">
          <div className="nnh-brand">
            <div className="nnh-disc" />
            <span className="nnh-brand-name">NeuralNexus</span>
          </div>
          <nav className="nnh-nav">
            <button type="button" className="nnh-nav-item" onClick={scrollToHowItWorks}>Solutions</button>
            <button type="button" className="nnh-nav-item" onClick={onPricing}>Pricing</button>
            <button type="button" className="nnh-nav-item" onClick={onSecurity}>Security</button>
          </nav>
          <div className="nnh-actions">
            <HeroLoginButton onLogin={onLogin} />
            <HeroGetStartedButton className="nnh-btn nnh-btn-primary" onGetStarted={onGetStarted}>
              Get started <span className="nnh-chev">{CHEVRON}</span>
            </HeroGetStartedButton>
          </div>
        </div>
      </header>

      <section className="nnh-hero">
        <div className="nnh-copy">
          <div className="nnh-eyebrow">Your AI personality profile</div>
          <h1 className="nnh-h1">
            <span className="nnh-line">Every AI, instantly</span>
            <span className="nnh-line"><span className="nnh-grad">tuned to you.</span></span>
          </h1>
          <p className="nnh-sub">
            NeuralNexus quietly learns how you think just by being used — then hands every AI a
            profile so it talks, writes and creates the way you actually want.
          </p>
          <div className="nnh-cta">
            <HeroGetStartedButton className="nnh-btn nnh-btn-primary nnh-btn-lg" onGetStarted={onGetStarted}>
              Start building yours <span className="nnh-chev">{CHEVRON}</span>
            </HeroGetStartedButton>
            <button className="nnh-btn nnh-btn-quiet nnh-btn-lg" onClick={scrollToHowItWorks}>
              See how it works
            </button>
          </div>
          <p className="nnh-note">No setup. It learns as you use it. Yours to keep, edit, or export anytime.</p>
        </div>

        <div className="nnh-stage">
          <div className="nnh-orb" />
          <div className="nnh-pcard">
            <div className="nnh-pcard-head">
              <div className="nnh-pcard-dot" />
              <div className="nnh-pcard-title">YOUR PROFILE</div>
            </div>
            <div className="nnh-pcard-label">How you like to be spoken to</div>
            <div className={`nnh-insight${shownInsights >= 1 ? " is-show" : ""}`}>
              <span className="nnh-ic">{CHECK}</span>You prefer plain language over jargon.
            </div>
            <div className={`nnh-insight${shownInsights >= 2 ? " is-show" : ""}`}>
              <span className="nnh-ic">{CHECK}</span>You want the answer first, reasoning after.
            </div>
            <div className="nnh-pcard-label">How you think</div>
            <div className={`nnh-insight${shownInsights >= 3 ? " is-show" : ""}`}>
              <span className="nnh-ic">{CHECK}</span>You reach for a concrete example before trusting a claim.
            </div>
            <div className="nnh-export-row">
              <span className="nnh-export-lbl">Ready for ChatGPT, Claude &amp; more</span>
              <button className="nnh-export-btn" onClick={handleCopy}>
                {copied ? (
                  <><span className="nnh-ic-sm">{CHECK}</span>Copied</>
                ) : (
                  <><span className="nnh-ic-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  </span>Copy profile</>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="nnh-section">
        <div className="nnh-reveal" ref={addReveal}>
          <div className="nnh-sec-eyebrow">How it works</div>
          <h2 className="nnh-sec-title">It learns you by watching how you work — not by asking.</h2>
          <p className="nnh-sec-sub">
            No forms, no quizzes, no "tell us about yourself." You just use NeuralNexus normally,
            and a profile of how you think takes shape on its own.
          </p>
        </div>
        <div className="nnh-steps nnh-reveal-group" ref={addReveal}>
          <div className="nnh-step"><div className="nnh-step-num">01</div><h3>Use it normally</h3><p>Chat, choose, refine. Every real decision quietly reveals how you like to be met — no effort from you.</p></div>
          <div className="nnh-step"><div className="nnh-step-num">02</div><h3>See yourself</h3><p>Open your profile and read precise, honest observations about how you think. Keep what fits, remove what doesn't. It's yours.</p></div>
          <div className="nnh-step"><div className="nnh-step-num">03</div><h3>Take it anywhere</h3><p>One click turns your profile into a block any AI understands. Paste it into ChatGPT, Claude or an image model — and it just clicks.</p></div>
        </div>
      </section>

      <footer className="nnh-footer">
        <div className="nnh-footer-in">
          <div className="nnh-brand"><div className="nnh-disc" /><span className="nnh-brand-name">NeuralNexus</span></div>
          <small>Your AI personality, in one profile.</small>
        </div>
      </footer>
    </div>
  );
}

const CSS = `
.nnh-root{--e:cubic-bezier(0.22,1,0.36,1);font-family:var(--font-ui),system-ui,sans-serif;color:var(--ink)}
.nnh-root *{box-sizing:border-box}
.nnh-hdr{position:fixed;top:0;left:0;right:0;z-index:100;height:72px;display:flex;align-items:center;padding:0 clamp(20px,5vw,40px);border-bottom:1px solid transparent;transition:height .24s var(--e),background .24s var(--e),box-shadow .24s var(--e),border-color .24s var(--e)}
.nnh-hdr.is-scrolled{height:60px;background:color-mix(in srgb,var(--canvas) 82%,transparent);backdrop-filter:blur(12px) saturate(1.2);-webkit-backdrop-filter:blur(12px) saturate(1.2);border-bottom-color:var(--hairline);box-shadow:var(--shadow-sm)}
.nnh-hdr-in{width:100%;max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between}
.nnh-brand{display:flex;align-items:center;gap:10px;cursor:pointer;transition:opacity .15s var(--e)}
.nnh-brand:hover{opacity:.7}
.nnh-disc{width:24px;height:24px;border-radius:50%;background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b));box-shadow:inset 0 1px 2px rgba(255,255,255,.35),var(--shadow-sm)}
.nnh-brand-name{font-weight:600;font-size:16px;letter-spacing:-.02em}
.nnh-nav{display:flex;align-items:center;gap:4px}
@media(max-width:768px){.nnh-nav{display:none}}
.nnh-nav-item{appearance:none;border:0;background:transparent;font-family:inherit;padding:8px 12px;font-size:15px;font-weight:500;color:var(--secondary);cursor:pointer;border-radius:8px;transition:color .15s var(--e),background .15s var(--e)}
.nnh-nav-item:hover{color:var(--ink);background:var(--surface-2)}
.nnh-actions{display:flex;align-items:center;gap:12px}
@media(max-width:560px){.nnh-actions{gap:8px}.nnh-actions .nnh-btn-quiet{display:none}.nnh-actions .nnh-btn-primary{height:38px;padding:0 14px;font-size:14px}}
.nnh-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 18px;border-radius:999px;font-family:inherit;font-size:15px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:transform .16s var(--e),box-shadow .16s var(--e),background .16s var(--e)}
.nnh-btn:active{transform:scale(.97)}
.nnh-btn-quiet{background:transparent;color:var(--ink);border-color:var(--hairline)}
.nnh-btn-quiet:hover{background:var(--surface-2)}
.nnh-btn-primary{background:var(--action);color:var(--action-text);box-shadow:inset 0 1px 0 rgba(255,255,255,.15),var(--shadow-sm);padding:0 20px}
.nnh-btn-primary:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
.nnh-btn-lg{height:48px;font-size:16px}
.nnh-chev{display:inline-flex;width:16px;height:16px;transition:transform .16s var(--e)}
.nnh-btn-primary:hover .nnh-chev{transform:translateX(3px)}
.nnh-hero{min-height:100svh;display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:48px;max-width:1200px;margin:0 auto;padding:120px clamp(20px,5vw,40px) 80px}
@media(max-width:900px){.nnh-hero{grid-template-columns:1fr;gap:40px;padding-top:100px}}
.nnh-eyebrow{font-family:var(--font-mono),monospace;font-size:11px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:20px;opacity:0;transform:translateY(12px);animation:nnh-rise .7s var(--e) .1s forwards}
.nnh-h1{font-size:clamp(38px,5.5vw,64px);font-weight:600;letter-spacing:-.03em;line-height:1.02;margin:0 0 22px}
.nnh-line{display:block;opacity:0;transform:translateY(18px)}
.nnh-line:nth-child(1){animation:nnh-rise .8s var(--e) .18s forwards}
.nnh-line:nth-child(2){animation:nnh-rise .8s var(--e) .28s forwards}
.nnh-grad{background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b));-webkit-background-clip:text;background-clip:text;color:transparent}
.nnh-sub{font-size:clamp(16px,1.6vw,19px);color:var(--secondary);max-width:32ch;margin:0 0 32px;opacity:0;transform:translateY(14px);animation:nnh-rise .8s var(--e) .4s forwards}
.nnh-cta{display:flex;gap:12px;flex-wrap:wrap;opacity:0;transform:translateY(14px);animation:nnh-rise .8s var(--e) .52s forwards}
.nnh-note{margin:20px 0 0;font-size:13px;color:var(--muted);opacity:0;animation:nnh-fade .8s var(--e) .7s forwards}
@keyframes nnh-rise{to{opacity:1;transform:none}}
@keyframes nnh-fade{to{opacity:1}}
.nnh-stage{position:relative;display:flex;justify-content:center;align-items:center;min-height:420px}
.nnh-orb{position:absolute;width:340px;height:340px;border-radius:50%;background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b));filter:blur(80px);opacity:.2;animation:nnh-breathe 8s ease-in-out infinite}
@keyframes nnh-breathe{0%,100%{transform:scale(1);opacity:.16}50%{transform:scale(1.08);opacity:.24}}
.nnh-pcard{position:relative;width:min(380px,90vw);background:var(--surface);border:1px solid var(--hairline);border-radius:20px;box-shadow:var(--shadow-lg);padding:24px;opacity:0;transform:translateY(24px) scale(.98);animation:nnh-cardin .9s var(--e) .5s forwards}
.nnh-pcard::before{content:"";position:absolute;inset:0;border-radius:20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);pointer-events:none}
:root[data-theme="dark"] .nnh-pcard::before{box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
@keyframes nnh-cardin{to{opacity:1;transform:none}}
.nnh-pcard-head{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.nnh-pcard-dot{width:8px;height:8px;border-radius:50%;background:var(--aurora-a);box-shadow:0 0 0 4px color-mix(in srgb,var(--aurora-a) 18%,transparent)}
.nnh-pcard-title{font-size:13px;font-weight:600;color:var(--secondary);font-family:var(--font-mono),monospace;letter-spacing:.04em}
.nnh-pcard-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;margin:16px 0 8px}
.nnh-insight{display:flex;gap:10px;align-items:flex-start;padding:11px 12px;background:var(--surface-2);border-radius:12px;margin-bottom:8px;font-size:14px;color:var(--ink);line-height:1.45;opacity:0;transform:translateX(-8px);transition:opacity .5s var(--e),transform .5s var(--e)}
.nnh-insight.is-show{opacity:1;transform:none}
.nnh-ic{flex-shrink:0;width:16px;height:16px;margin-top:2px;color:var(--aurora-a)}
.nnh-ic svg{width:100%;height:100%}
.nnh-ic-sm{display:inline-flex;width:14px;height:14px}
.nnh-ic-sm svg{width:100%;height:100%}
.nnh-export-row{margin-top:18px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:16px;border-top:1px solid var(--hairline)}
.nnh-export-lbl{font-size:12px;color:var(--muted)}
.nnh-export-btn{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:999px;background:var(--action);color:var(--action-text);font-size:13px;font-weight:500;font-family:inherit;border:none;cursor:pointer;white-space:nowrap;transition:transform .16s var(--e),box-shadow .16s var(--e)}
.nnh-export-btn:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
.nnh-export-btn:active{transform:scale(.96)}
.nnh-section{max-width:1200px;margin:0 auto;padding:80px clamp(20px,5vw,40px)}
.nnh-reveal{opacity:0;transform:translateY(24px);filter:blur(6px);transition:opacity .7s var(--e),transform .7s var(--e),filter .7s var(--e)}
.nnh-reveal.is-vis{opacity:1;transform:none;filter:none}
.nnh-sec-eyebrow{font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--aurora-a);margin-bottom:14px}
.nnh-sec-title{font-size:clamp(28px,3.5vw,40px);font-weight:600;letter-spacing:-.02em;margin:0 0 16px;max-width:18ch}
.nnh-sec-sub{font-size:17px;color:var(--secondary);max-width:52ch;margin:0 0 48px}
.nnh-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media(max-width:768px){.nnh-steps{grid-template-columns:1fr}}
.nnh-step{background:var(--surface);border:1px solid var(--hairline);border-radius:20px;padding:28px;position:relative;transition:transform .16s var(--e),box-shadow .16s var(--e),border-color .16s var(--e)}
.nnh-step::before{content:"";position:absolute;inset:0;border-radius:20px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);pointer-events:none}
:root[data-theme="dark"] .nnh-step::before{box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.nnh-step:hover{transform:translateY(-3px);box-shadow:var(--shadow-md);border-color:var(--hairline-strong)}
.nnh-step-num{font-family:var(--font-mono),monospace;font-size:13px;color:var(--aurora-a);margin-bottom:16px}
.nnh-step h3{font-size:19px;font-weight:600;margin:0 0 8px;letter-spacing:-.01em}
.nnh-step p{font-size:14px;color:var(--secondary);line-height:1.55;margin:0}
.nnh-reveal-group{opacity:0;transform:translateY(24px);transition:opacity .7s var(--e),transform .7s var(--e)}
.nnh-reveal-group.is-vis{opacity:1;transform:none}
.nnh-reveal-group.is-vis .nnh-step{animation:nnh-rise .6s var(--e) backwards}
.nnh-reveal-group.is-vis .nnh-step:nth-child(2){animation-delay:.08s}
.nnh-reveal-group.is-vis .nnh-step:nth-child(3){animation-delay:.16s}
.nnh-footer{border-top:1px solid var(--hairline);margin-top:40px}
.nnh-footer-in{max-width:1200px;margin:0 auto;padding:40px clamp(20px,5vw,40px);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.nnh-footer .nnh-brand-name{font-size:15px}
.nnh-footer small{color:var(--muted);font-size:13px}
@media(prefers-reduced-motion:reduce){
  .nnh-eyebrow,.nnh-line,.nnh-sub,.nnh-cta,.nnh-note,.nnh-pcard,.nnh-orb,.nnh-insight{animation:none!important;opacity:1!important;transform:none!important}
  .nnh-hdr,.nnh-btn,.nnh-step,.nnh-export-btn,.nnh-chev{transition:none!important}
  .nnh-reveal,.nnh-reveal-group{opacity:1!important;transform:none!important;filter:none!important}
}
`;

export default Hero;

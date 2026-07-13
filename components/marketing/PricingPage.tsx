"use client";

/**
 * NeuralNexus — PricingPage (marketing)
 * Matches the ImmersiveLanding style. Self-contained, scoped under .nnp-.
 * Monthly/Yearly segmented toggle with sliding indicator + "Save 20%" fade-in,
 * price swap, three equal-height cards, featured Pro with aurora border.
 * Prices come from the PLANS constant — edit there, nothing is invented.
 */

import { useEffect, useRef, useState } from "react";

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
);

const YEARLY_DISCOUNT = 0.2;
const PLANS = [
  { id: "free", name: "Free", tagline: "Start building your profile.", monthly: 0,
    features: ["1 profile", "Bring your own API keys", "Core chat & learning", "Manual export"],
    cta: "Get started", featured: false, perSeat: false },
  { id: "pro", name: "Pro", tagline: "Your profile, everywhere.", monthly: 15,
    features: ["Everything in Free", "Managed AI credits included", "Unlimited profiles", "One-click export to any AI", "Deeper signal learning"],
    cta: "Start Pro", featured: true, perSeat: false },
  { id: "studio", name: "Studio", tagline: "For teams and agencies.", monthly: 39,
    features: ["Everything in Pro", "Shared team profiles", "Client mode", "Profile licensing", "Admin controls"],
    cta: "Start Studio", featured: false, perSeat: true },
];

type Props = { onSelectPlan?: (planId: string, billing: "monthly" | "yearly") => void };

export function PricingPage({ onSelectPlan }: Props) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const segRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const movePill = (mode: "monthly" | "yearly") => {
    const seg = segRef.current, pill = pillRef.current, btn = btnRefs.current[mode];
    if (!seg || !pill || !btn) return;
    const r = btn.getBoundingClientRect(), sr = seg.getBoundingClientRect();
    pill.style.width = `${r.width}px`;
    pill.style.transform = `translateX(${r.left - sr.left - 4}px)`;
  };
  useEffect(() => { movePill(billing); }, [billing]);
  useEffect(() => {
    const onResize = () => movePill(billing);
    window.addEventListener("resize", onResize);
    const t = setTimeout(() => movePill(billing), 60);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(t); };
  }, []); // eslint-disable-line

  const priceFor = (m: number) =>
    billing === "yearly" ? Math.round(m * (1 - YEARLY_DISCOUNT)) : m;

  return (
    <div className="nnp-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="nnp-wrap">
        <div className="nnp-head">
          <div className="nnp-eyebrow nnp-mono">Pricing</div>
          <h1>Start free. Upgrade when it's yours.</h1>
          <p>Build your profile for free. Pay only when you want it working across every AI you use.</p>
        </div>

        <div className="nnp-toggle-row">
          <div className="nnp-seg" ref={segRef}>
            <span className="nnp-seg-pill" ref={pillRef} />
            {(["monthly", "yearly"] as const).map((mode) => (
              <button type="button" key={mode} ref={(el) => { btnRefs.current[mode] = el; }}
                className={billing === mode ? "is-active" : ""}
                onClick={() => setBilling(mode)}>
                {mode === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
          <span className={`nnp-save${billing === "yearly" ? " is-show" : ""}`}>Save 20%</span>
        </div>

        <div className="nnp-cards">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`nnp-card${plan.featured ? " is-featured" : ""}`}>
              {plan.featured && <div className="nnp-badge-top">Most popular</div>}
              <div className="nnp-plan-name">{plan.name}</div>
              <div className="nnp-plan-tag">{plan.tagline}</div>
              <div className="nnp-price">
                <span className="nnp-amt">${priceFor(plan.monthly)}</span>
                {plan.monthly > 0 && <span className="nnp-per">/mo</span>}
              </div>
              <div className="nnp-price-note">
                {plan.monthly === 0
                  ? "Forever"
                  : `${plan.perSeat ? "per seat, " : ""}billed ${billing}`}
              </div>
              <ul className="nnp-feats">
                {plan.features.map((f) => (
                  <li key={f}><span className="nnp-ic">{CHECK}</span>{f}</li>
                ))}
              </ul>
              <button
                type="button"
                className={`nnp-card-btn ${plan.featured ? "nnp-btn-primary" : "nnp-btn-outline"}`}
                onClick={() => onSelectPlan?.(plan.id, billing)}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CSS = `
.nnp-root{--e:cubic-bezier(0.22,1,0.36,1);font-family:var(--font-ui),system-ui,sans-serif;color:var(--ink)}
.nnp-root *{box-sizing:border-box}
.nnp-mono{font-family:var(--font-mono),monospace}
.nnp-wrap{max-width:1100px;margin:0 auto;padding:140px clamp(20px,5vw,40px) 80px}
.nnp-head{text-align:center;margin-bottom:8px}
.nnp-eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--aurora-a);margin-bottom:16px}
.nnp-head h1{font-size:clamp(34px,5vw,56px);font-weight:600;letter-spacing:-.03em;line-height:1.03;margin:0 0 16px}
.nnp-head p{font-size:18px;color:var(--secondary);max-width:44ch;margin:0 auto}
.nnp-toggle-row{display:flex;align-items:center;justify-content:center;gap:14px;margin:40px 0 8px}
.nnp-seg{position:relative;display:inline-flex;background:var(--surface-2);border-radius:999px;padding:4px;border:1px solid var(--hairline)}
.nnp-seg button{position:relative;z-index:1;border:none;background:transparent;font-family:inherit;font-size:14px;font-weight:500;color:var(--secondary);padding:8px 20px;border-radius:999px;cursor:pointer;transition:color .3s var(--e)}
.nnp-seg button.is-active{color:var(--action-text)}
.nnp-seg-pill{position:absolute;top:4px;left:4px;height:calc(100% - 8px);background:var(--action);border-radius:999px;transition:transform .35s var(--e),width .35s var(--e);z-index:0}
.nnp-save{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;background:color-mix(in srgb,var(--aurora-a) 12%,transparent);color:var(--aurora-a);border-radius:999px;font-size:13px;font-weight:500;opacity:0;transform:translateY(6px);transition:opacity .4s var(--e),transform .4s var(--e)}
.nnp-save.is-show{opacity:1;transform:none}
.nnp-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:40px}
@media(max-width:820px){.nnp-cards{grid-template-columns:1fr;max-width:400px;margin-left:auto;margin-right:auto}}
.nnp-card{position:relative;background:var(--surface);border:1px solid var(--hairline);border-radius:22px;padding:28px;display:grid;grid-template-rows:auto auto auto auto 1fr auto;box-shadow:var(--shadow-sm);transition:transform .2s var(--e),box-shadow .2s var(--e)}
.nnp-card::before{content:"";position:absolute;inset:0;border-radius:22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9);pointer-events:none}
:root[data-theme="dark"] .nnp-card::before{box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.nnp-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-md)}
.nnp-card.is-featured{border:1.5px solid transparent;box-shadow:var(--shadow-lg);background:linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(135deg,var(--aurora-a),var(--aurora-b)) border-box}
.nnp-badge-top{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b));color:#fff;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:5px 14px;border-radius:999px;white-space:nowrap}
.nnp-plan-name{font-size:15px;font-weight:600;letter-spacing:.02em;margin-bottom:6px}
.nnp-plan-tag{font-size:14px;color:var(--secondary);margin-bottom:20px}
.nnp-price{display:flex;align-items:baseline;gap:4px;margin-bottom:6px}
.nnp-amt{font-size:44px;font-weight:600;letter-spacing:-.03em}
.nnp-per{font-size:15px;color:var(--muted)}
.nnp-price-note{font-size:13px;color:var(--muted);min-height:18px;margin-bottom:24px}
.nnp-feats{list-style:none;display:flex;flex-direction:column;gap:11px;margin:0 0 28px;padding:0}
.nnp-feats li{display:flex;gap:10px;align-items:flex-start;font-size:14px}
.nnp-ic{flex-shrink:0;width:16px;height:16px;margin-top:2px;color:var(--aurora-a);display:inline-flex}
.nnp-ic svg{width:100%;height:100%}
.nnp-card-btn{display:inline-flex;align-items:center;justify-content:center;height:46px;border-radius:999px;font-family:inherit;font-size:15px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:transform .16s var(--e),box-shadow .16s var(--e),background .16s var(--e);width:100%}
.nnp-card-btn:active{transform:scale(.98)}
.nnp-btn-primary{background:var(--action);color:var(--action-text);box-shadow:inset 0 1px 0 rgba(255,255,255,.15),var(--shadow-sm)}
.nnp-btn-primary:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
.nnp-btn-outline{background:transparent;color:var(--ink);border-color:var(--hairline)}
.nnp-btn-outline:hover{background:var(--surface-2)}
@media(prefers-reduced-motion:reduce){
  .nnp-seg-pill,.nnp-save,.nnp-card,.nnp-card-btn{transition:none}
}
`;

export default PricingPage;

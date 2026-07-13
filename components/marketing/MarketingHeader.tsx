"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { type ReactNode } from "react";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const CHEVRON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

type MarketingHeaderProps = {
  current?: "home" | "solutions" | "pricing" | "security";
  onGetStarted?: () => void;
  onLogin?: () => void;
};

function HeaderLoginButton({ children, className, onLogin }: { children: ReactNode; className: string; onLogin?: () => void }) {
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

function HeaderGetStartedButton({ children, className, onGetStarted }: { children: ReactNode; className: string; onGetStarted?: () => void }) {
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

export function MarketingHeader({ current = "home", onGetStarted, onLogin }: MarketingHeaderProps) {
  return (
    <header className="nnm-header" aria-label="Marketing navigation">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="nnm-inner">
        <Link className="nnm-brand" href="/" aria-label="NeuralNexus home">
          <span className="nnm-disc" />
          <span>NeuralNexus</span>
        </Link>

        <nav className="nnm-nav" aria-label="Primary">
          <Link className={`nnm-nav-item${current === "solutions" ? " is-active" : ""}`} href="/solutions">Solutions</Link>
          <Link className={`nnm-nav-item${current === "pricing" ? " is-active" : ""}`} href="/pricing">Pricing</Link>
          <Link className={`nnm-nav-item${current === "security" ? " is-active" : ""}`} href="/#privacy">Security</Link>
        </nav>

        <div className="nnm-actions">
          <HeaderLoginButton className="nnm-btn nnm-btn-quiet" onLogin={onLogin}>Log in</HeaderLoginButton>
          <HeaderGetStartedButton className="nnm-btn nnm-btn-primary" onGetStarted={onGetStarted}>
            Get started <span className="nnm-chev">{CHEVRON}</span>
          </HeaderGetStartedButton>
        </div>
      </div>
    </header>
  );
}

const CSS = `
.nnm-header{--e:cubic-bezier(0.22,1,0.36,1);position:fixed;top:0;left:0;right:0;z-index:120;height:64px;display:flex;align-items:center;padding:0 clamp(20px,5vw,40px);border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(12,9,8,0.72);backdrop-filter:blur(16px) saturate(1.25);-webkit-backdrop-filter:blur(16px) saturate(1.25);font-family:var(--font-ui),system-ui,sans-serif;color:#F5F5F7}
.nnm-header *{box-sizing:border-box}
.nnm-inner{width:100%;max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:24px}
.nnm-brand{display:inline-flex;align-items:center;gap:10px;color:#F5F5F7;text-decoration:none;font-size:16px;font-weight:600;letter-spacing:-.02em;white-space:nowrap}
.nnm-disc{width:24px;height:24px;border-radius:50%;background-image:linear-gradient(135deg,var(--aurora-a),var(--aurora-b));box-shadow:inset 0 1px 2px rgba(255,255,255,.35)}
.nnm-nav{display:flex;align-items:center;justify-content:center;gap:4px;flex:1}
.nnm-nav-item{display:inline-flex;align-items:center;min-height:38px;padding:0 12px;border-radius:10px;color:rgba(245,245,247,0.68);text-decoration:none;font-size:15px;font-weight:500;transition:color .16s var(--e),background .16s var(--e)}
.nnm-nav-item:hover,.nnm-nav-item.is-active{color:#F5F5F7;background:rgba(255,255,255,0.08)}
.nnm-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;white-space:nowrap}
.nnm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 18px;border-radius:999px;border:1px solid transparent;font-family:inherit;font-size:15px;font-weight:500;cursor:pointer;text-decoration:none;transition:transform .16s var(--e),box-shadow .16s var(--e),background .16s var(--e),border-color .16s var(--e)}
.nnm-btn:active{transform:scale(.97)}
.nnm-btn:disabled{opacity:.55;cursor:default}
.nnm-btn-quiet{background:rgba(255,255,255,0.02);color:#F5F5F7;border-color:rgba(255,255,255,0.13)}
.nnm-btn-quiet:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.2)}
.nnm-btn-primary{background:var(--action);color:var(--action-text);box-shadow:inset 0 1px 0 rgba(255,255,255,.15),var(--shadow-sm);padding:0 20px}
.nnm-btn-primary:hover{transform:translateY(-1px);box-shadow:var(--shadow-md)}
.nnm-chev{display:inline-flex;width:15px;height:15px;transition:transform .16s var(--e)}
.nnm-chev svg{width:100%;height:100%}
.nnm-btn-primary:hover .nnm-chev{transform:translateX(3px)}
@media(max-width:760px){
  .nnm-header{height:60px;padding:0 14px}
  .nnm-inner{gap:10px}
  .nnm-nav{display:none}
  .nnm-brand span:last-child{font-size:15px}
  .nnm-disc{width:22px;height:22px}
  .nnm-actions{gap:8px}
  .nnm-btn{height:38px;padding:0 13px;font-size:14px}
  .nnm-btn-quiet{display:none}
}
@media(max-width:390px){
  .nnm-brand span:last-child{max-width:126px;overflow:hidden;text-overflow:ellipsis}
  .nnm-btn-primary{padding:0 12px}
}
@media(prefers-reduced-motion:reduce){
  .nnm-nav-item,.nnm-btn,.nnm-chev{transition:none}
}
`;

export default MarketingHeader;

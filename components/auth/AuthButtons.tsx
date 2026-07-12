"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type AuthButtonsProps = {
  onEnter: () => void;
  compact?: boolean;
};

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function AuthButtons({ onEnter, compact = false }: AuthButtonsProps) {
  if (!clerkEnabled) {
    return (
      <>
        <button type="button" className="public-login" onClick={onEnter}>Log in</button>
        <button type="button" className="public-get-started" onClick={onEnter}>Get started</button>
      </>
    );
  }
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <>
        <button type="button" className="public-login" disabled>Log in</button>
        <button type="button" className="public-get-started" disabled>Get started</button>
      </>
    );
  }

  if (isSignedIn) {
    return (
      <>
        <button type="button" className="public-login" onClick={onEnter}>Open app</button>
        <UserButton />
      </>
    );
  }

  return (
    <>
      <SignInButton mode="modal">
        <button type="button" className="public-login">Log in</button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button type="button" className="public-get-started">
          Get started {!compact && <ChevronRight size={16} />}
        </button>
      </SignUpButton>
    </>
  );
}

export function AuthStartButton({ children, className, onEnter, ariaLabel }: { children: ReactNode; className?: string; onEnter: () => void; ariaLabel?: string }) {
  if (!clerkEnabled) {
    return <button type="button" className={className} aria-label={ariaLabel} onClick={onEnter}>{children}</button>;
  }

  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <button type="button" className={className} aria-label={ariaLabel} disabled>{children}</button>;
  }

  if (isSignedIn) {
    return <button type="button" className={className} aria-label={ariaLabel} onClick={onEnter}>{children}</button>;
  }

  return (
    <SignUpButton mode="modal">
      <button type="button" className={className} aria-label={ariaLabel}>{children}</button>
    </SignUpButton>
  );
}

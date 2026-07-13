"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { PricingPage } from "@/components/marketing/PricingPage";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function PricingWithClerk() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  function handleLogin() {
    if (!isLoaded) return;
    if (isSignedIn) {
      window.location.href = "/";
      return;
    }
    clerk.openSignIn({
      fallbackRedirectUrl: "/",
      forceRedirectUrl: "/",
    });
  }

  function handleGetStarted() {
    handleSelectPlan("free", "monthly");
  }

  function handleSelectPlan(planId: string, billing: "monthly" | "yearly") {
    const target = `/?plan=${encodeURIComponent(planId)}&billing=${encodeURIComponent(billing)}`;
    if (!isLoaded) return;
    if (isSignedIn) {
      window.location.href = target;
      return;
    }
    clerk.openSignUp({
      fallbackRedirectUrl: target,
      forceRedirectUrl: target,
    });
  }

  return <PricingPage onSelectPlan={handleSelectPlan} onGetStarted={handleGetStarted} onLogin={handleLogin} />;
}

export default function Page() {
  if (!clerkEnabled) {
    return (
      <PricingPage
        onGetStarted={() => {
          window.location.href = "/?plan=free&billing=monthly";
        }}
        onLogin={() => {
          window.location.href = "/";
        }}
        onSelectPlan={(planId, billing) => {
          window.location.href = `/?plan=${encodeURIComponent(planId)}&billing=${encodeURIComponent(billing)}`;
        }}
      />
    );
  }

  return <PricingWithClerk />;
}

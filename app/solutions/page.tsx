"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { SolutionsPage } from "@/components/marketing/SolutionsPage";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const startUrl = "/?source=solutions";

function SolutionsWithClerk() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  function handleGetStarted() {
    if (!isLoaded) return;
    if (isSignedIn) {
      window.location.href = startUrl;
      return;
    }
    clerk.openSignUp({
      fallbackRedirectUrl: startUrl,
      forceRedirectUrl: startUrl,
    });
  }

  return <SolutionsPage onGetStarted={handleGetStarted} />;
}

export default function Page() {
  if (!clerkEnabled) {
    return <SolutionsPage onGetStarted={() => { window.location.href = startUrl; }} />;
  }

  return <SolutionsWithClerk />;
}

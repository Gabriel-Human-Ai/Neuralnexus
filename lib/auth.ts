import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export function isAuthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export async function getCurrentClerkUserId() {
  if (!isAuthConfigured()) return null;
  try {
    const session = await auth();
    return session.userId ?? null;
  } catch {
    return null;
  }
}

export async function requireCurrentUser() {
  const clerkId = await getCurrentClerkUserId();
  if (!clerkId) {
    const error = new Error("Authentication required");
    error.name = "AuthRequiredError";
    throw error;
  }
  const clerkUser = await currentUser().catch(() => null);
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
  const name = clerkUser?.fullName ?? clerkUser?.username ?? "";
  return db.user.upsert({
    where: { clerkId },
    update: { email, name },
    create: { clerkId, email, name },
  });
}

export async function optionalCurrentUser() {
  const clerkId = await getCurrentClerkUserId();
  if (!clerkId) return null;
  const clerkUser = await currentUser().catch(() => null);
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
  const name = clerkUser?.fullName ?? clerkUser?.username ?? "";
  return db.user.upsert({
    where: { clerkId },
    update: { email, name },
    create: { clerkId, email, name },
  });
}

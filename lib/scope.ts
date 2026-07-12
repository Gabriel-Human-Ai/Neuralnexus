import { NextResponse } from "next/server";
import { isAuthConfigured, optionalCurrentUser } from "./auth";
import { ensureDefaultWorkProfile, ensureDefaultWorkProfileForUser, requireProfile } from "./profiles";

export type ProfileScope = {
  profileId: string;
};

export function profileStorageKey(profileId: string, key: string) {
  return `profile:${profileId}:${key}`;
}

export async function resolveProfileId(explicitProfileId?: string | null): Promise<string> {
  const user = await optionalCurrentUser();
  if (isAuthConfigured() && !user) {
    const error = new Error("Authentication required");
    error.name = "AuthRequiredError";
    throw error;
  }

  if (explicitProfileId?.trim()) {
    const profile = await requireProfile(explicitProfileId.trim());
    if (user && profile.userId !== user.id) {
      const error = new Error("Profile not found");
      error.name = "ProfileScopeError";
      throw error;
    }
    if (!user && profile.userId) {
      const error = new Error("Profile not found");
      error.name = "ProfileScopeError";
      throw error;
    }
    return profile.id;
  }
  if (user) {
    const profile = await ensureDefaultWorkProfileForUser(user.id);
    return profile.id;
  }
  const profile = await ensureDefaultWorkProfile();
  return profile.id;
}

export function profileIdFromRequest(req: Request) {
  const url = new URL(req.url);
  return url.searchParams.get("profileId") || req.headers.get("x-neuralnexus-profile-id");
}

export async function resolveRequestProfileId(req: Request, explicitProfileId?: string | null) {
  return resolveProfileId(explicitProfileId ?? profileIdFromRequest(req));
}

export function assertRecordProfile(recordProfileId: string | null | undefined, requestedProfileId: string) {
  if (!recordProfileId || recordProfileId !== requestedProfileId) {
    const error = new Error("Record not found");
    error.name = "ProfileScopeError";
    throw error;
  }
}

export function profileScopeErrorResponse(error: unknown) {
  if (error instanceof Error && error.name === "AuthRequiredError") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (error instanceof Error && error.name === "ProfileNotFoundError") {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (error instanceof Error && error.name === "ProfileScopeError") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

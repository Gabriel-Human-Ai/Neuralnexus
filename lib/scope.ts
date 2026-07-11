import { NextResponse } from "next/server";
import { ensureDefaultWorkProfile, requireProfile } from "./profiles";

export type ProfileScope = {
  profileId: string;
};

export function profileStorageKey(profileId: string, key: string) {
  return `profile:${profileId}:${key}`;
}

export async function resolveProfileId(explicitProfileId?: string | null): Promise<string> {
  if (explicitProfileId?.trim()) {
    const profile = await requireProfile(explicitProfileId.trim());
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
  if (error instanceof Error && error.name === "ProfileNotFoundError") {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (error instanceof Error && error.name === "ProfileScopeError") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

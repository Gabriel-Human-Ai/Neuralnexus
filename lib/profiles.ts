import { db } from "./db";

export const DEFAULT_WORK_PROFILE_ID = "default-work-profile";
export const DEFAULT_WORK_PROFILE_NAME = "Work";
export const DEFAULT_WORK_PROFILE_TYPE = "work";
export const PROFILE_TYPES = ["life", "work"] as const;

export type ProfileType = (typeof PROFILE_TYPES)[number];

export function isProfileType(value: unknown): value is ProfileType {
  return typeof value === "string" && PROFILE_TYPES.includes(value as ProfileType);
}

export async function ensureDefaultWorkProfile() {
  const existing = await db.profile.findUnique({ where: { id: DEFAULT_WORK_PROFILE_ID } });
  if (existing) return existing;

  return db.profile.upsert({
    where: { id: DEFAULT_WORK_PROFILE_ID },
    update: { name: DEFAULT_WORK_PROFILE_NAME, type: DEFAULT_WORK_PROFILE_TYPE, isDefault: true },
    create: {
      id: DEFAULT_WORK_PROFILE_ID,
      name: DEFAULT_WORK_PROFILE_NAME,
      type: DEFAULT_WORK_PROFILE_TYPE,
      isDefault: true,
    },
  });
}

export async function getDefaultProfile() {
  return ensureDefaultWorkProfile();
}

export async function getProfileById(profileId: string) {
  return db.profile.findUnique({ where: { id: profileId } });
}

export async function requireProfile(profileId: string) {
  const profile = await getProfileById(profileId);
  if (!profile) {
    const error = new Error("Profile not found");
    error.name = "ProfileNotFoundError";
    throw error;
  }
  return profile;
}

export async function listProfiles() {
  await ensureDefaultWorkProfile();
  return db.profile.findMany({ orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
}

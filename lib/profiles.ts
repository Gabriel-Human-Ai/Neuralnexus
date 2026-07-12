import { db } from "./db";
import { optionalCurrentUser, requireCurrentUser } from "./auth";

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

export async function ensureDefaultWorkProfileForUser(userId: string) {
  const existing = await db.profile.findFirst({
    where: { userId, type: DEFAULT_WORK_PROFILE_TYPE, isDefault: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return db.profile.create({
    data: {
      userId,
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
  const user = await optionalCurrentUser();
  if (!user) {
    await ensureDefaultWorkProfile();
    return db.profile.findMany({ where: { userId: null }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  }
  await ensureDefaultWorkProfileForUser(user.id);
  return db.profile.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
}

export async function createProfileForCurrentUser(args: { name: string; type: ProfileType }) {
  const user = await requireCurrentUser();
  return db.profile.create({
    data: { userId: user.id, name: args.name, type: args.type, isDefault: false },
  });
}

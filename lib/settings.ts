import { db } from "./db";

export const GLOBAL_SETTING_KEYS = new Set([
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENROUTER_API_KEY",
  "GOOGLE_API_KEY",
  "DEEPSEEK_API_KEY",
  "EXTENSION_CAPTURE_TOKEN",
  "INDEX_ENDPOINT",
  "INDEX_INSTANCE_ID",
  "INDEX_LAST_SYNC",
]);

export function isGlobalSettingKey(key: string) {
  return GLOBAL_SETTING_KEYS.has(key) || key.endsWith("_API_KEY");
}

export async function getGlobalSetting(key: string) {
  const row = await db.setting.findUnique({ where: { key } }).catch(() => null);
  return row?.value ?? "";
}

export async function setGlobalSetting(key: string, value: string) {
  if (!value) {
    await db.setting.deleteMany({ where: { key } });
    return;
  }
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function getProfileSetting(profileId: string, key: string) {
  const row = await db.profileSetting.findUnique({
    where: { profileId_key: { profileId, key } },
  }).catch(() => null);
  return row?.value ?? "";
}

export async function setProfileSetting(profileId: string, key: string, value: string) {
  if (!value) {
    await db.profileSetting.deleteMany({ where: { profileId, key } });
    return;
  }
  await db.profileSetting.upsert({
    where: { profileId_key: { profileId, key } },
    update: { value },
    create: { profileId, key, value },
  });
}

export async function getSettingForProfile(profileId: string, key: string) {
  if (isGlobalSettingKey(key)) return getGlobalSetting(key);
  return getProfileSetting(profileId, key);
}

export async function setSettingForProfile(profileId: string, key: string, value: string) {
  if (isGlobalSettingKey(key)) return setGlobalSetting(key, value);
  return setProfileSetting(profileId, key, value);
}

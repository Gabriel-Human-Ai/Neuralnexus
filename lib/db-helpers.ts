import { db } from "@/lib/db";
import { getProviderProfileId } from "@/lib/provider-scope";

export async function getAllSettings(): Promise<Record<string, string>> {
  const profileId = getProviderProfileId();
  const [globalRows, profileRows] = await Promise.all([
    db.setting.findMany(),
    profileId ? db.profileSetting.findMany({ where: { profileId } }) : Promise.resolve([]),
  ]);
  return {
    ...Object.fromEntries(globalRows.map((row) => [row.key, row.value])),
    ...Object.fromEntries(profileRows.map((row) => [row.key, row.value])),
  };
}

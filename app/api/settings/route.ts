export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGlobalSetting, getProfileSetting, isGlobalSettingKey, setSettingForProfile } from "@/lib/settings";
import { resolveRequestProfileId } from "@/lib/scope";

const KEYS = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "GOOGLE_API_KEY", "DEEPSEEK_API_KEY", "CUSTOM_INSTRUCTIONS", "USER_PROFILE", "UI_COMPACT", "UI_FONTSIZE", "UI_ENTERSENDS", "UI_TRUST_MARKS", "MONTHLY_BUDGET_USD", "DAILY_BUDGET_USD", "BRAND_NAME", "BRAND_COLOR", "ROUTING_THRESHOLD", "PREFERRED_NAME", "UI_THEME", "PRIVACY_LEVEL", "COMPANY_CODENAMES", "FULL_NAME", "WORK_TYPE", "UI_BANNER_DISMISSED", "ORB_HUE", "ORB_SPEED", "ORB_MORPH", "ORB_GLOW", "ORB_INTENSITY", "ORB_BREATHING", "WIZARD_FLOATING_ENABLED", "WIZARD_HOME_ORB_ENABLED"];

async function legacyProfileDefault(profileId: string, key: string) {
  const scoped = await getProfileSetting(profileId, key);
  if (scoped) return scoped;
  return getGlobalSetting(key);
}

export async function GET(req: Request) {
  try {
  const profileId = await resolveRequestProfileId(req);
  const rows = await db.setting.findMany({ where: { OR: [{ key: { in: KEYS.filter(isGlobalSettingKey) } }, { key: { startsWith: "STRICT_FACTS_" } }, { key: { in: ["INDEX_INSTANCE_ID", "INDEX_LAST_SYNC"] } }] } });
  const profileRows = await db.profileSetting.findMany({ where: { profileId, OR: [{ key: { in: KEYS.filter((key) => !isGlobalSettingKey(key)) } }, { key: { startsWith: "EYE_SYNTH_" } }, { key: { startsWith: "EYE_SEEN_" } }, { key: { startsWith: "WORKSPACE_STEPS_" } }, { key: "INDEX_CONSENT" }] } });
  // Never send full keys to the browser – only masked status.
  const out: Record<string, string> = {};
  for (const k of KEYS) {
    const v = isGlobalSettingKey(k) ? rows.find(r => r.key === k)?.value ?? "" : await legacyProfileDefault(profileId, k);
    if (k.endsWith("_API_KEY")) out[k] = v ? `••••${v.slice(-4)}` : "";
    else out[k] = v;
  }
  rows.filter((row) => row.key.startsWith("STRICT_FACTS_")).forEach((row) => { out[row.key] = row.value; });
  profileRows.filter((row) => row.key.startsWith("EYE_SYNTH_") || row.key.startsWith("EYE_SEEN_") || row.key.startsWith("WORKSPACE_STEPS_") || row.key === "INDEX_CONSENT").forEach((row) => { out[row.key] = row.value; });
  rows.filter((row) => ["INDEX_INSTANCE_ID", "INDEX_LAST_SYNC"].includes(row.key)).forEach((row) => { out[row.key] = row.value; });
  return NextResponse.json(out);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  const body = await req.json();
  const profileId = await resolveRequestProfileId(req, body.profileId);
  const allowedKeys = [...KEYS, ...Object.keys(body).filter((key) => key.startsWith("STRICT_FACTS_") || key.startsWith("EYE_SEEN_") || key.startsWith("WORKSPACE_STEPS_") || key === "INDEX_CONSENT" || key === "INDEX_INSTANCE_ID")];
  for (const k of allowedKeys) {
    const v = body[k];
    if (typeof v === "string" && v.trim() && !v.startsWith("••••")) {
      await setSettingForProfile(profileId, k, v.trim());
    }
    if (v === "") await setSettingForProfile(profileId, k, "");
  }
  return NextResponse.json({ ok: true });
}

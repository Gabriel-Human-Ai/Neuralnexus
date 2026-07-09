export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const KEYS = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "GOOGLE_API_KEY", "DEEPSEEK_API_KEY", "CUSTOM_INSTRUCTIONS", "USER_PROFILE", "UI_COMPACT", "UI_FONTSIZE", "UI_ENTERSENDS", "MONTHLY_BUDGET_USD", "DAILY_BUDGET_USD", "BRAND_NAME", "BRAND_COLOR", "ROUTING_THRESHOLD", "PREFERRED_NAME", "UI_THEME", "PRIVACY_LEVEL", "COMPANY_CODENAMES", "FULL_NAME", "WORK_TYPE", "UI_BANNER_DISMISSED", "ORB_HUE", "ORB_SPEED", "ORB_MORPH", "ORB_GLOW", "ORB_INTENSITY", "ORB_BREATHING", "WIZARD_FLOATING_ENABLED", "WIZARD_HOME_ORB_ENABLED", "WIZARD_HOME_STATUS_ENABLED", "HOME_VIEW_MODE", "HOME_WIDGETS", "HOME_WIDGET_ORDER", "HOME_WIDGET_DENSITY"];

export async function GET() {
  try {
  const rows = await db.setting.findMany({ where: { key: { in: KEYS } } });
  // Never send full keys to the browser – only masked status.
  const out: Record<string, string> = {};
  for (const k of KEYS) {
    const v = rows.find(r => r.key === k)?.value ?? "";
    if (k.endsWith("_API_KEY")) out[k] = v ? `••••${v.slice(-4)}` : "";
    else out[k] = v;
  }
  return NextResponse.json(out);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  const body = await req.json();
  for (const k of KEYS) {
    const v = body[k];
    if (typeof v === "string" && v.trim() && !v.startsWith("••••")) {
      await db.setting.upsert({ where: { key: k }, update: { value: v.trim() }, create: { key: k, value: v.trim() } });
    }
    if (v === "") await db.setting.deleteMany({ where: { key: k } });
  }
  return NextResponse.json({ ok: true });
}

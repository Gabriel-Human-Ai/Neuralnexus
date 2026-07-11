const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();
const DEFAULT_WORK_PROFILE_ID = "default-work-profile";

const PROFILE_MODELS = [
  ["Project", "project"],
  ["Message", "message"],
  ["Memory", "memory"],
  ["ModelRun", "modelRun"],
  ["Agent", "agent"],
  ["Skill", "skill"],
  ["Workspace", "workspace"],
  ["WorkspaceMember", "workspaceMember"],
  ["Workflow", "workflow"],
  ["Output", "output"],
  ["CorrectionRecord", "correctionRecord"],
  ["DecisionRecord", "decisionRecord"],
  ["CaptureRecord", "captureRecord"],
  ["TasteRule", "tasteRule"],
  ["SkillRule", "skillRule"],
  ["BenchmarkRun", "benchmarkRun"],
  ["ModelPolicy", "modelPolicy"],
];

const PROFILE_SETTING_KEYS = [
  "CUSTOM_INSTRUCTIONS",
  "USER_PROFILE",
  "UI_COMPACT",
  "UI_FONTSIZE",
  "UI_ENTERSENDS",
  "UI_TRUST_MARKS",
  "MONTHLY_BUDGET_USD",
  "DAILY_BUDGET_USD",
  "BRAND_NAME",
  "BRAND_COLOR",
  "ROUTING_THRESHOLD",
  "PREFERRED_NAME",
  "UI_THEME",
  "PRIVACY_LEVEL",
  "COMPANY_CODENAMES",
  "FULL_NAME",
  "WORK_TYPE",
  "UI_BANNER_DISMISSED",
  "ORB_HUE",
  "ORB_SPEED",
  "ORB_MORPH",
  "ORB_GLOW",
  "ORB_INTENSITY",
  "ORB_BREATHING",
  "WIZARD_FLOATING_ENABLED",
  "WIZARD_HOME_ORB_ENABLED",
  "INDEX_CONSENT",
];

async function ensureDefaultWorkProfile(tx) {
  return tx.profile.upsert({
    where: { id: DEFAULT_WORK_PROFILE_ID },
    update: { name: "Work", type: "work", isDefault: true },
    create: { id: DEFAULT_WORK_PROFILE_ID, name: "Work", type: "work", isDefault: true },
  });
}

async function main() {
  const counts = {};
  await db.$transaction(async (tx) => {
    await ensureDefaultWorkProfile(tx);
    for (const [label, delegateName] of PROFILE_MODELS) {
      const result = await tx[delegateName].updateMany({
        where: { profileId: null },
        data: { profileId: DEFAULT_WORK_PROFILE_ID },
      });
      counts[label] = result.count;
    }
    const settings = await tx.setting.findMany({
      where: {
        OR: [
          { key: { in: PROFILE_SETTING_KEYS } },
          { key: { startsWith: "EYE_SYNTH_" } },
          { key: { startsWith: "EYE_SEEN_" } },
          { key: { startsWith: "WORKSPACE_STEPS_" } },
        ],
      },
    });
    let copiedSettings = 0;
    for (const setting of settings) {
      await tx.profileSetting.upsert({
        where: { profileId_key: { profileId: DEFAULT_WORK_PROFILE_ID, key: setting.key } },
        update: {},
        create: { profileId: DEFAULT_WORK_PROFILE_ID, key: setting.key, value: setting.value },
      });
      copiedSettings += 1;
    }
    counts.ProfileSetting = copiedSettings;
  });

  console.log("Default WORK profile backfill complete.");
  for (const [label] of PROFILE_MODELS) {
    console.log(`${label}: ${counts[label]} updated`);
  }
  console.log(`ProfileSetting: ${counts.ProfileSetting} ensured`);
}

main()
  .catch((error) => {
    console.error(`Backfill failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

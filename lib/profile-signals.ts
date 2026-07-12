import { db } from "@/lib/db";

export const PROFILE_DIMENSIONS = [
  "address_and_tone",
  "answer_style",
  "working_style",
  "visual_taste",
] as const;

export type ProfileDimension = (typeof PROFILE_DIMENSIONS)[number];

export type ProfileSignals = {
  profile: { id: string; name: string; type: string } | null;
  dimensions: Record<ProfileDimension, string[]>;
  counts: Record<ProfileDimension, number>;
  totalSignals: number;
};

const EMPTY_DIMENSIONS: Record<ProfileDimension, string[]> = {
  address_and_tone: [],
  answer_style: [],
  working_style: [],
  visual_taste: [],
};

function clean(value: string, max = 240) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function add(target: string[], value: string) {
  const signal = clean(value);
  if (signal && !target.includes(signal)) target.push(signal);
}

function isVisualContext(contextTag: string) {
  return /design|visual|image|brand|content|product|copy/i.test(contextTag);
}

export async function buildProfileSignals(profileId: string): Promise<ProfileSignals> {
  const [profile, settings, tasteRules, skillRules, corrections, decisions, captures] = await Promise.all([
    db.profile.findUnique({ where: { id: profileId }, select: { id: true, name: true, type: true } }),
    db.profileSetting.findMany({ where: { profileId, key: { in: ["PREFERRED_NAME", "CUSTOM_INSTRUCTIONS"] } }, select: { key: true, value: true } }),
    db.tasteRule.findMany({ where: { profileId, status: "active" }, orderBy: { createdAt: "desc" }, take: 80, select: { contextTag: true, text: true } }),
    db.skillRule.findMany({ where: { profileId, status: "active" }, orderBy: { createdAt: "desc" }, take: 80, select: { text: true } }),
    db.correctionRecord.findMany({ where: { profileId }, orderBy: { createdAt: "desc" }, take: 80, select: { warning: true, correctionText: true, domainTag: true } }),
    db.decisionRecord.findMany({ where: { profileId, status: "active" }, orderBy: { createdAt: "desc" }, take: 80, select: { contextTag: true, chosenDesc: true, rejectedDesc: true, medium: true, source: true, evidence: true } }),
    db.captureRecord.findMany({ where: { profileId, decision: { not: "" } }, orderBy: { createdAt: "desc" }, take: 40, select: { decision: true, decisionNote: true, captureType: true } }),
  ]);

  const dimensions: Record<ProfileDimension, string[]> = {
    address_and_tone: [],
    answer_style: [],
    working_style: [],
    visual_taste: [],
  };
  const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));

  if (settingMap.get("PREFERRED_NAME")) add(dimensions.address_and_tone, `Preferred name: ${settingMap.get("PREFERRED_NAME")}`);
  if (settingMap.get("CUSTOM_INSTRUCTIONS")) {
    add(dimensions.address_and_tone, `User instruction: ${settingMap.get("CUSTOM_INSTRUCTIONS")}`);
    add(dimensions.answer_style, `User instruction: ${settingMap.get("CUSTOM_INSTRUCTIONS")}`);
    add(dimensions.working_style, `User instruction: ${settingMap.get("CUSTOM_INSTRUCTIONS")}`);
  }

  for (const rule of tasteRules) {
    const destination = /tone|communication|voice|general/i.test(rule.contextTag)
      ? dimensions.address_and_tone
      : isVisualContext(rule.contextTag) ? dimensions.visual_taste : dimensions.answer_style;
    add(destination, rule.text);
  }

  for (const rule of skillRules) add(dimensions.working_style, rule.text);

  for (const correction of corrections) {
    const text = correction.warning || correction.correctionText;
    if (!text) continue;
    const destination = isVisualContext(correction.domainTag) ? dimensions.visual_taste : dimensions.working_style;
    add(destination, `Correction: ${text}`);
  }

  for (const decision of decisions) {
    const chosen = clean(decision.chosenDesc);
    const rejected = clean(decision.rejectedDesc);
    if (decision.source === "signal-reader") {
      if (PROFILE_DIMENSIONS.includes(decision.contextTag as ProfileDimension)) add(dimensions[decision.contextTag as ProfileDimension], chosen);
      continue;
    }
    const signal = rejected ? `Preferred: ${chosen} | Rejected: ${rejected}` : `Preferred: ${chosen}`;
    if (PROFILE_DIMENSIONS.includes(decision.contextTag as ProfileDimension)) add(dimensions[decision.contextTag as ProfileDimension], signal);
    else if (decision.medium !== "text" || isVisualContext(decision.contextTag)) add(dimensions.visual_taste, signal);
    else add(dimensions.answer_style, signal);
  }

  for (const capture of captures) {
    add(dimensions.visual_taste, `Reference ${capture.decision}: ${capture.decisionNote || capture.captureType}`);
  }

  const counts = PROFILE_DIMENSIONS.reduce((result, dimension) => {
    result[dimension] = dimensions[dimension].length;
    return result;
  }, {} as Record<ProfileDimension, number>);

  return { profile, dimensions, counts, totalSignals: PROFILE_DIMENSIONS.reduce((sum, dimension) => sum + counts[dimension], 0) };
}

import { db } from "@/lib/db";

type CreateProfileDecisionRecordArgs = {
  profileId: string;
  contextTag: string;
  chosenDesc: string;
  rejectedDesc?: string;
  medium?: string;
  source: string;
  note?: string;
  projectId?: string;
  outputId?: string;
};

function clean(value: string, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function createProfileDecisionRecord(args: CreateProfileDecisionRecordArgs) {
  return db.decisionRecord.create({
    data: {
      profileId: args.profileId,
      contextTag: clean(args.contextTag, 80) || "general",
      chosenDesc: clean(args.chosenDesc, 1500),
      rejectedDesc: clean(args.rejectedDesc ?? "", 1500),
      medium: clean(args.medium ?? "text", 40) || "text",
      source: clean(args.source, 80) || "manual",
      note: clean(args.note ?? "", 500),
      projectId: args.projectId,
      outputId: args.outputId,
    },
  });
}

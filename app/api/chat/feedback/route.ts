export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createProfileDecisionRecord } from "@/lib/decision-record";
import { buildProfileSignals, type ProfileDimension } from "@/lib/profile-signals";
import { resolveRequestProfileId } from "@/lib/scope";

const CHAT_SIGNALS = ["good", "bad", "shorter", "longer", "formal", "casual"] as const;
type ChatSignal = (typeof CHAT_SIGNALS)[number];

const SIGNAL_DIMENSION: Record<ChatSignal, ProfileDimension> = {
  good: "answer_style",
  bad: "answer_style",
  shorter: "answer_style",
  longer: "answer_style",
  formal: "address_and_tone",
  casual: "address_and_tone",
};

const PREFERENCE_COPY: Record<Exclude<ChatSignal, "good" | "bad">, string> = {
  shorter: "prefers shorter answers",
  longer: "prefers more detailed answers",
  formal: "prefers a more formal tone",
  casual: "prefers a more casual tone",
};

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function isChatSignal(value: unknown): value is ChatSignal {
  return CHAT_SIGNALS.includes(String(value) as ChatSignal);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!isChatSignal(body.signal)) {
      return NextResponse.json({ error: "Unknown feedback signal." }, { status: 400 });
    }

    const profileId = await resolveRequestProfileId(req, body.profileId);
    const signal: ChatSignal = body.signal;
    const messageContent = clean(body.messageContent, 4000);
    const userPrompt = clean(body.userPrompt, 1000);
    if (!messageContent) return NextResponse.json({ error: "Assistant message is required." }, { status: 400 });

    const chosenDesc = signal === "good"
      ? messageContent
      : signal === "bad"
        ? ""
        : PREFERENCE_COPY[signal as keyof typeof PREFERENCE_COPY];
    const rejectedDesc = signal === "bad" ? messageContent : signal === "good" ? "" : messageContent;

    await createProfileDecisionRecord({
      profileId,
      contextTag: SIGNAL_DIMENSION[signal],
      chosenDesc,
      rejectedDesc,
      medium: "text",
      source: "chat-feedback",
      note: userPrompt ? `${signal}: ${userPrompt}` : signal,
    });

    const profile = await buildProfileSignals(profileId);
    return NextResponse.json({ ok: true, totalSignals: profile.totalSignals, counts: profile.counts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Feedback could not be saved." }, { status: 500 });
  }
}

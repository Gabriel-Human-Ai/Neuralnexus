import { NextResponse } from "next/server";
import { buildProfileSignals, PROFILE_DIMENSIONS } from "@/lib/profile-signals";
import { pickMetaModel } from "@/lib/meta-model";
import { runChat } from "@/lib/providers";
import { estimateCost } from "@/lib/tokens";
import { db } from "@/lib/db";
import { profileScopeErrorResponse, resolveRequestProfileId } from "@/lib/scope";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You convert a person's learned preference signals into a concise instruction block they can paste into any AI assistant so it immediately adapts to them.
Write in second person addressed TO the AI ("Address the user as…", "Keep answers…", "Avoid…").
Cover only what the signals support: how to address them, tone and humor level, answer length and style, working preferences, and visual/aesthetic preferences for image or design generation.
Be specific and imperative. No preamble, no headings beyond short labels. Max 200 words.
Return ONLY the instruction text.`;

const READY_MESSAGE = "Keep using NeuralNexus — your profile needs a few more real choices before it’s worth exporting.";

function formatSignals(dimensions: Record<(typeof PROFILE_DIMENSIONS)[number], string[]>) {
  return PROFILE_DIMENSIONS
    .filter((dimension) => dimensions[dimension].length > 0)
    .map((dimension) => `${dimension.replaceAll("_", " ")}:\n${dimensions[dimension].map((signal) => `- ${signal}`).join("\n")}`)
    .join("\n\n");
}

export async function POST(req: Request) {
  try {
    const profileId = await resolveRequestProfileId(req);
    const profile = await buildProfileSignals(profileId);
    if (profile.totalSignals < 4) {
      return NextResponse.json({ code: "profile_not_ready", message: READY_MESSAGE, counts: profile.counts, totalSignals: profile.totalSignals }, { status: 409 });
    }

    const meta = await pickMetaModel();
    if (!meta) return NextResponse.json({ code: "no_api_key", message: "Connect one AI provider in Settings before exporting your profile." }, { status: 503 });

    const result = await runChat(meta.provider, meta.id, [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: formatSignals(profile.dimensions) },
    ], { temperature: 0, maxTokens: 320 });

    const project = await db.project.findFirst({ where: { profileId }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (project) {
      await db.modelRun.create({
        data: {
          profileId,
          projectId: project.id,
          provider: meta.provider,
          model: meta.id,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          costUsd: estimateCost(meta.id, result.inputTokens, result.outputTokens),
          purpose: "profile-export",
        },
      });
    }

    return NextResponse.json({ text: result.text.trim(), model: meta.id, provider: meta.provider, counts: profile.counts, totalSignals: profile.totalSignals });
  } catch (error) {
    return profileScopeErrorResponse(error) ?? NextResponse.json({ code: "profile_export_failed", message: error instanceof Error ? error.message : "Profile export failed" }, { status: 500 });
  }
}


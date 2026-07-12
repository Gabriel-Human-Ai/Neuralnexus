export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { pickModelForTask, runChatWithFallback, type ChatBlock, type ChatMsg } from "@/lib/providers";
import { resolveRequestProfileId } from "@/lib/scope";
import { buildProfileDirective, runSignalReaderForNotice } from "@/lib/living-profile";
import { withProviderProfile } from "@/lib/provider-scope";

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
};

type ClientAttachment = {
  kind: "text" | "image" | "pdf" | "file";
  name: string;
  preview?: string;
  dataUrl?: string;
};

function imageBlockFromDataUrl(dataUrl: string): ChatBlock | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { type: "image", mediaType: match[1], data: match[2] };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = await resolveRequestProfileId(req, body.profileId);
    const input = String(body.input ?? "").trim();
    const history = Array.isArray(body.messages) ? body.messages as ClientMessage[] : [];
    const attachments = Array.isArray(body.attachments) ? body.attachments as ClientAttachment[] : [];

    if (!input && attachments.length === 0) {
      return NextResponse.json({ error: "Write a message or attach a readable file." }, { status: 400 });
    }

    const attachmentNotes = attachments
      .filter((attachment) => attachment.kind !== "image")
      .map((attachment) => {
        if (attachment.kind === "text") return `File ${attachment.name}:\n${attachment.preview ?? ""}`;
        if (attachment.kind === "pdf") return `PDF ${attachment.name} is attached as metadata. PDF text extraction is not available in this chat yet.`;
        return `File ${attachment.name} is attached as metadata.`;
      })
      .join("\n\n");

    const imageBlocks = attachments
      .filter((attachment) => attachment.kind === "image" && attachment.dataUrl)
      .map((attachment) => imageBlockFromDataUrl(attachment.dataUrl!))
      .filter((block): block is ChatBlock => Boolean(block));

    const userText = [input, attachmentNotes].filter(Boolean).join("\n\n");
    const userContent: string | ChatBlock[] = imageBlocks.length
      ? [...imageBlocks, { type: "text", text: userText || "Please analyze the attached image." }]
      : userText;

    const profileDirective = await buildProfileDirective(profileId);
    const messages: ChatMsg[] = [
      {
        role: "system",
        content: [
          "You are the NeuralNexus Wizard. Answer directly and helpfully. You can answer general questions without forcing workspace creation. If the user asks for a product action, suggest the closest real NeuralNexus action. Do not claim to read PDFs unless text was provided.",
          profileDirective,
        ].filter(Boolean).join("\n\n"),
      },
      ...history.slice(-12).map((message) => ({ role: message.role, content: message.content }) as ChatMsg),
      { role: "user", content: userContent },
    ];

    const chosen = pickModelForTask(input || attachmentNotes || "general assistant question");
    const result = await withProviderProfile(profileId, () => runChatWithFallback(chosen, messages));
    const profileLearning = await runSignalReaderForNotice({ profileId, latestInput: input, history });
    return NextResponse.json({
      text: result.text,
      model: result.usedModel,
      fellBack: result.fellBack,
      profileMemories: profileLearning.memories,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Wizard chat failed." }, { status: 500 });
  }
}

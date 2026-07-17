import { streamText, type ModelMessage } from "ai";
import { getModel, hasAzureCreds } from "@/lib/azure";
import { COMPANION_SYSTEM, COMPANION_FIT_NUDGE } from "@/lib/prompts";
import { fallbackCompanionReply } from "@/lib/fallback";
import { fitNudgeSafetyNet } from "@/lib/signal";

export const maxDuration = 30;

interface IncomingMessage {
  role: "user" | "assistant";
  text: string;
}

function streamStringResponse(text: string): Response {
  // Emit the text word-by-word for a gentle, unhurried cadence.
  const encoder = new TextEncoder();
  const tokens = text.match(/\S+\s*/g) ?? [text];
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const tok of tokens) {
        controller.enqueue(encoder.encode(tok));
        await new Promise((r) => setTimeout(r, 28));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request): Promise<Response> {
  let messages: IncomingMessage[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    messages = [];
  }

  if (!hasAzureCreds()) {
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.text);
    return streamStringResponse(fallbackCompanionReply(userTexts));
  }

  try {
    const modelMessages: ModelMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.text,
    }));

    // The transition toward fit is the model's own judgement call (see PHASE
    // DISCIPLINE in COMPANION_SYSTEM): it softens the conversation toward what kind
    // of support would help once it reads that the person feels heard. This hidden
    // nudge is only a SAFETY NET — if the model is still circling in "feeling heard"
    // after several substantive turns, we slip it in to gently break the loop. It is
    // invisible to the person and never rendered as a step.
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.text);
    const system = fitNudgeSafetyNet(userTexts)
      ? `${COMPANION_SYSTEM}\n\n${COMPANION_FIT_NUDGE}`
      : COMPANION_SYSTEM;

    const result = streamText({
      model: getModel(),
      system,
      messages: modelMessages,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[/api/chat] falling back:", err);
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.text);
    return streamStringResponse(fallbackCompanionReply(userTexts));
  }
}

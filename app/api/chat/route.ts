import { streamText, type ModelMessage } from "ai";
import { getModel, hasAzureCreds } from "@/lib/azure";
import {
  COMPANION_SYSTEM,
  COMPANION_GREETING,
  COMPANION_FIT_NUDGE,
  FIT_NUDGE_AFTER_USER_TURNS,
  GREETING_TRIGGER,
} from "@/lib/prompts";
import { fallbackCompanionReply, fallbackOpening } from "@/lib/fallback";

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

  // The very first exchange has no prior messages: Huey opens the conversation.
  // The greeting is generated live (via COMPANION_GREETING) so it feels human and
  // varies each visit, instead of a canned line.
  const isOpening = messages.length === 0;

  if (!hasAzureCreds()) {
    if (isOpening) return streamStringResponse(fallbackOpening());
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.text);
    return streamStringResponse(fallbackCompanionReply(userTexts));
  }

  try {
    const modelMessages: ModelMessage[] = isOpening
      ? [{ role: "user", content: GREETING_TRIGGER }]
      : messages.map((m) => ({
          role: m.role,
          content: m.text,
        }));

    // Opening turn: hand the model the greeting instruction. Otherwise, once the
    // person has opened up for a bit, append a hidden nudge so the same
    // conversation can drift toward what kind of support would help. Both are
    // invisible to the person and never rendered as a step.
    const userTurns = messages.filter((m) => m.role === "user").length;
    const system = isOpening
      ? `${COMPANION_SYSTEM}\n\n${COMPANION_GREETING}`
      : userTurns >= FIT_NUDGE_AFTER_USER_TURNS
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
    if (isOpening) return streamStringResponse(fallbackOpening());
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.text);
    return streamStringResponse(fallbackCompanionReply(userTexts));
  }
}

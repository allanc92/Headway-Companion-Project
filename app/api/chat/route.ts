import { streamText, type ModelMessage } from "ai";
import { getModel, hasAzureCreds } from "@/lib/azure";
import {
  COMPANION_SYSTEM,
  COMPANION_GREETING,
  COMPANION_FIT_NUDGE,
  GREETING_TRIGGER,
} from "@/lib/prompts";
import {
  SUMMARY_CONTINUE_ACKNOWLEDGMENT,
  SUMMARY_READINESS_PROMPT,
} from "@/lib/copy";
import { fallbackCompanionReply, fallbackOpening } from "@/lib/fallback";
import { fitNudgeSafetyNet, mirrorSafetyNet } from "@/lib/signal";
import { MIRROR_READY_MARKER } from "@/lib/types";

export const maxDuration = 30;

interface IncomingMessage {
  role: "user" | "assistant";
  text: string;
  excludeFromSynthesis?: boolean;
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
  const readinessWindowStart = messages.reduce(
    (start, message, index) =>
      message.excludeFromSynthesis ? index + 1 : start,
    0,
  );
  const userTexts = messages
    .slice(readinessWindowStart)
    .filter((m) => m.role === "user")
    .map((m) => m.text);
  const lastMessage = messages[messages.length - 1];
  const continuingAfterOffer =
    lastMessage?.role === "user" &&
    lastMessage.excludeFromSynthesis === true;

  if (!hasAzureCreds()) {
    if (isOpening) return streamStringResponse(fallbackOpening());
    if (continuingAfterOffer) {
      return streamStringResponse(SUMMARY_CONTINUE_ACKNOWLEDGMENT);
    }
    return streamStringResponse(fallbackCompanionReply(userTexts));
  }

  // If the live model keeps circling past the safety-net threshold, emit one
  // coherent consent turn instead of another exploratory question.
  if (!isOpening && mirrorSafetyNet(userTexts)) {
    return streamStringResponse(
      `${SUMMARY_READINESS_PROMPT}\n${MIRROR_READY_MARKER}`,
    );
  }

  try {
    const modelMessages: ModelMessage[] = isOpening
      ? [{ role: "user", content: GREETING_TRIGGER }]
      : messages.map((m) => ({
          role: m.role,
          content: m.text,
        }));

    // Opening turn: hand the model the greeting instruction. Otherwise the shift
    // toward fit is the model's own judgement call (see PHASE DISCIPLINE in
    // COMPANION_SYSTEM); this hidden nudge is only a SAFETY NET, slipped in if the
    // model is still circling in "feeling heard" after several substantive turns.
    // Both are invisible to the person and never rendered as a step.
    const system = isOpening
      ? `${COMPANION_SYSTEM}\n\n${COMPANION_GREETING}`
      : fitNudgeSafetyNet(userTexts)
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
    if (continuingAfterOffer) {
      return streamStringResponse(SUMMARY_CONTINUE_ACKNOWLEDGMENT);
    }
    return streamStringResponse(fallbackCompanionReply(userTexts));
  }
}

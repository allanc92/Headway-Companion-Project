import { streamText, type ModelMessage } from "ai";
import { getModel, hasAzureCreds } from "@/lib/azure";
import {
  COMPANION_SYSTEM,
  COMPANION_FIT_NUDGE,
  GREETING_TRIGGER,
  companionGreeting,
} from "@/lib/prompts";
import { isVoiceEnabled } from "@/lib/realtime";
import {
  SUMMARY_CONTINUE_ACKNOWLEDGMENT,
  SUMMARY_READINESS_PROMPT,
} from "@/lib/copy";
import { fallbackCompanionReply, fallbackOpening } from "@/lib/fallback";
import {
  errorType,
  getRequestId,
  logApiEvent,
  withRequestId,
} from "@/lib/api-observability";
import { fitNudgeSafetyNet, mirrorSafetyNet } from "@/lib/signal";
import { MIRROR_READY_MARKER } from "@/lib/types";

export const maxDuration = 30;
const ACTIVITY = "companion-response";

interface IncomingMessage {
  role: "user" | "assistant";
  text: string;
  excludeFromSynthesis?: boolean;
}

interface StreamCompletion {
  finishReason: string;
  usage: unknown;
}

type StreamMode = "azure" | "fallback" | "safety-net";

function streamResponse(
  requestId: string,
  startedAt: number,
  mode: StreamMode,
  produce: (emitDelta: (text: string) => boolean) => Promise<StreamCompletion>,
): Response {
  const encoder = new TextEncoder();
  let cancelled = false;
  let outputChunkCount = 0;
  let outputCharacterCount = 0;

  const encodeEvent = (event: object) =>
    encoder.encode(`${JSON.stringify(event)}\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const completion = await produce((text) => {
          if (cancelled) return false;
          if (text.length > 0) {
            outputChunkCount += 1;
            outputCharacterCount += text.length;
            if (outputChunkCount === 1) {
              logApiEvent("/api/chat", "info", {
                activity: ACTIVITY,
                event: "first-output",
                requestId,
                mode,
                elapsedMs: Date.now() - startedAt,
              });
            }
          }
          controller.enqueue(encodeEvent({ type: "delta", text }));
          return true;
        });
        if (cancelled) return;

        const elapsedMs = Date.now() - startedAt;
        controller.enqueue(
          encodeEvent({
            type: "done",
            requestId,
            finishReason: completion.finishReason,
            usage: completion.usage,
            elapsedMs,
          }),
        );
        logApiEvent("/api/chat", "info", {
          activity: ACTIVITY,
          event: "done",
          requestId,
          mode,
          finishReason: completion.finishReason,
          outputChunkCount,
          outputCharacterCount,
          elapsedMs,
        });
      } catch (error) {
        const elapsedMs = Date.now() - startedAt;
        logApiEvent("/api/chat", "error", {
          activity: ACTIVITY,
          event: "stream-error",
          requestId,
          mode,
          errorType: errorType(error),
          outputChunkCount,
          outputCharacterCount,
          elapsedMs,
        });
        if (!cancelled) {
          controller.enqueue(
            encodeEvent({
              type: "error",
              requestId,
              message: "The companion response was interrupted.",
            }),
          );
        }
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
      logApiEvent("/api/chat", "info", {
        activity: ACTIVITY,
        event: "cancelled",
        requestId,
        mode,
        outputChunkCount,
        outputCharacterCount,
        elapsedMs: Date.now() - startedAt,
      });
    },
  });

  return new Response(stream, {
    headers: withRequestId(requestId, {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    }),
  });
}

function streamStringResponse(
  text: string,
  requestId: string,
  startedAt: number,
  mode: Exclude<StreamMode, "azure">,
): Response {
  return streamResponse(requestId, startedAt, mode, async (emitDelta) => {
    // Emit the text word-by-word for a gentle, unhurried cadence.
    const tokens = text.match(/\S+\s*/g) ?? [text];
    for (const token of tokens) {
      if (!emitDelta(token)) break;
      await new Promise((resolve) => setTimeout(resolve, 28));
    }
    return { finishReason: "stop", usage: null };
  });
}

export async function POST(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
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
  const hasLiveModel = hasAzureCreds();
  const voiceEnabled = isVoiceEnabled();

  logApiEvent("/api/chat", "info", {
    activity: ACTIVITY,
    event: "request",
    requestId,
    mode: hasLiveModel ? "azure" : "fallback",
    messageCount: messages.length,
    isOpening,
    voiceEnabled,
  });

  if (!hasLiveModel) {
    if (isOpening) {
      return streamStringResponse(
        fallbackOpening(voiceEnabled),
        requestId,
        startedAt,
        "fallback",
      );
    }
    if (continuingAfterOffer) {
      return streamStringResponse(
        SUMMARY_CONTINUE_ACKNOWLEDGMENT,
        requestId,
        startedAt,
        "fallback",
      );
    }
    return streamStringResponse(
      fallbackCompanionReply(userTexts),
      requestId,
      startedAt,
      "fallback",
    );
  }

  // If the live model keeps circling past the safety-net threshold, emit one
  // coherent consent turn instead of another exploratory question.
  if (!isOpening && mirrorSafetyNet(userTexts)) {
    return streamStringResponse(
      `${SUMMARY_READINESS_PROMPT}\n${MIRROR_READY_MARKER}`,
      requestId,
      startedAt,
      "safety-net",
    );
  }

  try {
    const modelMessages: ModelMessage[] = isOpening
      ? [{ role: "user", content: GREETING_TRIGGER }]
      : messages.map((m) => ({
          role: m.role,
          content: m.text,
        }));

    // Opening turn: lead with the greeting instruction. Otherwise the shift
    // toward fit is the model's own judgement call (see PHASE DISCIPLINE in
    // COMPANION_SYSTEM); this hidden nudge is only a SAFETY NET, slipped in if the
    // model is still circling in "feeling heard" after several substantive turns.
    // Both are invisible to the person and never rendered as a step.
    const system = isOpening
      ? `${companionGreeting(voiceEnabled)}\n\n${COMPANION_SYSTEM}`
      : fitNudgeSafetyNet(userTexts)
        ? `${COMPANION_SYSTEM}\n\n${COMPANION_FIT_NUDGE}`
        : COMPANION_SYSTEM;

    const result = streamText({
      model: getModel(),
      system,
      messages: modelMessages,
    });

    return streamResponse(
      requestId,
      startedAt,
      "azure",
      async (emitDelta) => {
        for await (const text of result.textStream) {
          if (!emitDelta(text)) {
            return { finishReason: "cancelled", usage: null };
          }
        }
        const [finishReason, usage] = await Promise.all([
          result.finishReason,
          result.usage,
        ]);
        return { finishReason, usage };
      },
    );
  } catch (error) {
    logApiEvent("/api/chat", "error", {
      activity: ACTIVITY,
      event: "provider-init-error",
      requestId,
      errorType: errorType(error),
      elapsedMs: Date.now() - startedAt,
    });
    if (isOpening) {
      return streamStringResponse(
        fallbackOpening(voiceEnabled),
        requestId,
        startedAt,
        "fallback",
      );
    }
    if (continuingAfterOffer) {
      return streamStringResponse(
        SUMMARY_CONTINUE_ACKNOWLEDGMENT,
        requestId,
        startedAt,
        "fallback",
      );
    }
    return streamStringResponse(
      fallbackCompanionReply(userTexts),
      requestId,
      startedAt,
      "fallback",
    );
  }
}

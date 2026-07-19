import { generateObject } from "ai";
import { z } from "zod";
import { getModel, hasAzureCreds } from "@/lib/azure";
import {
  errorType,
  getRequestId,
  jsonWithRequestId,
  logApiEvent,
} from "@/lib/api-observability";
import { buildSynthesisPrompt } from "@/lib/prompts";
import { fallbackSynthesis } from "@/lib/fallback";
import { FOCUS_AREAS, SPECTRUM_META, type Synthesis } from "@/lib/types";

export const maxDuration = 30;
const ACTIVITY = "summary-creation";

interface IncomingMessage {
  role: "user" | "assistant";
  text: string;
}

const focusEnum = z.enum(FOCUS_AREAS as unknown as [string, ...string[]]);

const synthesisSchema = z.object({
  reflection: z.string(),
  priorities: z
    .array(
      z.object({
        title: z.string(),
        sourceQuote: z.string(),
        description: z.string(),
        focusTags: z.array(focusEnum).min(1).max(3),
      }),
    )
    .min(3)
    .max(5),
  spectrums: z
    .array(
      z.object({
        id: z.enum(["action_space", "structure", "depth"]),
        value: z.number().min(0).max(100),
        note: z.string(),
      }),
    )
    .length(3),
});

function buildTranscript(messages: IncomingMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "Person" : "Companion"}: ${m.text}`)
    .join("\n");
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

  const transcript = buildTranscript(messages);
  const hasLiveModel = hasAzureCreds();

  logApiEvent("/api/synthesize", "info", {
    activity: ACTIVITY,
    event: "request",
    requestId,
    mode: hasLiveModel ? "azure" : "fallback",
    messageCount: messages.length,
  });

  if (!hasLiveModel) {
    const synthesis = fallbackSynthesis(transcript);
    logApiEvent("/api/synthesize", "info", {
      activity: ACTIVITY,
      event: "done",
      requestId,
      mode: "fallback",
      priorityCount: synthesis.priorities.length,
      elapsedMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(synthesis, requestId);
  }

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: synthesisSchema,
      prompt: buildSynthesisPrompt(transcript, FOCUS_AREAS),
      temperature: 0.4,
    });

    const synthesis: Synthesis = {
      reflection: object.reflection,
      priorities: object.priorities.map((p, i) => ({
        id: `p-${i}`,
        title: p.title,
        sourceQuote: p.sourceQuote,
        description: p.description,
        focusTags: p.focusTags,
      })),
      spectrums: object.spectrums.map((s) => ({
        id: s.id,
        value: s.value,
        note: s.note,
        leftLabel: SPECTRUM_META[s.id].leftLabel,
        rightLabel: SPECTRUM_META[s.id].rightLabel,
      })),
    };

    logApiEvent("/api/synthesize", "info", {
      activity: ACTIVITY,
      event: "done",
      requestId,
      mode: "azure",
      priorityCount: synthesis.priorities.length,
      elapsedMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(synthesis, requestId);
  } catch (error) {
    logApiEvent("/api/synthesize", "error", {
      activity: ACTIVITY,
      event: "provider-error",
      requestId,
      mode: "azure",
      errorType: errorType(error),
      elapsedMs: Date.now() - startedAt,
    });
    const synthesis = fallbackSynthesis(transcript);
    logApiEvent("/api/synthesize", "info", {
      activity: ACTIVITY,
      event: "done",
      requestId,
      mode: "fallback",
      fallbackReason: "provider-error",
      priorityCount: synthesis.priorities.length,
      elapsedMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(synthesis, requestId);
  }
}

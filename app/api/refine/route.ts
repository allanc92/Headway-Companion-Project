import { generateObject } from "ai";
import { z } from "zod";
import { getModel, hasAzureCreds } from "@/lib/azure";
import {
  errorType,
  getRequestId,
  jsonWithRequestId,
  logApiEvent,
} from "@/lib/api-observability";
import { buildRefinePrompt } from "@/lib/prompts";
import { fallbackRefine } from "@/lib/fallback";
import { FOCUS_AREAS, SPECTRUM_META, type Synthesis } from "@/lib/types";

export const maxDuration = 30;
const ACTIVITY = "summary-refinement";

interface IncomingMessage {
  role: "user" | "assistant";
  text: string;
}

const focusEnum = z.enum(FOCUS_AREAS as unknown as [string, ...string[]]);

const refineSchema = z.object({
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
  acknowledgment: z.string(),
});

function buildTranscript(messages: IncomingMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "Person" : "Companion"}: ${m.text}`)
    .join("\n");
}

function readSynthesis(value: unknown): Synthesis {
  const maybe = value as Partial<Synthesis> | null | undefined;
  return {
    reflection: typeof maybe?.reflection === "string" ? maybe.reflection : "",
    priorities: Array.isArray(maybe?.priorities) ? maybe.priorities : [],
    spectrums: Array.isArray(maybe?.spectrums) ? maybe.spectrums : [],
  };
}

export async function POST(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
  let messages: IncomingMessage[] = [];
  let current: Synthesis = { reflection: "", priorities: [], spectrums: [] };

  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    current = readSynthesis(body?.synthesis);
  } catch {
    messages = [];
  }

  const transcript = buildTranscript(messages);
  const hasLiveModel = hasAzureCreds();

  logApiEvent("/api/refine", "info", {
    activity: ACTIVITY,
    event: "request",
    requestId,
    mode: hasLiveModel ? "azure" : "fallback",
    messageCount: messages.length,
    currentPriorityCount: current.priorities.length,
  });

  if (!hasLiveModel) {
    const refinement = fallbackRefine(transcript, current);
    logApiEvent("/api/refine", "info", {
      activity: ACTIVITY,
      event: "done",
      requestId,
      mode: "fallback",
      priorityCount: refinement.priorities.length,
      elapsedMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(refinement, requestId);
  }

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: refineSchema,
      prompt: buildRefinePrompt(
        transcript,
        JSON.stringify(current, null, 2),
        FOCUS_AREAS,
      ),
    });

    const refinement = {
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
      acknowledgment: object.acknowledgment,
    };

    logApiEvent("/api/refine", "info", {
      activity: ACTIVITY,
      event: "done",
      requestId,
      mode: "azure",
      priorityCount: refinement.priorities.length,
      elapsedMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(refinement, requestId);
  } catch (error) {
    logApiEvent("/api/refine", "error", {
      activity: ACTIVITY,
      event: "provider-error",
      requestId,
      mode: "azure",
      errorType: errorType(error),
      elapsedMs: Date.now() - startedAt,
    });
    const refinement = fallbackRefine(transcript, current);
    logApiEvent("/api/refine", "info", {
      activity: ACTIVITY,
      event: "done",
      requestId,
      mode: "fallback",
      fallbackReason: "provider-error",
      priorityCount: refinement.priorities.length,
      elapsedMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(refinement, requestId);
  }
}

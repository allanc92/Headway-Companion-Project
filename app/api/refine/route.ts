import { generateObject } from "ai";
import { z } from "zod";
import { getModel, hasAzureCreds } from "@/lib/azure";
import { buildRefinePrompt } from "@/lib/prompts";
import { fallbackRefine } from "@/lib/fallback";
import { FOCUS_AREAS, SPECTRUM_META, type Synthesis } from "@/lib/types";

export const maxDuration = 30;

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

  if (!hasAzureCreds()) {
    return Response.json(fallbackRefine(transcript, current));
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
      temperature: 0.35,
    });

    return Response.json({
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
    });
  } catch (err) {
    console.error("[/api/refine] falling back:", err);
    return Response.json(fallbackRefine(transcript, current));
  }
}

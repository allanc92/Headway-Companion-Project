import { generateObject } from "ai";
import { z } from "zod";
import { getModel, hasAzureCreds } from "@/lib/azure";
import { buildSynthesisPrompt } from "@/lib/prompts";
import { fallbackSynthesis } from "@/lib/fallback";
import { FOCUS_AREAS, SPECTRUM_META, type Synthesis } from "@/lib/types";

export const maxDuration = 30;

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
  let messages: IncomingMessage[] = [];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    messages = [];
  }

  const transcript = buildTranscript(messages);

  if (!hasAzureCreds()) {
    return Response.json(fallbackSynthesis(transcript));
  }

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: synthesisSchema,
      prompt: buildSynthesisPrompt(transcript, FOCUS_AREAS),
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

    return Response.json(synthesis);
  } catch (err) {
    console.error("[/api/synthesize] falling back:", err);
    return Response.json(fallbackSynthesis(transcript));
  }
}

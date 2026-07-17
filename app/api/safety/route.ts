import { generateObject } from "ai";
import { z } from "zod";
import { getModel, hasAzureCreds } from "@/lib/azure";
import { SAFETY_SYSTEM } from "@/lib/prompts";
import { fallbackSafety } from "@/lib/fallback";

export const maxDuration = 15;

const safetySchema = z.object({
  tier: z.number().int().min(0).max(3),
  category: z.enum([
    "none",
    "distress",
    "self-harm",
    "harm-to-others",
    "abuse",
    "medical",
    "other",
  ]),
  rationale: z.string(),
});

export async function POST(req: Request): Promise<Response> {
  let text = "";
  let context = "";
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text : "";
    context = typeof body?.context === "string" ? body.context : "";
  } catch {
    /* ignore */
  }

  if (!text.trim()) {
    return Response.json({ tier: 0, category: "none", rationale: "Empty message." });
  }

  if (!hasAzureCreds()) {
    return Response.json(fallbackSafety(text));
  }

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: safetySchema,
      system: SAFETY_SYSTEM,
      prompt: `Prior context (may be empty):\n${context}\n\nClassify ONLY this newest patient message:\n"""${text}"""`,
      temperature: 0,
    });
    return Response.json(object);
  } catch (err) {
    console.error("[/api/safety] falling back:", err);
    return Response.json(fallbackSafety(text));
  }
}

import { generateText } from "ai";
import { getModel, hasAzureCreds } from "@/lib/azure";
import { matchProviders } from "@/lib/providers";
import { buildMatchReasonPrompt } from "@/lib/prompts";
import { fallbackMatchReason } from "@/lib/fallback";
import type {
  IntakeContext,
  MatchResult,
  Priority,
  ScoredProvider,
  Spectrum,
} from "@/lib/types";

export const maxDuration = 30;

const BLURB_COUNT = 4;

function prioritiesToText(priorities: Priority[]): string {
  return priorities.map((p) => p.title).join("; ") || "feeling understood and supported";
}

function spectrumsToText(spectrums: Spectrum[]): string {
  return (
    spectrums
      .map((s) => {
        const leaning = s.value >= 50 ? s.rightLabel : s.leftLabel;
        return leaning;
      })
      .join(", ") || "a balanced approach"
  );
}

async function writeBlurb(
  sp: ScoredProvider,
  prioritiesText: string,
  spectrumsText: string,
): Promise<string> {
  try {
    const { text } = await generateText({
      model: getModel(),
      prompt: buildMatchReasonPrompt(
        sp.provider.name,
        `${sp.provider.bio} Modalities: ${sp.provider.modalities.join(", ")}. Focus: ${sp.provider.specialties.join(", ")}.`,
        prioritiesText,
        spectrumsText,
      ),
      temperature: 0.6,
      maxOutputTokens: 80,
    });
    return text.trim().replace(/^["']|["']$/g, "") || fallbackMatchReason(sp.provider.name);
  } catch {
    return fallbackMatchReason(sp.provider.name);
  }
}

export async function POST(req: Request): Promise<Response> {
  let context: IntakeContext = { zip: "", insurance: "" };
  let priorities: Priority[] = [];
  let spectrums: Spectrum[] = [];
  try {
    const body = await req.json();
    if (body?.context) context = body.context;
    if (Array.isArray(body?.priorities)) priorities = body.priorities;
    if (Array.isArray(body?.spectrums)) spectrums = body.spectrums;
  } catch {
    /* use defaults */
  }

  const result: MatchResult = matchProviders(context, priorities, spectrums);

  const prioritiesText = prioritiesToText(priorities);
  const spectrumsText = spectrumsToText(spectrums);

  if (hasAzureCreds()) {
    const top = result.matches.slice(0, BLURB_COUNT);
    const blurbs = await Promise.all(
      top.map((sp) => writeBlurb(sp, prioritiesText, spectrumsText)),
    );
    top.forEach((sp, i) => {
      sp.whyThisFits = blurbs[i];
    });
    result.matches.slice(BLURB_COUNT).forEach((sp) => {
      sp.whyThisFits = fallbackMatchReason(sp.provider.name);
    });
  } else {
    result.matches.forEach((sp) => {
      sp.whyThisFits = fallbackMatchReason(sp.provider.name);
    });
  }

  return Response.json(result);
}

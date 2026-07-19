import { generateText } from "ai";
import { getModel, hasAzureCreds } from "@/lib/azure";
import {
  errorType,
  getRequestId,
  jsonWithRequestId,
  logApiEvent,
} from "@/lib/api-observability";
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
const ACTIVITY = "therapist-matching";

interface BlurbResult {
  text: string;
  generated: boolean;
}

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
  requestId: string,
  matchRank: number,
  startedAt: number,
): Promise<BlurbResult> {
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
    const cleaned = text.trim().replace(/^["']|["']$/g, "");
    if (cleaned) return { text: cleaned, generated: true };

    logApiEvent("/api/match", "warn", {
      activity: ACTIVITY,
      event: "enrichment-fallback",
      requestId,
      mode: "azure",
      matchRank,
      reason: "empty-output",
      elapsedMs: Date.now() - startedAt,
    });
    return {
      text: fallbackMatchReason(sp.provider.name),
      generated: false,
    };
  } catch (error) {
    logApiEvent("/api/match", "warn", {
      activity: ACTIVITY,
      event: "enrichment-fallback",
      requestId,
      mode: "azure",
      matchRank,
      reason: "provider-error",
      errorType: errorType(error),
      elapsedMs: Date.now() - startedAt,
    });
    return {
      text: fallbackMatchReason(sp.provider.name),
      generated: false,
    };
  }
}

export async function POST(req: Request): Promise<Response> {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
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

  const hasLiveModel = hasAzureCreds();
  logApiEvent("/api/match", "info", {
    activity: ACTIVITY,
    event: "request",
    requestId,
    mode: hasLiveModel ? "azure" : "fallback",
    priorityCount: priorities.length,
    spectrumCount: spectrums.length,
  });

  try {
    const result: MatchResult = matchProviders(context, priorities, spectrums);
    const prioritiesText = prioritiesToText(priorities);
    const spectrumsText = spectrumsToText(spectrums);
    let generatedBlurbCount = 0;
    let blurbFailureCount = 0;

    if (hasLiveModel) {
      const top = result.matches.slice(0, BLURB_COUNT);
      const blurbs = await Promise.all(
        top.map((sp, index) =>
          writeBlurb(
            sp,
            prioritiesText,
            spectrumsText,
            requestId,
            index + 1,
            startedAt,
          ),
        ),
      );
      top.forEach((sp, index) => {
        sp.whyThisFits = blurbs[index].text;
        if (blurbs[index].generated) {
          generatedBlurbCount += 1;
        } else {
          blurbFailureCount += 1;
        }
      });
      result.matches.slice(BLURB_COUNT).forEach((sp) => {
        sp.whyThisFits = fallbackMatchReason(sp.provider.name);
      });
    } else {
      result.matches.forEach((sp) => {
        sp.whyThisFits = fallbackMatchReason(sp.provider.name);
      });
    }

    logApiEvent("/api/match", "info", {
      activity: ACTIVITY,
      event: "done",
      requestId,
      mode: hasLiveModel ? "azure" : "fallback",
      matchCount: result.matches.length,
      generatedBlurbCount,
      scriptedBlurbCount: result.matches.length - generatedBlurbCount,
      blurbFailureCount,
      elapsedMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(result, requestId);
  } catch (error) {
    logApiEvent("/api/match", "error", {
      activity: ACTIVITY,
      event: "route-error",
      requestId,
      mode: hasLiveModel ? "azure" : "fallback",
      errorType: errorType(error),
      elapsedMs: Date.now() - startedAt,
    });
    throw error;
  }
}

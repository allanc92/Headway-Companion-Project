"use client";

import { ProviderCard } from "./ProviderCard";
import { SparkIcon } from "@/components/ui/icons";
import { NO_INSURANCE_VALUES } from "@/lib/providers";
import type { IntakeContext, MatchResult } from "@/lib/types";

export function ProviderResults({
  result,
  context,
  onChoose,
}: {
  result: MatchResult;
  context: IntakeContext;
  onChoose: (providerId: string) => void;
}) {
  const hasInsurance = !NO_INSURANCE_VALUES.includes(context.insurance);
  const subParts: string[] = [`${result.totalInNetwork} in network`];
  if (hasInsurance) subParts.push(`with ${context.insurance}`);
  if (context.zip) subParts.push(`near ${context.zip}`);

  return (
    <div className="space-y-6 py-8">
      <header className="animate-rise">
        <p className="text-sm font-medium text-feather">Your honest map</p>
        <h1 className="mt-2 font-serif text-[1.7rem] leading-snug text-ink sm:text-[2rem]">
          Therapists who fit what you shared.
        </h1>
        <p className="mt-2 text-sm text-ink-soft">{subParts.join(" · ")}</p>
      </header>

      {result.bottleneck.kind !== "none" && result.bottleneck.message && (
        <div className="animate-rise rounded-3xl border border-mint-200 bg-mint/40 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-feather">
              <SparkIcon width={17} height={17} />
            </span>
            <div>
              <p className="font-medium text-ink">One honest note</p>
              <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-soft">
                {result.bottleneck.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {result.matches.length > 0 ? (
        <div className="space-y-4">
          {result.matches.map((scored) => (
            <div key={scored.provider.id} className="animate-rise">
              <ProviderCard
                scored={scored}
                context={context}
                onChoose={() => onChoose(scored.provider.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-line bg-white/80 p-6 text-center">
          <p className="font-serif text-lg text-ink">
            No exact matches inside these constraints yet.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            That&apos;s not a dead end — it usually means one filter is doing all the
            narrowing. Broadening your insurance or opening up to telehealth is the fastest
            way to meet someone who truly fits.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { CheckIcon } from "@/components/ui/icons";
import { ProviderAvatar } from "./ProviderAvatar";
import { NO_INSURANCE_VALUES } from "@/lib/providers";
import type { IntakeContext, ScoredProvider } from "@/lib/types";

const AVAIL: Record<string, { label: string; dot: string }> = {
  open: { label: "Open this week", dot: "var(--color-brand)" },
  limited: { label: "Limited availability", dot: "var(--color-mustard)" },
  waitlist: { label: "Short waitlist", dot: "var(--color-coral)" },
};

function matchLabel(score: number): string {
  if (score >= 80) return "Strong match";
  if (score >= 65) return "Good match";
  return "Worth a look";
}

export function ProviderCard({
  scored,
  context,
  onChoose,
}: {
  scored: ScoredProvider;
  context: IntakeContext;
  onChoose: () => void;
}) {
  const { provider, score, reasons, whyThisFits } = scored;
  const avail = AVAIL[provider.availability] ?? AVAIL.open;
  const showInNetwork =
    !NO_INSURANCE_VALUES.includes(context.insurance) &&
    provider.insuranceAccepted.includes(context.insurance);

  return (
    <div className="flex h-full min-h-[34rem] w-full flex-col overflow-hidden rounded-3xl border border-hairline bg-surface/95 shadow-[0_12px_32px_rgba(47,90,134,0.08)] transition-shadow hover:shadow-[0_16px_40px_rgba(47,90,134,0.12)]">
      <div className="h-40 w-full shrink-0 overflow-hidden rounded-b-[2rem] border-b border-hairline">
        <ProviderAvatar
          name={provider.name}
          seed={provider.photoSeed}
          className="h-full w-full"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-serif text-xl leading-tight text-ink">{provider.name}</h3>
          <span className="text-sm font-medium text-forest">{matchLabel(score)}</span>
        </div>

        <p className="text-sm text-ink-muted">
          {provider.title}
          {provider.pronouns ? ` · ${provider.pronouns}` : ""}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {showInNetwork && (
            <span className="inline-flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 text-[0.72rem] font-medium text-forest-700">
              <CheckIcon width={13} height={13} /> In network with {context.insurance}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[0.72rem] font-medium text-ink-muted">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: avail.dot }}
            />
            {avail.label}
          </span>
        </div>

        {whyThisFits && (
          <p className="mt-4 rounded-2xl bg-mint-soft/80 px-4 py-3 text-[0.95rem] leading-relaxed text-ink">
            {whyThisFits}
          </p>
        )}

        {reasons.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <li
                key={r}
                className="rounded-full border border-hairline px-2.5 py-1 text-[0.72rem] text-ink-muted"
              >
                {r}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[0.85rem] leading-relaxed text-ink-muted">
          {provider.modalities.join(" · ")} · Next available{" "}
          {provider.nextAvailable.toLowerCase()}
        </p>

        <button
          type="button"
          onClick={onChoose}
          className="mt-auto flex w-full items-center justify-center rounded-2xl border border-forest px-4 py-2.5 font-medium text-forest transition-colors hover:bg-forest hover:text-mint focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/35"
        >
          Choose {provider.name.split(/\s+/)[0]}
        </button>
      </div>
    </div>
  );
}

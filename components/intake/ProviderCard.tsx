"use client";

import { CheckIcon } from "@/components/ui/icons";
import { NO_INSURANCE_VALUES } from "@/lib/providers";
import type { IntakeContext, ScoredProvider } from "@/lib/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
}

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
    <div className="rounded-3xl border border-line bg-white/90 p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-forest text-lg font-semibold uppercase text-mint">
          {initials(provider.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="font-serif text-xl text-ink">{provider.name}</h3>
            <span className="text-sm font-medium text-forest">{matchLabel(score)}</span>
          </div>
          <p className="text-sm text-ink-soft">
            {provider.title}
            {provider.pronouns ? ` · ${provider.pronouns}` : ""}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {showInNetwork && (
              <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-[0.72rem] font-medium text-forest-700">
                <CheckIcon width={13} height={13} /> In network with {context.insurance}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-2.5 py-1 text-[0.72rem] font-medium text-ink-soft">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: avail.dot }}
              />
              {avail.label}
            </span>
          </div>
        </div>
      </div>

      {whyThisFits && (
        <p className="mt-4 rounded-2xl bg-mint/50 px-4 py-3 text-[0.95rem] leading-relaxed text-ink">
          {whyThisFits}
        </p>
      )}

      {reasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <li
              key={r}
              className="rounded-full border border-line px-2.5 py-1 text-[0.72rem] text-ink-soft"
            >
              {r}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[0.85rem] leading-relaxed text-ink-soft">
        {provider.modalities.join(" · ")} · Next available {provider.nextAvailable.toLowerCase()}
      </p>

      <button
        type="button"
        onClick={onChoose}
        className="mt-4 flex w-full items-center justify-center rounded-2xl border border-forest px-4 py-2.5 font-medium text-forest transition-colors hover:bg-forest hover:text-mint"
      >
        Choose {provider.name.split(/\s+/)[0]}
      </button>
    </div>
  );
}

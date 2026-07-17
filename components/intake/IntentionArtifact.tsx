"use client";

import { useState } from "react";
import { CheckIcon, HeartIcon, FeatherIcon } from "@/components/ui/icons";
import { NO_INSURANCE_VALUES } from "@/lib/providers";
import type { Intention, Provider } from "@/lib/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
}

export function IntentionArtifact({
  intention,
  provider,
  onEdit,
  onRestart,
}: {
  intention: Intention;
  provider: Provider | null;
  onEdit: () => void;
  onRestart: () => void;
}) {
  const [requestConfirmed, setRequestConfirmed] = useState(false);
  const booking = intention.booking;
  const showInNetwork =
    provider &&
    !NO_INSURANCE_VALUES.includes(intention.context.insurance) &&
    provider.insuranceAccepted.includes(intention.context.insurance);

  return (
    <div className="space-y-8 py-8">
      <header className="animate-rise text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-soft text-forest">
          <CheckIcon width={28} height={28} />
        </span>
        <h1 className="mt-4 font-serif text-[1.8rem] leading-snug text-ink sm:text-[2.1rem]">
          Your Intention is ready.
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[1.02rem] leading-relaxed text-ink-muted">
          It&apos;s yours to keep and to change. We&apos;ll share it with your therapist
          before session one, so you never have to start from scratch.
        </p>
      </header>

      {provider && (
        <section className="animate-rise rounded-3xl border border-hairline bg-surface/95 p-5 shadow-[0_12px_32px_rgba(47,90,134,0.08)]">
          <p className="text-sm font-medium text-forest">Your choice</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-forest text-lg font-semibold uppercase text-mint">
              {initials(provider.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-xl text-ink">{provider.name}</h2>
              <p className="text-sm text-ink-muted">
                {provider.title}
                {provider.pronouns ? ` · ${provider.pronouns}` : ""}
              </p>
              {showInNetwork && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 text-[0.72rem] font-medium text-forest-700">
                  <CheckIcon width={13} height={13} /> In network with{" "}
                  {intention.context.insurance}
                </span>
              )}
            </div>
          </div>
          {booking ? (
            <>
              <div className="mt-4 rounded-2xl bg-mint-soft/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">
                  Requested session
                </p>
                <p className="mt-1 font-medium text-ink">
                  {booking.dayLabel} at {booking.time}
                </p>
                <p className="text-sm text-ink-muted">
                  {booking.modality ? `${booking.modality} · ` : ""}
                  Saved with this demo Intention.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequestConfirmed(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 font-medium text-mint transition-colors hover:bg-forest-700"
              >
                {requestConfirmed ? (
                  <>
                    <CheckIcon width={17} height={17} /> Session requested
                  </>
                ) : (
                  <>
                    <HeartIcon width={17} height={17} /> Confirm request
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-ink-muted">
                Prototype — this saves your selected time locally; no real appointment is booked.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 font-medium text-mint transition-colors hover:bg-forest-700"
              >
                <HeartIcon width={17} height={17} /> Request a first session
              </button>
              <p className="mt-2 text-center text-xs text-ink-muted">
                Prototype — choose a time in the flow to attach booking details.
              </p>
            </>
          )}
        </section>
      )}

      <section className="animate-rise rounded-3xl border border-hairline bg-surface-2/40 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-forest">
          <FeatherIcon width={18} height={18} />
          <p className="text-sm font-medium">
            What {provider ? provider.name.split(/\s+/)[0] : "your therapist"} will see first
          </p>
        </div>

        <p className="mt-3 text-[1.02rem] leading-relaxed text-ink">{intention.reflection}</p>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-ink">What matters to me</h3>
          <ol className="mt-2 space-y-2">
            {intention.priorities.map((p, i) => (
              <li key={p.id} className="flex gap-3 text-[0.95rem] text-ink-muted">
                <span className="font-serif text-forest">{i + 1}.</span>
                <span>
                  <span className="font-medium text-ink">{p.title || "Untitled"}</span>
                  {p.sourceQuote ? (
                    <span className="italic"> — &ldquo;{p.sourceQuote}&rdquo;</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-ink">How I want to work</h3>
          <ul className="mt-2 space-y-1.5">
            {intention.spectrums.map((s) => (
              <li key={s.id} className="text-[0.95rem] text-ink-muted">
                Leans toward{" "}
                <span className="font-medium text-ink">
                  {s.value >= 50 ? s.rightLabel : s.leftLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="animate-rise rounded-3xl bg-mint-soft/70 p-5 text-center">
        <p className="text-[0.95rem] leading-relaxed text-ink-muted">
          This is your <span className="font-medium text-ink">living compass</span>. As your
          goals shift, come back and update it — your therapy can move with you.
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Saved to this device · Last updated{" "}
          {new Date(intention.updatedAt).toLocaleDateString()}
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 rounded-2xl border border-hairline bg-surface/80 px-4 py-3 font-medium text-ink-muted transition-colors hover:text-ink"
        >
          Revisit my priorities
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 rounded-2xl border border-hairline bg-surface/80 px-4 py-3 font-medium text-ink-muted transition-colors hover:text-ink"
        >
          Start a new Intention
        </button>
      </div>
    </div>
  );
}

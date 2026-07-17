"use client";

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
  const showInNetwork =
    provider &&
    !NO_INSURANCE_VALUES.includes(intention.context.insurance) &&
    provider.insuranceAccepted.includes(intention.context.insurance);

  return (
    <div className="space-y-8 py-8">
      <header className="animate-rise text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-forest">
          <CheckIcon width={28} height={28} />
        </span>
        <h1 className="mt-4 font-serif text-[1.8rem] leading-snug text-ink sm:text-[2.1rem]">
          Your Intention is ready.
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[1.02rem] leading-relaxed text-ink-soft">
          It&apos;s yours to keep and to change. We&apos;ll share it with your therapist
          before session one, so you never have to start from scratch.
        </p>
      </header>

      {provider && (
        <section className="animate-rise rounded-3xl border border-line bg-white/90 p-5 shadow-sm">
          <p className="text-sm font-medium text-feather">Your choice</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-forest text-lg font-semibold uppercase text-mint">
              {initials(provider.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-xl text-ink">{provider.name}</h2>
              <p className="text-sm text-ink-soft">
                {provider.title}
                {provider.pronouns ? ` · ${provider.pronouns}` : ""}
              </p>
              {showInNetwork && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-[0.72rem] font-medium text-forest-700">
                  <CheckIcon width={13} height={13} /> In network with{" "}
                  {intention.context.insurance}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 font-medium text-mint transition-colors hover:bg-forest-700"
          >
            <HeartIcon width={17} height={17} /> Request a first session
          </button>
          <p className="mt-2 text-center text-xs text-ink-faint">
            Prototype — booking isn&apos;t wired up in this demo.
          </p>
        </section>
      )}

      <section className="animate-rise rounded-3xl border border-line bg-sand/40 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-feather">
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
              <li key={p.id} className="flex gap-3 text-[0.95rem] text-ink-soft">
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
              <li key={s.id} className="text-[0.95rem] text-ink-soft">
                Leans toward{" "}
                <span className="font-medium text-ink">
                  {s.value >= 50 ? s.rightLabel : s.leftLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="animate-rise rounded-3xl bg-mint/40 p-5 text-center">
        <p className="text-[0.95rem] leading-relaxed text-ink-soft">
          This is your <span className="font-medium text-ink">living compass</span>. As your
          goals shift, come back and update it — your therapy can move with you.
        </p>
        <p className="mt-2 text-xs text-ink-faint">
          Saved to this device · Last updated{" "}
          {new Date(intention.updatedAt).toLocaleDateString()}
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 rounded-2xl border border-line bg-white/70 px-4 py-3 font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Revisit my priorities
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="flex-1 rounded-2xl border border-line bg-white/70 px-4 py-3 font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Start a new Intention
        </button>
      </div>
    </div>
  );
}

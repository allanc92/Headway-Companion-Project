"use client";

import { useMemo, useState } from "react";
import { IntentionArtifact } from "./IntentionArtifact";
import { ThinkingShimmer } from "./ThinkingShimmer";
import { ArrowIcon, CheckIcon, CloseIcon, FeatherIcon } from "@/components/ui/icons";
import { getProviderBookingDays } from "@/lib/booking";
import { NO_INSURANCE_VALUES } from "@/lib/providers";
import type {
  Booking,
  Intention,
  Priority,
  Provider,
  Spectrum,
} from "@/lib/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
}

function ExpandIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
    >
      <path
        d="M5 8l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ResumeIntentionPrompt({
  onResume,
  onDismiss,
}: {
  onResume: () => void;
  onDismiss: () => void;
}) {
  return (
    <section className="animate-rise rounded-3xl border border-hairline-strong bg-mint-soft/80 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-ink">Welcome back — you have a saved Intention.</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Open it here in the thread, or continue fresh from this conversation.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onResume}
            className="rounded-full bg-forest px-4 py-2 text-sm font-medium text-mint transition-colors hover:bg-forest-700"
          >
            View it
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Continue fresh
          </button>
        </div>
      </div>
    </section>
  );
}

export function WelcomeBackBlock() {
  return (
    <section className="animate-rise flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-soft text-forest">
        <FeatherIcon width={17} height={17} />
      </div>
      <div className="max-w-[46ch] pt-0.5 text-[1.05rem] leading-relaxed text-ink">
        <p>Welcome back — here&apos;s your saved Intention, right where the conversation left off.</p>
      </div>
    </section>
  );
}

export function ReflectingBeat() {
  return (
    <section className="animate-rise">
      <ThinkingShimmer label="Reflecting on what you shared…" />
    </section>
  );
}

export function SummaryReadinessActions({
  onConfirm,
  onContinue,
}: {
  onConfirm: () => void;
  onContinue: () => void;
}) {
  return (
    <section
      aria-label="Choose whether to create your summary"
      className="animate-rise ml-11 max-w-[46ch] rounded-3xl border border-hairline-strong bg-surface/95 p-2.5 shadow-[0_12px_32px_rgba(47,90,134,0.08)]"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onConfirm}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 text-sm font-medium text-mint transition-colors hover:bg-forest-700"
        >
          I&apos;m ready for my summary
          <ArrowIcon width={17} height={17} />
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-2xl px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:bg-mint-soft/70 hover:text-ink"
        >
          Keep talking
        </button>
      </div>
    </section>
  );
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function SummaryUnderstandingCard({
  reflection,
  priorities,
  spectrums,
  disabled,
  matching,
  onFindMatches,
  showAction = true,
}: {
  reflection: string;
  priorities: Priority[];
  spectrums: Spectrum[];
  disabled: boolean;
  matching: boolean;
  onFindMatches: () => void;
  showAction?: boolean;
}) {
  return (
    <section className="animate-rise rounded-3xl border border-hairline-strong bg-surface/95 p-5 shadow-[0_12px_32px_rgba(47,90,134,0.08)] sm:p-6">
      <header>
        <p className="text-sm font-medium text-forest">Here&apos;s what I heard</p>
        <h1 className="mt-2 font-serif text-[1.7rem] leading-snug text-ink sm:text-[2rem]">
          A simple summary we can shape together.
        </h1>
        <p className="mt-3 max-w-xl text-[1.08rem] leading-relaxed text-ink-muted">
          {reflection}
        </p>
      </header>

      <div className="mt-6 space-y-6">
        <div>
          <h2 className="font-serif text-xl text-ink">What seems to matter most</h2>
          <div className="mt-3 space-y-3">
            {priorities.map((priority) => (
              <article
                key={priority.id}
                className="rounded-2xl border border-hairline bg-surface-2/55 p-4"
              >
                <h3 className="font-medium text-ink">{priority.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {priority.description}
                </p>
                {priority.sourceQuote && (
                  <p className="mt-2 text-sm leading-relaxed text-forest-700">
                    “{priority.sourceQuote}”
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-serif text-xl text-ink">How you may want to work together</h2>
          <div className="mt-3 space-y-4">
            {spectrums.map((spectrum) => {
              const value = clampPercent(spectrum.value);
              return (
                <article key={spectrum.id} className="rounded-2xl bg-mint-soft/55 p-4">
                  <div className="flex items-center justify-between gap-3 text-xs font-medium text-ink-muted">
                    <span>{spectrum.leftLabel}</span>
                    <span className="text-right">{spectrum.rightLabel}</span>
                  </div>
                  <div className="relative mt-3 h-2 rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-forest/35"
                      style={{ width: `${value}%` }}
                    />
                    <span
                      className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-forest shadow-[0_4px_10px_rgba(47,90,134,0.16)]"
                      style={{ left: `${value}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  {spectrum.note && (
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                      {spectrum.note}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {showAction && (
        <div className="mt-6 rounded-2xl border border-hairline bg-surface-2/60 p-4">
          <p className="text-sm leading-relaxed text-ink-muted">
            If anything feels off, just tell me in the chat and I&apos;ll update this with you.
            When it feels close enough, we&apos;ll use it to find therapists who fit.
          </p>
          <button
            type="button"
            onClick={onFindMatches}
            disabled={disabled || matching}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-6 py-3.5 font-medium text-mint transition-colors hover:bg-forest-700 disabled:opacity-60"
          >
            {matching ? "Finding your matches…" : "Find my matches"}
            {!matching && <ArrowIcon width={18} height={18} />}
          </button>
        </div>
      )}
    </section>
  );
}

export function UpdatingSummaryBeat() {
  return (
    <section className="animate-rise">
      <ThinkingShimmer label="Updating your summary…" />
    </section>
  );
}

export function FindingMatchesBeat() {
  return (
    <section className="animate-rise">
      <ThinkingShimmer label="Looking for therapists who fit what you shared…" />
    </section>
  );
}

function CalendarGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path
        d="M6 3.5v3M14 3.5v3M4.25 8.5h11.5M5 5h10a1.75 1.75 0 0 1 1.75 1.75V15A1.75 1.75 0 0 1 15 16.75H5A1.75 1.75 0 0 1 3.25 15V6.75A1.75 1.75 0 0 1 5 5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path
        d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM10 6.5V10l2.25 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookingBlock({
  provider,
  onConfirm,
}: {
  provider: Provider;
  onConfirm: (booking: Booking) => void;
}) {
  const days = useMemo(() => getProviderBookingDays(provider), [provider]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const selectedDay = days[selectedDayIndex] ?? days[0];
  const modality = provider.telehealth ? "Telehealth" : "In person";

  function chooseDay(index: number) {
    setSelectedDayIndex(index);
    setSelectedTime(null);
  }

  function confirm() {
    if (!selectedDay || !selectedTime) return;
    onConfirm({
      providerId: provider.id,
      providerName: provider.name,
      date: selectedDay.date,
      dayLabel: selectedDay.dayLabel,
      time: selectedTime,
      modality,
    });
  }

  return (
    <section className="animate-rise rounded-3xl border border-hairline-strong bg-surface/95 p-5 shadow-[0_12px_32px_rgba(47,90,134,0.08)] sm:p-6">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-mint-soft text-forest">
          <CalendarGlyph />
        </span>
        <div>
          <p className="text-sm font-medium text-forest">Choose a first session</p>
          <h2 className="mt-1 font-serif text-xl leading-snug text-ink">
            Pick a time with {provider.name}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            These are mock openings for the demo — selecting one saves it to your Intention.
          </p>
        </div>
      </header>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Available days
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Available days">
          {days.map((day, index) => {
            const selected = index === selectedDayIndex;
            return (
              <button
                key={day.date}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => chooseDay(index)}
                className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-forest/40 ${
                  selected
                    ? "border-forest bg-forest text-mint"
                    : "border-hairline bg-surface-2/50 text-ink-muted hover:border-hairline-strong hover:bg-mint-soft/70 hover:text-ink"
                }`}
              >
                <span className="block text-sm font-semibold">{day.dayLabel}</span>
                <span className={selected ? "text-xs text-mint" : "text-xs text-ink-muted"}>
                  {day.times.length} times
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-ink-muted">
            <ClockGlyph />
            <p className="text-sm font-medium">{selectedDay.dayLabel}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {selectedDay.times.map((time) => {
              const selected = time === selectedTime;
              return (
                <button
                  key={time}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedTime(time)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-forest/40 ${
                    selected
                      ? "border-forest bg-mint-soft text-forest shadow-[0_12px_32px_rgba(47,90,134,0.08)]"
                      : "border-hairline bg-surface text-ink-muted hover:border-hairline-strong hover:bg-mint-soft/65 hover:text-ink"
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl bg-mint-soft/65 px-4 py-3 text-sm leading-relaxed text-ink-muted">
        {selectedTime && selectedDay ? (
          <span>
            Selected:{" "}
            <span className="font-medium text-ink">
              {selectedDay.dayLabel} at {selectedTime}
            </span>{" "}
            · {modality}
          </span>
        ) : (
          <span>Select a time to continue to your Intention.</span>
        )}
      </div>

      <button
        type="button"
        onClick={confirm}
        disabled={!selectedTime}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 font-medium text-mint transition-colors hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirm this time <ArrowIcon width={18} height={18} />
      </button>
    </section>
  );
}

export function InlineIntentionCard({
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
  const [expanded, setExpanded] = useState(false);
  const showInNetwork =
    provider &&
    !NO_INSURANCE_VALUES.includes(intention.context.insurance) &&
    provider.insuranceAccepted.includes(intention.context.insurance);

  function handleEdit() {
    setExpanded(false);
    onEdit();
  }

  return (
    <section className="animate-rise space-y-4">
      <div className="rounded-3xl border border-hairline-strong bg-mint-soft/80 p-5 shadow-[0_12px_32px_rgba(47,90,134,0.08)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest text-base font-semibold uppercase text-mint">
            {provider ? initials(provider.name) : <CheckIcon width={22} height={22} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-forest">Intention ready</p>
            <h2 className="mt-1 font-serif text-xl leading-snug text-ink">
              {provider ? provider.name : "Your chosen therapist"}
            </h2>
            <p className="text-sm text-ink-muted">
              {provider
                ? `${provider.title}${provider.pronouns ? ` · ${provider.pronouns}` : ""}`
                : "Your therapy compass is saved."}
            </p>
            {showInNetwork && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-[0.72rem] font-medium text-forest-700">
                <CheckIcon width={13} height={13} /> In network with {intention.context.insurance}
              </span>
            )}
            {intention.booking && (
              <p className="mt-2 text-sm font-medium text-forest">
                Session requested · {intention.booking.dayLabel} at {intention.booking.time}
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">
          If you choose to share it, your therapist can start with your words, your
          priorities, and the way you want to work together.
        </p>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 font-medium text-mint transition-colors hover:bg-forest-700"
        >
          {expanded ? "Hide full Intention" : "View full Intention"}
          <ExpandIcon open={expanded} />
        </button>
      </div>

      {expanded && (
        <div className="animate-rise rounded-[2rem] border border-hairline bg-surface/90 p-4 shadow-[0_12px_32px_rgba(47,90,134,0.08)] sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink-muted">Full Intention</p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <CloseIcon width={14} height={14} /> Close
            </button>
          </div>
          <IntentionArtifact
            intention={intention}
            provider={provider}
            onEdit={handleEdit}
            onRestart={onRestart}
          />
        </div>
      )}
    </section>
  );
}

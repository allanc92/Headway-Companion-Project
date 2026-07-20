"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { Wordmark } from "@/components/home/Wordmark";
import { ProviderAvatar } from "@/components/intake/ProviderAvatar";
import { SafetyOverlay } from "@/components/intake/SafetyOverlay";
import {
  ArrowIcon,
  CardIcon,
  CheckIcon,
  FeatherIcon,
  LifebuoyIcon,
  PencilIcon,
  ShieldIcon,
  SparkIcon,
} from "@/components/ui/icons";
import { HELP_LABEL } from "@/lib/copy";
import { loadIntention } from "@/lib/intention-store";
import { NO_INSURANCE_VALUES, PROVIDERS } from "@/lib/providers";
import type { Booking, Intention, Provider } from "@/lib/types";

type PortalSnapshot =
  | { loaded: false; intention: null }
  | { loaded: true; intention: Intention | null };

const DAYS = [
  { label: "Sunday", short: "S" },
  { label: "Monday", short: "M" },
  { label: "Tuesday", short: "T" },
  { label: "Wednesday", short: "W" },
  { label: "Thursday", short: "T" },
  { label: "Friday", short: "F" },
  { label: "Saturday", short: "S" },
] as const;

const SPECTRUM_IDS = new Set(["action_space", "structure", "depth"]);
const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function CalendarGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M7 3.5v3M17 3.5v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5V8h4M9 12h6M9 15.5h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PortalHeader({
  onHelp,
  helpButtonRef,
}: {
  onHelp: () => void;
  helpButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-portal-line/50 bg-air-wash/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-5 py-3.5 sm:px-7">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Headway home"
            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/55"
          >
            <Wordmark />
          </Link>
          <span className="hidden h-5 w-px bg-portal-line/60 sm:block" />
          <span className="hidden text-sm font-medium text-ink-muted sm:inline">
            Patient portal
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-portal-line/60 bg-surface/75 px-3 py-1.5 text-xs font-medium text-ink-muted md:inline-flex">
            Local prototype
          </span>
          <button
            ref={helpButtonRef}
            type="button"
            onClick={onHelp}
            className="flex items-center gap-1.5 rounded-full border border-portal-line bg-surface/85 px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-alert/70 hover:text-alert focus:outline-none focus-visible:ring-2 focus-visible:ring-alert/60"
          >
            <LifebuoyIcon width={16} height={16} />
            <span className="hidden sm:inline">{HELP_LABEL}</span>
            <span className="sm:hidden">Help</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function PortalCard({
  title,
  eyebrow,
  icon,
  children,
  className = "",
}: {
  title: string;
  eyebrow: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`rounded-[1.75rem] border border-portal-line bg-surface/90 p-5 shadow-[0_22px_60px_rgba(29,85,61,0.075)] sm:p-6 ${className}`}
    >
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-mint-soft text-forest">
          {icon}
        </span>
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.17em] text-ink-muted">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-serif text-[1.35rem] leading-tight text-ink">
            {title}
          </h2>
        </div>
      </header>
      {children}
    </article>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ISO_TIMESTAMP.test(value) &&
    Boolean(parseBookingDate(value.slice(0, 10))) &&
    Number.isFinite(Date.parse(value))
  );
}

function isSpectrumId(
  value: unknown,
): value is Intention["spectrums"][number]["id"] {
  return typeof value === "string" && SPECTRUM_IDS.has(value);
}

function normalizePriority(
  value: unknown,
): Intention["priorities"][number] | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.sourceQuote !== "string" ||
    typeof value.description !== "string" ||
    !isStringArray(value.focusTags)
  ) {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    sourceQuote: value.sourceQuote,
    description: value.description,
    focusTags: [...value.focusTags],
  };
}

function normalizeSpectrum(
  value: unknown,
): Intention["spectrums"][number] | null {
  if (
    !isRecord(value) ||
    !isSpectrumId(value.id) ||
    typeof value.leftLabel !== "string" ||
    typeof value.rightLabel !== "string" ||
    typeof value.value !== "number" ||
    !Number.isFinite(value.value) ||
    value.value < 0 ||
    value.value > 100 ||
    (value.note != null && typeof value.note !== "string")
  ) {
    return null;
  }

  return {
    id: value.id,
    leftLabel: value.leftLabel,
    rightLabel: value.rightLabel,
    value: value.value,
    ...(typeof value.note === "string" ? { note: value.note } : {}),
  };
}

function normalizeBooking(value: unknown): Booking | null {
  if (
    !isRecord(value) ||
    typeof value.providerId !== "string" ||
    typeof value.providerName !== "string" ||
    typeof value.date !== "string" ||
    !parseBookingDate(value.date) ||
    typeof value.dayLabel !== "string" ||
    typeof value.time !== "string" ||
    (value.modality != null && typeof value.modality !== "string")
  ) {
    return null;
  }

  return {
    providerId: value.providerId,
    providerName: value.providerName,
    date: value.date,
    dayLabel: value.dayLabel,
    time: value.time,
    ...(typeof value.modality === "string" ? { modality: value.modality } : {}),
  };
}

function normalizeIntention(value: unknown): Intention | null {
  if (
    !isRecord(value) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt) ||
    !isRecord(value.context) ||
    typeof value.context.zip !== "string" ||
    typeof value.context.insurance !== "string" ||
    typeof value.reflection !== "string" ||
    !Array.isArray(value.priorities) ||
    !Array.isArray(value.spectrums) ||
    (value.chosenProviderId != null &&
      typeof value.chosenProviderId !== "string")
  ) {
    return null;
  }

  const priorities: Intention["priorities"] = [];
  for (const valuePriority of value.priorities) {
    const priority = normalizePriority(valuePriority);
    if (!priority) return null;
    priorities.push(priority);
  }

  const spectrums: Intention["spectrums"] = [];
  for (const valueSpectrum of value.spectrums) {
    const spectrum = normalizeSpectrum(valueSpectrum);
    if (!spectrum) return null;
    spectrums.push(spectrum);
  }

  let booking: Booking | undefined;
  if (value.booking != null) {
    booking = normalizeBooking(value.booking) ?? undefined;
    if (!booking) return null;
  }

  return {
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    context: {
      zip: value.context.zip,
      insurance: value.context.insurance,
    },
    reflection: value.reflection,
    priorities,
    spectrums,
    ...(typeof value.chosenProviderId === "string"
      ? { chosenProviderId: value.chosenProviderId }
      : {}),
    ...(booking ? { booking } : {}),
  };
}

function parseBookingDate(value: string | undefined): Date | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function calendarWeeks(date: Date): (number | null)[][] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const leading = new Date(year, month, 1, 12).getDay();
  const dayCount = new Date(year, month + 1, 0, 12).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

function AppointmentsCard({
  booking,
  providerName,
}: {
  booking: Booking | undefined;
  providerName: string;
}) {
  const selectedDate = parseBookingDate(booking?.date);
  const monthLabel = selectedDate
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(selectedDate)
    : "Care calendar";
  const fullDate = selectedDate
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(selectedDate)
    : booking?.dayLabel;

  return (
    <PortalCard title="Appointments" eyebrow="Your calendar" icon={<CalendarGlyph />}>
      {selectedDate ? (
        <div className="mt-5 rounded-2xl border border-portal-line/65 bg-air/55 p-3">
          <p className="px-1 font-serif text-lg text-ink">{monthLabel}</p>
          <table className="mt-2 w-full table-fixed text-center">
            <caption className="sr-only">
              {monthLabel} calendar with the simulated session selected
            </caption>
            <thead>
              <tr>
                {DAYS.map((day) => (
                  <th
                    key={day.label}
                    scope="col"
                    className="pb-1.5 text-[0.62rem] font-semibold text-ink-muted"
                  >
                    <span aria-hidden="true">{day.short}</span>
                    <span className="sr-only">{day.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendarWeeks(selectedDate).map((week, weekIndex) => (
                <tr key={`week-${weekIndex}`}>
                  {week.map((day, dayIndex) => {
                    const selected = day === selectedDate.getDate();
                    return (
                      <td
                        key={`${weekIndex}-${dayIndex}`}
                        className="h-7 py-0.5 text-[0.72rem] text-ink-muted"
                      >
                        {day ? (
                          <span
                            aria-current={selected ? "date" : undefined}
                            aria-label={
                              selected ? `${fullDate}, simulated session selected` : undefined
                            }
                            className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${
                              selected
                                ? "bg-forest font-semibold text-mint"
                                : "text-ink-muted"
                            }`}
                          >
                            {day}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-portal-line bg-air/45 p-4 text-sm leading-relaxed text-ink-muted">
          No simulated session has been added to this Intention.
        </div>
      )}

      {booking && (
        <div className="mt-4 border-t border-portal-line/50 pt-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-forest">
            Next session · simulated
          </p>
          <p className="mt-2 font-medium text-ink">{fullDate}</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {booking.time}
            {booking.modality ? ` · ${booking.modality}` : ""}
          </p>
          <p className="mt-2 text-sm text-ink-muted">With {providerName}</p>
        </div>
      )}
    </PortalCard>
  );
}

function BillingCard() {
  return (
    <PortalCard
      title="Billing"
      eyebrow="Prototype boundary"
      icon={<CardIcon />}
      className="mt-auto"
    >
      <div className="mt-5 rounded-2xl bg-cream/80 p-4">
        <p className="font-medium text-ink">No billing is connected.</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          This simulated session creates no charge, balance, claim, or payment action.
        </p>
      </div>
    </PortalCard>
  );
}

function JourneyCard({
  intention,
  provider,
  providerName,
}: {
  intention: Intention;
  provider: Provider | null;
  providerName: string;
}) {
  const booking = intention.booking;
  const hasProviderChoice = Boolean(
    provider || intention.chosenProviderId || booking?.providerId,
  );

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-portal-line bg-surface/95 p-6 shadow-[0_28px_80px_rgba(29,85,61,0.1)] sm:p-8">
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-sky/50 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute -left-20 top-44 h-56 w-56 rounded-full bg-mint-soft/60 blur-3xl"
      />

      <header className="relative">
        <div className="flex items-center gap-2 text-forest">
          <SparkIcon width={18} height={18} />
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em]">
            Your Journey
          </p>
        </div>
        <h2 className="mt-3 max-w-xl font-serif text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.02] tracking-[-0.025em] text-ink">
          What you chose, held in one place.
        </h2>
        <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-ink-muted">
          Your care home carries forward the understanding you shaped during intake,
          without asking you to start over.
        </p>
      </header>

      <div className="relative mt-7 space-y-4">
        <section
          id="your-intention"
          tabIndex={-1}
          className="scroll-mt-24 rounded-3xl border border-portal-line/70 bg-air-wash/90 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/60"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Shared priorities
              </p>
              <h2 className="mt-1 font-serif text-xl text-ink">Your Intention</h2>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-soft text-forest">
              <CheckIcon width={17} height={17} />
            </span>
          </div>
          {intention.reflection && (
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              {intention.reflection}
            </p>
          )}
          {intention.priorities.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {intention.priorities.map((priority) => (
                <li
                  key={priority.id}
                  className="rounded-full border border-portal-line/70 bg-mint-soft/65 px-3 py-1.5 text-xs font-medium text-forest-700"
                >
                  {priority.title || "Untitled priority"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              No shared priorities are saved yet.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-portal-line/70 bg-mint-soft/50 p-5">
          <div className="flex items-center gap-4">
            {provider ? (
              <ProviderAvatar
                name={provider.name}
                seed={provider.photoSeed}
                className="h-20 w-16 shrink-0 rounded-2xl"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-forest text-mint">
                <FeatherIcon width={24} height={24} />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-forest">
                {hasProviderChoice
                  ? "Therapist chosen · fictional"
                  : "Therapist choice"}
              </p>
              <h2 className="mt-1 font-serif text-xl text-ink">{providerName}</h2>
              {provider && (
                <p className="text-sm text-ink-muted">
                  {provider.title}
                  {provider.pronouns ? ` · ${provider.pronouns}` : ""}
                </p>
              )}
            </div>
          </div>
        </section>

        <section
          id="appointment-details"
          tabIndex={-1}
          className="scroll-mt-24 rounded-3xl border border-portal-line/70 bg-sky/40 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/60"
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-sky-ink">
            {booking ? "Session booked · simulated" : "Session"}
          </p>
          {booking ? (
            <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <h2 className="font-serif text-xl text-ink">{booking.dayLabel}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {booking.time}
                  {booking.modality ? ` · ${booking.modality}` : ""}
                </p>
              </div>
              <p className="text-xs leading-relaxed text-ink-muted">
                Saved locally · no real booking
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              No simulated time is attached to this Intention.
            </p>
          )}
        </section>

        <section
          id="onboarding-itinerary"
          tabIndex={-1}
          className="scroll-mt-24 rounded-3xl border border-forest bg-forest p-5 text-mint shadow-[0_18px_44px_rgba(20,96,59,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.17em] text-mint/80">
              Next action
            </p>
            <span className="rounded-full bg-mint/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em]">
              Ready when you are
            </span>
          </div>
          <h2 className="mt-2 font-serif text-2xl">Your onboarding itinerary</h2>
          <p className="mt-2 text-sm leading-relaxed text-mint/80">
            A short, optional way to arrive with the context you already created.
          </p>
          <ol className="mt-5 space-y-3">
            {[
              "Review your fictional provider and simulated appointment details.",
              "Revisit your Intention and the priorities you want to carry forward.",
              "Bring any personal notes you would like to remember for a future real visit.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint text-xs font-semibold text-forest">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}

function BenefitsCard({ insurance }: { insurance: string }) {
  const planShared = !NO_INSURANCE_VALUES.includes(insurance);

  return (
    <PortalCard title="Benefits" eyebrow="Illustrative only" icon={<ShieldIcon />}>
      <div className="mt-5 rounded-2xl bg-sky/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-ink">
          Plan shared during intake
        </p>
        <p className="mt-2 font-medium text-ink">
          {planShared ? insurance : "No insurance plan selected"}
        </p>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        This prototype does not verify benefits, eligibility, network status, coverage,
        or costs.
      </p>
    </PortalCard>
  );
}

function FormsCard() {
  return (
    <PortalCard
      title="Forms & patient files"
      eyebrow="Your library"
      icon={<FileGlyph />}
      className="mt-auto"
    >
      <nav className="mt-5 space-y-2.5" aria-label="Patient file library">
        <a
          href="#onboarding-itinerary"
          className="group block rounded-2xl border border-forest bg-mint-soft/75 p-4 transition-colors hover:bg-mint-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/55"
        >
          <span className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-forest">
                Start here
              </span>
              <span className="mt-1 block font-serif text-lg text-ink">
                Your onboarding itinerary
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-muted">
                Three calm steps before care begins.
              </span>
            </span>
            <ArrowIcon
              width={18}
              height={18}
              aria-hidden="true"
              className="mt-1 shrink-0 text-forest transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </a>

        {[
          {
            href: "#appointment-details",
            label: "Appointment details",
            detail: "Fictional provider and simulated time",
          },
          {
            href: "#your-intention",
            label: "Your Intention",
            detail: "Reflection and shared priorities",
          },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-portal-line/70 bg-air-wash/75 px-4 py-3 transition-colors hover:border-forest/60 hover:bg-mint-soft/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/55"
          >
            <span>
              <span className="block text-sm font-medium text-ink">{item.label}</span>
              <span className="mt-0.5 block text-xs text-ink-muted">{item.detail}</span>
            </span>
            <ArrowIcon
              width={16}
              height={16}
              aria-hidden="true"
              className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5"
            />
          </a>
        ))}
      </nav>
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        These are in-page prototype artifacts. No forms or files are submitted or shared.
      </p>
    </PortalCard>
  );
}

function NotesCard({ priority }: { priority: string | undefined }) {
  return (
    <PortalCard title="Your Notes" eyebrow="For your own words" icon={<PencilIcon />}>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        A quiet place to remember what you may want to bring into a future session.
      </p>
      {priority && (
        <div className="mt-4 rounded-2xl border border-portal-line/65 bg-cream/75 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            A prompt from your Intention
          </p>
          <p className="mt-2 font-serif text-lg leading-snug text-ink">{priority}</p>
        </div>
      )}
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        Note-taking is not enabled, so nothing new is stored here.
      </p>
    </PortalCard>
  );
}

function HueyHomeCard() {
  return (
    <PortalCard
      title="Huey's Home"
      eyebrow="Companion dock"
      icon={<FeatherIcon />}
      className="bg-air/75"
    >
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-portal-line/70 bg-surface/80 p-3.5">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-mint">
          <FeatherIcon width={19} height={19} />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-feather" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">Huey is resting here.</p>
          <p className="mt-0.5 text-xs text-ink-muted">Quiet, present, and bounded.</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        Conversation history is not saved or reopened from this portal, so this dock does
        not start a second chat.
      </p>
    </PortalCard>
  );
}

function PortalLoading() {
  return (
    <main
      className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[88rem] items-center justify-center px-5 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-md rounded-[2rem] border border-portal-line bg-surface/80 p-7 shadow-[0_24px_70px_rgba(29,85,61,0.08)]">
        <span className="mx-auto flex h-12 w-12 animate-breathe items-center justify-center rounded-2xl bg-mint-soft text-forest">
          <FeatherIcon width={23} height={23} />
        </span>
        <p className="mt-4 text-center font-serif text-xl text-ink">
          Opening your care home…
        </p>
        <p className="mt-2 text-center text-sm text-ink-muted">
          Looking for an Intention saved in this browser.
        </p>
      </div>
    </main>
  );
}

function EmptyPortal() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[88rem] items-center justify-center px-5 py-16 sm:px-7">
      <section className="w-full max-w-xl rounded-[2rem] border border-portal-line bg-surface/90 p-7 text-center shadow-[0_28px_80px_rgba(29,85,61,0.1)] sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-soft text-forest">
          <FeatherIcon width={27} height={27} />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-forest">
          Your care home
        </p>
        <h1 className="mt-2 font-serif text-[2rem] leading-tight text-ink sm:text-[2.5rem]">
          It will be here when you&apos;re ready.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[0.98rem] leading-relaxed text-ink-muted">
          There is no Intention saved in this browser yet. Begin with the current intake
          flow to reflect, choose a fictional provider, and select a simulated time.
        </p>
        <Link
          href="/"
          className="mx-auto mt-7 flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-forest px-5 py-3.5 font-semibold text-mint transition-colors hover:bg-forest-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
        >
          Start the intake flow
          <ArrowIcon width={18} height={18} aria-hidden="true" />
        </Link>
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          This is a non-clinical prototype. Do not enter sensitive health information.
        </p>
      </section>
    </main>
  );
}

function PortalHome({ intention }: { intention: Intention }) {
  const booking = intention.booking;
  const providerId = intention.chosenProviderId ?? booking?.providerId;
  const provider = PROVIDERS.find((item) => item.id === providerId) ?? null;
  const providerName =
    provider?.name ?? booking?.providerName ?? "No fictional therapist selected yet";

  return (
    <main className="mx-auto max-w-[88rem] px-5 pb-10 pt-10 sm:px-7 sm:pb-14 sm:pt-14">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.19em] text-forest">
            Your care home
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.98] tracking-[-0.035em] text-ink">
            A little more room for what comes next.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Your saved choices have somewhere to breathe. Review your journey, orient to
            the simulated session, and carry forward only what feels useful.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-portal-line bg-surface/75 px-4 py-2 text-xs font-medium text-ink-muted shadow-[0_10px_30px_rgba(29,85,61,0.06)]">
          <CheckIcon width={15} height={15} className="text-forest" />
          Saved on this device
        </div>
      </header>

      <div className="mt-9 grid items-stretch gap-5 lg:grid-cols-[minmax(12rem,0.8fr)_minmax(28rem,1.55fr)_minmax(12rem,0.8fr)] lg:gap-6">
        <aside
          aria-label="Appointments and billing"
          className="order-2 flex min-w-0 flex-col gap-5 lg:order-1"
        >
          <AppointmentsCard booking={booking} providerName={providerName} />
          <BillingCard />
        </aside>

        <section
          aria-label="Your care journey"
          className="order-1 flex min-w-0 flex-col gap-5 lg:order-2"
        >
          <JourneyCard
            intention={intention}
            provider={provider}
            providerName={providerName}
          />
          <div className="mt-auto grid gap-5 md:grid-cols-2">
            <NotesCard priority={intention.priorities[0]?.title} />
            <HueyHomeCard />
          </div>
        </section>

        <aside
          aria-label="Benefits and patient files"
          className="order-3 flex min-w-0 flex-col gap-5"
        >
          <BenefitsCard insurance={intention.context.insurance} />
          <FormsCard />
        </aside>
      </div>

      <footer className="mt-8 flex flex-col gap-2 border-t border-portal-line/60 pt-5 text-xs leading-relaxed text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p>Unofficial, non-clinical prototype · Not a real patient portal</p>
        <p>No auth, database, billing, benefits verification, or real booking</p>
      </footer>
    </main>
  );
}

export function PortalExperience() {
  const [snapshot, setSnapshot] = useState<PortalSnapshot>({
    loaded: false,
    intention: null,
  });
  const [helpOpen, setHelpOpen] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      const saved = loadIntention();
      if (active) {
        setSnapshot({
          loaded: true,
          intention: normalizeIntention(saved),
        });
      }
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, []);

  return (
    <div className="portal-canvas min-h-dvh">
      <PortalHeader
        onHelp={() => setHelpOpen(true)}
        helpButtonRef={helpButtonRef}
      />
      {!snapshot.loaded ? (
        <PortalLoading />
      ) : snapshot.intention ? (
        <PortalHome intention={snapshot.intention} />
      ) : (
        <EmptyPortal />
      )}

      {helpOpen && (
        <SafetyOverlay
          tier={0}
          manual
          onDismiss={() => setHelpOpen(false)}
          returnFocusRef={helpButtonRef}
        />
      )}
    </div>
  );
}

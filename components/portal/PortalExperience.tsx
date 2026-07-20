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
import { PROVIDERS } from "@/lib/providers";
import type { Booking, Intention } from "@/lib/types";

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
  id,
  title,
  eyebrow,
  icon,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  eyebrow: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      id={id}
      tabIndex={id ? -1 : undefined}
      className={`rounded-[1.25rem] border border-hairline-strong/75 bg-air/85 p-5 shadow-[0_14px_40px_rgba(29,85,61,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/60 ${id ? "scroll-mt-24" : ""} ${className}`}
    >
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-forest">
          {icon}
        </span>
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.17em] text-ink-muted">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-serif text-xl leading-tight text-ink">
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
  providerName: string | undefined;
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
    <PortalCard
      id="appointment-details"
      title="Appointments"
      eyebrow="Your calendar"
      icon={<CalendarGlyph />}
    >
      {selectedDate ? (
        <div className="mt-4 rounded-xl border border-hairline-strong/75 bg-surface/75 p-3">
          <p className="px-1 font-serif text-lg text-ink">{monthLabel}</p>
          <table className="mt-2 w-full table-fixed text-center">
            <caption className="sr-only">
              {monthLabel} calendar with the session selected
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
                              selected ? `${fullDate}, session selected` : undefined
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
          <p>No session has been added yet.</p>
          {providerName && (
            <p className="mt-2 font-medium text-ink">With {providerName}</p>
          )}
        </div>
      )}

      {booking && (
        <div className="mt-4 border-t border-portal-line/50 pt-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-forest">
            Next session
          </p>
          <p className="mt-2 font-medium text-ink">{fullDate}</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {booking.time}
            {booking.modality ? ` · ${booking.modality}` : ""}
          </p>
          {providerName && (
            <p className="mt-2 text-sm text-ink-muted">With {providerName}</p>
          )}
        </div>
      )}
    </PortalCard>
  );
}

function BillingCard() {
  return (
    <PortalCard
      title="Billing"
      eyebrow="Account"
      icon={<CardIcon />}
      className="flex h-full flex-col"
    >
      <div className="mt-4 flex flex-1 flex-col justify-center rounded-xl bg-surface/75 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Current balance
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="font-serif text-2xl text-ink">$0.00</p>
          <span className="rounded-full bg-mint-soft px-2.5 py-1 text-xs font-medium text-forest">
            All clear
          </span>
        </div>
      </div>
    </PortalCard>
  );
}

function NextActionCard() {
  const steps = [
    {
      title: "Review what comes next",
      detail: "Use this itinerary to orient before your next visit.",
    },
    {
      title: "Choose what to carry",
      detail: "Decide which parts of your context still feel useful.",
    },
    {
      title: "Prepare your questions",
      detail: "Keep anything you may want to ask in your own notes.",
    },
  ] as const;

  return (
    <article
      id="onboarding-itinerary"
      tabIndex={-1}
      className="flex h-full scroll-mt-24 flex-col overflow-hidden rounded-[1.25rem] border border-hairline-strong/80 bg-mint-soft/75 p-5 text-ink shadow-[0_14px_40px_rgba(29,85,61,0.07)] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/60 sm:p-6"
    >
      <div className="flex h-full flex-col">
        <header>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-forest">
              <SparkIcon width={18} height={18} />
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em]">
                Next action
              </p>
            </div>
            <span className="rounded-full bg-surface/75 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-forest">
              Ready when you are
            </span>
          </div>
          <h2 className="mt-4 max-w-xl font-serif text-[clamp(2rem,3.5vw,2.75rem)] leading-[1.02] tracking-[-0.025em]">
            Your onboarding itinerary
          </h2>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
            A short, optional way to arrive with the context you already created.
          </p>
        </header>

        <ol className="mt-auto grid gap-3 pt-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-xl border border-hairline-strong/75 bg-surface/75 p-3.5"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint-200 text-xs font-semibold text-forest">
                {index + 1}
              </span>
              <h3 className="mt-2.5 text-sm font-semibold leading-snug">{step.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>

        <a
          href="#take-home-assignment"
          className="group mt-4 inline-flex self-start items-center gap-3 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-mint shadow-[0_8px_22px_rgba(20,96,59,0.16)] transition-colors hover:bg-forest-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
        >
          Prepare for your first session
          <ArrowIcon
            width={17}
            height={17}
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </a>
      </div>
    </article>
  );
}

function BenefitsCard() {
  const remainingSessions = 8;
  const totalSessions = 12;

  return (
    <PortalCard title="Benefits" eyebrow="Coverage" icon={<ShieldIcon />}>
      <div className="mt-4 rounded-xl bg-surface/75 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-ink">
          Remaining sessions
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="font-serif text-3xl leading-none text-ink">{remainingSessions}</p>
          <p className="text-xs text-ink-muted">of {totalSessions} this year</p>
        </div>
        <div
          role="progressbar"
          aria-label={`${remainingSessions} of ${totalSessions} sessions remaining`}
          aria-valuemin={0}
          aria-valuemax={totalSessions}
          aria-valuenow={remainingSessions}
          className="mt-4 h-2 overflow-hidden rounded-full bg-sky/70"
        >
          <span className="block h-full w-2/3 rounded-full bg-forest" />
        </div>
        <p className="mt-3 text-xs text-ink-muted">Renews January 1</p>
      </div>
    </PortalCard>
  );
}

function FormsCard() {
  return (
    <PortalCard
      title="Forms & patient files"
      eyebrow="Your library"
      icon={<FileGlyph />}
    >
      <nav className="mt-4 space-y-2.5" aria-label="Patient file library">
        <a
          href="#onboarding-itinerary"
          className="group block rounded-xl border border-forest/75 bg-mint-soft/75 p-3.5 transition-colors hover:bg-mint-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/55"
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

        <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline-strong/75 bg-surface/75 px-3.5 py-3">
          <span>
            <span className="block text-sm font-medium text-ink">EHR Files</span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              2 care documents
            </span>
          </span>
          <span
            aria-label="2 files"
            className="flex h-7 min-w-7 items-center justify-center rounded-full bg-mint-soft px-2 text-xs font-semibold text-forest"
          >
            2
          </span>
        </div>

        <a
          href="#your-notes"
          className="group flex items-center justify-between gap-3 rounded-xl border border-hairline-strong/75 bg-surface/75 px-3.5 py-3 transition-colors hover:border-forest/60 hover:bg-mint-soft/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/55"
        >
          <span>
            <span className="block text-sm font-medium text-ink">Your Notes</span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              A prompt from your saved Intention
            </span>
          </span>
          <ArrowIcon
            width={16}
            height={16}
            aria-hidden="true"
            className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5"
          />
        </a>

        <a
          href="#take-home-assignment"
          className="group flex items-center justify-between gap-3 rounded-xl border border-forest/35 bg-mint-soft/75 px-3.5 py-3 text-forest transition-colors hover:border-forest/55 hover:bg-mint-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/60"
        >
          <span>
            <span className="block text-sm font-semibold">Take-home assignment</span>
            <span className="mt-0.5 block text-xs text-ink-muted">
              Open your reflection prompt
            </span>
          </span>
          <ArrowIcon
            width={17}
            height={17}
            aria-hidden="true"
            className="shrink-0 transition-transform group-hover:translate-x-0.5"
          />
        </a>
      </nav>
    </PortalCard>
  );
}

function NotesCard({ priority }: { priority: string | undefined }) {
  return (
    <PortalCard
      id="your-notes"
      title="Your Notes"
      eyebrow="For your own words"
      icon={<PencilIcon />}
    >
      <div
        id="take-home-assignment"
        tabIndex={-1}
        className="mt-4 scroll-mt-24 rounded-xl border border-hairline-strong/75 bg-surface/75 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/60"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          A prompt from your Intention
        </p>
        <p className="mt-2 font-serif text-lg leading-snug text-ink">
          {priority ?? "What would you like to carry into your next session?"}
        </p>
      </div>
    </PortalCard>
  );
}

function HueyHomeCard() {
  return (
    <PortalCard
      title="Huey's Home"
      eyebrow="Companion"
      icon={<FeatherIcon />}
      className="flex h-full flex-col"
    >
      <div className="mt-4 flex flex-1 items-center gap-3 rounded-xl border border-hairline-strong/75 bg-surface/75 p-3.5">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-mint">
          <FeatherIcon width={19} height={19} />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-feather" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">Huey is here.</p>
          <p className="mt-0.5 text-xs text-ink-muted">Ready when you are.</p>
        </div>
      </div>
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
  const providerName = provider?.name ?? booking?.providerName;

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
            Your saved choices have somewhere to breathe. Review what comes next, orient
            to your next session, and carry forward only what feels useful.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-portal-line bg-surface/75 px-4 py-2 text-xs font-medium text-ink-muted shadow-[0_10px_30px_rgba(29,85,61,0.06)]">
          <CheckIcon width={15} height={15} className="text-forest" />
          Saved on this device
        </div>
      </header>

      <div className="mt-8 grid items-stretch gap-5 lg:grid-cols-[minmax(12rem,0.8fr)_minmax(28rem,1.55fr)_minmax(12rem,0.8fr)]">
        <aside
          aria-label="Appointments and billing"
          className="order-2 grid min-w-0 grid-rows-[auto_1fr] gap-5 lg:order-1"
        >
          <AppointmentsCard booking={booking} providerName={providerName} />
          <BillingCard />
        </aside>

        <section
          aria-label="Your next steps"
          className="order-1 grid min-w-0 grid-rows-[1fr_auto] gap-5 lg:order-2"
        >
          <NextActionCard />
          <div className="grid gap-5 md:grid-cols-2">
            <NotesCard priority={intention.priorities[0]?.title} />
            <HueyHomeCard />
          </div>
        </section>

        <aside
          aria-label="Benefits and patient files"
          className="order-3 grid min-w-0 grid-rows-[auto_1fr] gap-5"
        >
          <BenefitsCard />
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

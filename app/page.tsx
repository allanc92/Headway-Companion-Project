import Link from "next/link";
import { SiteHeader } from "@/components/home/SiteHeader";
import { FindCareForm } from "@/components/home/FindCareForm";
import { HeroArt } from "@/components/home/HeroArt";
import { Wordmark } from "@/components/home/Wordmark";
import { SparkIcon, HeartIcon, ShieldIcon } from "@/components/ui/icons";

const INSURERS = [
  "Aetna",
  "Cigna",
  "UnitedHealthcare",
  "Blue Cross Blue Shield",
  "Optum",
  "Oscar Health",
];

const STEPS = [
  {
    icon: SparkIcon,
    title: "Tell us what's going on",
    body: "In your own words — a feeling, a moment, a situation. No cold form to fill out.",
  },
  {
    icon: HeartIcon,
    title: "Co-author your match",
    body: "We reflect what we hear into priorities that are yours to shape, rank, and edit.",
  },
  {
    icon: ShieldIcon,
    title: "Meet your therapist",
    body: "Covered by your insurance, matched to what matters to you — often within a week.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-cream">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 md:grid-cols-2 md:py-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-xs font-medium text-forest-700">
              <SparkIcon width={14} height={14} /> A calmer way to begin
            </span>
            <h1 className="mt-5 font-serif text-[2.6rem] leading-[1.05] tracking-tight text-ink sm:text-[3.4rem]">
              Find a therapist who takes your insurance.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              80,000+ licensed therapists and psychiatrists, all covered by insurance.
              Meet someone who truly gets you — often within a week.
            </p>

            <div className="mt-7 max-w-lg">
              <FindCareForm />
              <p className="mt-3 pl-1 text-sm text-ink-faint">
                Most people pay <span className="font-medium text-ink-soft">$0–$30</span> per
                session with insurance.
              </p>
            </div>
          </div>

          <div className="animate-rise">
            <HeroArt />
          </div>
        </div>
      </section>

      {/* Insurance strip */}
      <section className="border-y border-line/70 bg-sand/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-6">
          <span className="text-sm font-medium text-ink-faint">In network with</span>
          {INSURERS.map((name) => (
            <span key={name} className="text-sm font-semibold text-ink-soft/90">
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">
            Starting therapy shouldn&apos;t feel like paperwork.
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Most intake forms ask you to translate your life into checkboxes. We start with
            a conversation instead.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-3xl border border-line bg-white/70 p-7 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-forest">
                <step.icon width={22} height={22} />
              </div>
              <p className="mt-5 text-sm font-medium text-ink-faint">Step {i + 1}</p>
              <h3 className="mt-1 font-serif text-xl text-ink">{step.title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/intake"
            className="inline-flex items-center gap-2 rounded-full bg-forest px-7 py-3.5 font-medium text-mint transition-colors hover:bg-forest-700"
          >
            Begin when you&apos;re ready
          </Link>
        </div>
      </section>

      {/* Cost reassurance */}
      <section className="bg-forest">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 md:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="font-serif text-3xl tracking-tight text-mint sm:text-[2.4rem]">
              Therapy that&apos;s actually within reach.
            </h2>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-mint/80">
              Because Headway therapists are in network with your plan, care is often the
              price of a copay — not a luxury you have to justify.
            </p>
          </div>
          <div className="rounded-3xl bg-mint/10 p-8 ring-1 ring-mint/20">
            <p className="font-serif text-5xl text-mint">$0–$30</p>
            <p className="mt-2 text-mint/80">average cost per session with insurance</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-cream">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark />
          <p className="max-w-md text-xs leading-relaxed text-ink-faint">
            Design prototype for interview purposes. Not affiliated with, or endorsed by,
            Headway. Brand-sympathetic recreation using original, copyright-safe assets.
          </p>
        </div>
      </footer>
    </div>
  );
}

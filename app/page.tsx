import { FindCareForm } from "@/components/home/FindCareForm";
import { HeroArt } from "@/components/home/HeroArt";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SupportArt } from "@/components/home/SupportArt";
import { Wordmark } from "@/components/home/Wordmark";
import { ArrowIcon, CalculatorIcon } from "@/components/ui/icons";

const STATS = [
  {
    value: "40M+",
    label: "sessions held",
    description:
      "Millions of meaningful care moments — connecting people to the personalized support they need.",
  },
  {
    value: "80K+",
    label: "licensed providers",
    description:
      "No matter what you're facing, Headway helps you find a therapist or psychiatrist who's ready to help.",
  },
  {
    value: "100+",
    label: "insurance plans",
    description:
      "We're in network with the nation's top insurance plans, so quality care fits your budget.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white">
      <div className="bg-mint">
        <SiteHeader />

        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-8 md:grid-cols-[1.02fr_0.98fr] md:gap-12 md:pb-20 md:pt-12">
          <div>
            <h1 className="text-balance font-serif text-[clamp(2.65rem,6vw,4.8rem)] leading-[0.98] tracking-[-0.035em] text-ink">
              80,000+ therapists and psychiatrists. All covered by insurance.
            </h1>
            <p className="mt-6 max-w-[30rem] text-pretty text-base leading-7 text-ink-soft sm:text-lg">
              Pay as low as $0/session. Book with someone who understands your needs, is in
              network, and fits your schedule.<sup className="text-xs">1</sup>
            </p>

            <div className="mt-8 max-w-2xl">
              <FindCareForm />
            </div>
          </div>

          <HeroArt />
        </section>
      </div>

      <main className="bg-white">
        <section className="px-5 py-8 md:py-10">
          <a
            href="#"
            className="mx-auto flex max-w-5xl items-center justify-between gap-5 rounded-3xl bg-sand p-5 transition-colors hover:bg-line/60 sm:p-6"
          >
            <span className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint text-forest">
                <CalculatorIcon width={22} height={22} />
              </span>
              <span>
                <span className="block font-semibold text-ink">Get a cost estimate</span>
                <span className="mt-1 block text-sm leading-6 text-ink-soft">
                  People with insurance pay as low as $0 per session through Headway
                </span>
              </span>
            </span>
            <ArrowIcon className="shrink-0 text-ink-faint" />
          </a>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:pb-24 md:pt-16">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              THROUGH HEADWAY
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.025em] text-ink sm:text-5xl">
              Millions have found support
            </h2>
          </div>

          <div className="mt-12 grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <SupportArt />

            <div>
              {STATS.map((stat) => (
                <div
                  key={stat.value}
                  className="grid gap-5 border-t border-line py-7 sm:grid-cols-[8.5rem_1fr] sm:gap-8"
                >
                  <div>
                    <p className="font-serif text-5xl leading-none tracking-[-0.03em] text-ink">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm text-ink-faint">{stat.label}</p>
                  </div>
                  <p className="max-w-xl text-base leading-7 text-ink-soft">{stat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-cream">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark />
          <p className="max-w-md text-xs leading-relaxed text-ink-faint">
            Design prototype for interview purposes. Not affiliated with, or endorsed by, Headway.
            Brand-sympathetic recreation using original, copyright-safe assets.
          </p>
        </div>
      </footer>
    </div>
  );
}

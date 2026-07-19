"use client";

import { useEffect, useRef, useState } from "react";

import { ProviderCard } from "./ProviderCard";
import { SparkIcon } from "@/components/ui/icons";
import { NO_INSURANCE_VALUES } from "@/lib/providers";
import type { IntakeContext, MatchResult } from "@/lib/types";

function CarouselArrowIcon({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
    >
      <path
        d={
          direction === "previous"
            ? "M12.5 4.5 7 10l5.5 5.5"
            : "M7.5 4.5 13 10l-5.5 5.5"
        }
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InlineProviderResults({
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
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const matchCount = result.matches.length;
  const currentIndex = Math.min(activeIndex, Math.max(0, matchCount - 1));

  useEffect(() => {
    carouselRef.current?.scrollTo({ left: 0 });
  }, [matchCount]);

  function updateActiveIndex() {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const firstCard = carousel.querySelector<HTMLElement>("[data-provider-card]");
    if (!firstCard) return;
    const styles = window.getComputedStyle(carousel);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const step = firstCard.offsetWidth + gap;
    if (step <= 0) return;
    setActiveIndex(
      Math.min(matchCount - 1, Math.max(0, Math.round(carousel.scrollLeft / step))),
    );
  }

  function scrollToCard(index: number) {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const cards = carousel.querySelectorAll<HTMLElement>("[data-provider-card]");
    const card = cards[Math.min(cards.length - 1, Math.max(0, index))];
    if (!card) return;
    carousel.scrollTo({ left: card.offsetLeft - carousel.offsetLeft, behavior: "smooth" });
  }

  return (
    <section className="animate-rise space-y-6">
      <header>
        <p className="text-sm font-medium text-forest">Your matches</p>
        <h1 className="mt-2 font-serif text-[1.7rem] leading-snug text-ink sm:text-[2rem]">
          Therapists who fit what you shared.
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{subParts.join(" · ")}</p>
      </header>

      {result.tradeoff.kind !== "none" && result.tradeoff.message && (
        <div className="rounded-3xl border border-hairline-strong bg-mint-soft/70 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-forest">
              <SparkIcon width={17} height={17} />
            </span>
            <div>
              <p className="font-medium text-ink">One honest note</p>
              <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-muted">
                {result.tradeoff.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {result.matches.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">
              Swipe or use the arrows to browse {matchCount} thoughtful fits.
            </p>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollToCard(currentIndex - 1)}
                disabled={currentIndex === 0}
                aria-label="Show previous therapist"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface text-forest shadow-[0_8px_20px_rgba(47,90,134,0.08)] transition hover:border-hairline-strong hover:bg-mint-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CarouselArrowIcon direction="previous" />
              </button>
              <button
                type="button"
                onClick={() => scrollToCard(currentIndex + 1)}
                disabled={currentIndex >= matchCount - 1}
                aria-label="Show next therapist"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface text-forest shadow-[0_8px_20px_rgba(47,90,134,0.08)] transition hover:border-hairline-strong hover:bg-mint-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CarouselArrowIcon direction="next" />
              </button>
            </div>
          </div>

          <div>
            <div
              ref={carouselRef}
              tabIndex={0}
              role="region"
              aria-label="Matched therapists carousel"
              onScroll={updateActiveIndex}
              className="hide-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2 pt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/35 sm:gap-5"
            >
              {result.matches.map((scored) => (
                <div
                  key={scored.provider.id}
                  data-provider-card
                  className="flex w-[min(82vw,19rem)] shrink-0 snap-start"
                >
                  <ProviderCard
                    scored={scored}
                    context={context}
                    onChoose={() => onChoose(scored.provider.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {matchCount > 1 && (
            <div className="flex items-center justify-center gap-2" aria-label="Carousel position">
              {result.matches.map((scored, index) => (
                <button
                  key={scored.provider.id}
                  type="button"
                  onClick={() => scrollToCard(index)}
                  aria-label={`Show therapist ${index + 1} of ${matchCount}`}
                  aria-current={index === currentIndex ? "true" : undefined}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "w-6 bg-forest"
                      : "w-2 bg-hairline-strong hover:bg-forest/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-hairline bg-surface/90 p-6 text-center">
          <p className="font-serif text-lg text-ink">
            No exact matches inside these constraints yet.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            That&apos;s not a dead end — it usually means one filter is doing all the
            narrowing. Broadening your insurance or opening up to telehealth is the fastest
            way to meet someone who truly fits.
          </p>
        </div>
      )}
    </section>
  );
}

"use client";

import { PriorityCards } from "./PriorityCards";
import { SpectrumControls } from "./SpectrumControls";
import { ArrowIcon } from "@/components/ui/icons";
import type { Priority, Spectrum } from "@/lib/types";

export function Understanding({
  reflection,
  priorities,
  spectrums,
  onPrioritiesChange,
  onSpectrumsChange,
  onFindMatches,
  matching,
}: {
  reflection: string;
  priorities: Priority[];
  spectrums: Spectrum[];
  onPrioritiesChange: (next: Priority[]) => void;
  onSpectrumsChange: (next: Spectrum[]) => void;
  onFindMatches: () => void;
  matching: boolean;
}) {
  return (
    <div className="space-y-10 py-8">
      <section className="animate-rise">
        <p className="text-sm font-medium text-feather">The mirror</p>
        <h1 className="mt-2 font-serif text-[1.7rem] leading-snug text-ink sm:text-[2rem]">
          Here&apos;s what I heard.
        </h1>
        <p className="mt-3 max-w-xl text-[1.08rem] leading-relaxed text-ink-soft">
          {reflection}
        </p>
      </section>

      <section className="animate-rise">
        <h2 className="font-serif text-xl text-ink">What matters to you</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Drag to rank them. Edit the words, remove what doesn&apos;t fit, or add your own —
          these are yours, not ours.
        </p>
        <div className="mt-4">
          <PriorityCards priorities={priorities} onChange={onPrioritiesChange} />
        </div>
      </section>

      <section className="animate-rise">
        <h2 className="font-serif text-xl text-ink">How you want to work together</h2>
        <p className="mt-1 text-sm text-ink-soft">
          There&apos;s no right answer. Nudge each one until it feels true to you.
        </p>
        <div className="mt-4">
          <SpectrumControls spectrums={spectrums} onChange={onSpectrumsChange} />
        </div>
      </section>

      <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-cream via-cream to-transparent px-5 pb-6 pt-3">
        <button
          type="button"
          onClick={onFindMatches}
          disabled={matching || priorities.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-6 py-3.5 font-medium text-mint transition-colors hover:bg-forest-700 disabled:opacity-60"
        >
          {matching ? "Finding your matches…" : "Find my matches"}
          {!matching && <ArrowIcon width={18} height={18} />}
        </button>
      </div>
    </div>
  );
}

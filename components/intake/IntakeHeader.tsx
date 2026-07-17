"use client";

import Link from "next/link";
import { Wordmark } from "@/components/home/Wordmark";
import { LifebuoyIcon } from "@/components/ui/icons";
import { HELP_LABEL } from "@/lib/copy";

const STAGES = ["Reflecting", "Understanding", "Choosing"];

export function IntakeHeader({
  step,
  onHelp,
}: {
  step: 1 | 2 | 3;
  onHelp: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline/70 bg-air/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" aria-label="Headway home">
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
          {STAGES.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const active = n === step;
            const done = n < step;
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-1.5 items-center rounded-full transition-all ${
                    active ? "w-6 bg-forest" : done ? "w-3 bg-brand" : "w-3 bg-hairline"
                  }`}
                />
                {active && (
                  <span className="text-xs font-medium text-ink-muted">{label}</span>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onHelp}
          className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface/80 px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-alert/40 hover:text-alert"
        >
          <LifebuoyIcon width={16} height={16} />
          <span className="hidden sm:inline">{HELP_LABEL}</span>
        </button>
      </div>
    </header>
  );
}

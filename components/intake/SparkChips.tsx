"use client";

import { SPARK_CHIPS } from "@/lib/copy";

export function SparkChips({
  onPick,
  disabled,
}: {
  onPick: (signal: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SPARK_CHIPS.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip.signal)}
          className="rounded-full border border-hairline bg-surface/80 px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:border-feather hover:text-ink disabled:opacity-50"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

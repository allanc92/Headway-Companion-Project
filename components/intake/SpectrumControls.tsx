"use client";

import type { Spectrum } from "@/lib/types";

export function SpectrumControls({
  spectrums,
  onChange,
}: {
  spectrums: Spectrum[];
  onChange: (next: Spectrum[]) => void;
}) {
  function setValue(id: string, value: number) {
    onChange(spectrums.map((s) => (s.id === id ? { ...s, value } : s)));
  }

  return (
    <div className="space-y-5">
      {spectrums.map((s) => (
        <div key={s.id} className="rounded-3xl border border-line bg-white/85 p-4 sm:p-5">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className={s.value < 45 ? "text-forest" : "text-ink-faint"}>
              {s.leftLabel}
            </span>
            <span className={s.value > 55 ? "text-forest" : "text-ink-faint"}>
              {s.rightLabel}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={s.value}
            onChange={(e) => setValue(s.id, Number(e.target.value))}
            aria-label={`${s.leftLabel} to ${s.rightLabel}`}
            className="mt-3 w-full cursor-pointer accent-forest"
          />

          {s.note && (
            <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-soft">
              <span className="font-medium text-ink">Why here:</span> {s.note}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

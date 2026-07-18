"use client";

import { MicrophoneIcon } from "@/components/ui/icons";
import { VOICE_COPY } from "@/lib/copy";
import type { VoiceStatus } from "./useVoiceSession";

function statusLabel(status: VoiceStatus): string {
  switch (status) {
    case "connecting":
      return VOICE_COPY.connecting;
    case "speaking":
      return VOICE_COPY.speaking;
    case "reconnecting":
      return VOICE_COPY.reconnecting;
    default:
      return VOICE_COPY.listening;
  }
}

export function VoiceControls({
  status,
  micLevel,
  caption,
  fallbackMessage,
  disabled,
  onStart,
  onEnd,
}: {
  status: VoiceStatus;
  micLevel: number;
  caption: string;
  fallbackMessage: string | null;
  disabled?: boolean;
  onStart: () => void;
  onEnd: () => void;
}) {
  const active =
    status === "connecting" ||
    status === "listening" ||
    status === "speaking" ||
    status === "reconnecting";

  if (fallbackMessage) {
    return (
      <p className="px-2 text-sm leading-relaxed text-ink-muted" role="status">
        {fallbackMessage}
      </p>
    );
  }

  if (!active) {
    return (
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-hairline-strong bg-surface/95 px-4 py-2.5 text-sm font-semibold text-forest shadow-sm transition-colors hover:bg-mint disabled:cursor-not-allowed disabled:opacity-45"
      >
        <MicrophoneIcon aria-hidden="true" />
        {VOICE_COPY.start}
      </button>
    );
  }

  const level = status === "speaking" ? 0.3 : micLevel;
  return (
    <section
      className="rounded-3xl border border-hairline-strong bg-surface/95 p-4 shadow-[0_12px_32px_rgba(47,90,134,0.08)]"
      aria-label="Voice conversation"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-forest">
            <MicrophoneIcon aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink" aria-live="polite">
              {statusLabel(status)}
            </p>
            <div className="mt-1 flex h-3 items-center gap-1" aria-hidden="true">
              {[0.45, 0.75, 1, 0.65].map((weight, index) => (
                <span
                  key={index}
                  className="w-1 rounded-full bg-feather transition-[height] duration-150 motion-reduce:transition-none"
                  style={{ height: `${4 + Math.round(level * weight * 8)}px` }}
                />
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onEnd}
          className="min-h-11 shrink-0 rounded-full border border-hairline-strong px-4 py-2 text-sm font-semibold text-forest transition-colors hover:bg-mint"
        >
          {VOICE_COPY.end}
        </button>
      </div>

      <div
        className="mt-4 border-t border-hairline pt-3"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {VOICE_COPY.captionLabel}
        </p>
        <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-cool">
          {caption || VOICE_COPY.captionWaiting}
        </p>
      </div>
    </section>
  );
}

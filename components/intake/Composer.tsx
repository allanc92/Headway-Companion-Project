"use client";

import { useRef, useState } from "react";
import { ArrowIcon, VoiceWaveIcon } from "@/components/ui/icons";
import { VOICE_COPY } from "@/lib/copy";

export function Composer({
  onSend,
  onVoiceStart,
  disabled,
  voiceDisabled = false,
  placeholder = "Take your time. Start wherever feels right…",
}: {
  onSend: (text: string) => void;
  onVoiceStart?: () => void;
  disabled?: boolean;
  voiceDisabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const hasInput = value.length > 0;
  const hasMessage = Boolean(value.trim());
  const voiceAction = Boolean(onVoiceStart) && !hasInput;

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  }

  function handleAction() {
    if (voiceAction && onVoiceStart) {
      onVoiceStart();
      return;
    }
    submit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function autoGrow(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  }

  return (
    <div className="flex items-end gap-2 rounded-3xl border border-hairline bg-surface/95 p-2.5 shadow-[0_12px_32px_rgba(47,90,134,0.08)] focus-within:border-feather">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={autoGrow}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Your message"
        className="max-h-[200px] flex-1 resize-none bg-transparent px-3 py-2 text-[1.05rem] leading-relaxed text-ink outline-none placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-65"
      />
      <button
        type="button"
        onClick={handleAction}
        disabled={
          voiceAction ? disabled || voiceDisabled : disabled || !hasMessage
        }
        aria-label={voiceAction ? VOICE_COPY.start : "Send"}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-forest text-mint transition-colors duration-150 hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
      >
        <span
          aria-hidden="true"
          className={`absolute flex items-center justify-center transition-[opacity,transform] duration-150 motion-reduce:transition-none ${
            voiceAction
              ? "scale-100 opacity-100"
              : "scale-75 opacity-0"
          }`}
        >
          <VoiceWaveIcon width={22} height={22} />
        </span>
        <span
          aria-hidden="true"
          className={`absolute flex items-center justify-center transition-[opacity,transform] duration-150 motion-reduce:transition-none ${
            voiceAction
              ? "scale-75 opacity-0"
              : "scale-100 opacity-100"
          }`}
        >
          <ArrowIcon width={20} height={20} />
        </span>
      </button>
    </div>
  );
}

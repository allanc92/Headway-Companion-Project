"use client";

import { useRef, useState } from "react";
import { ArrowIcon } from "@/components/ui/icons";

export function Composer({
  onSend,
  disabled,
  placeholder = "Take your time. Start wherever feels right…",
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
        onChange={autoGrow}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Your message"
        className="max-h-[200px] flex-1 resize-none bg-transparent px-3 py-2 text-[1.05rem] leading-relaxed text-ink outline-none placeholder:text-ink-muted"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest text-mint transition-colors hover:bg-forest-700 disabled:opacity-40"
      >
        <ArrowIcon width={20} height={20} />
      </button>
    </div>
  );
}

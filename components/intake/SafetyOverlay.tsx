"use client";

import { useEffect, useId, useRef } from "react";
import {
  CRISIS_RESOURCES,
  SAFETY_COPY,
  SAFETY_DISCLAIMER,
  QUICK_EXIT_HREF,
} from "@/lib/copy";
import { ShieldIcon, CloseIcon, LifebuoyIcon } from "@/components/ui/icons";
import { boldNumber } from "./safety-format";
import type { SafetyTier } from "@/lib/types";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      element.getAttribute("hidden") === null,
  );
}

export function SafetyOverlay({
  tier,
  manual,
  onDismiss,
  returnFocusRef,
}: {
  tier: SafetyTier;
  manual: boolean;
  onDismiss: () => void;
  returnFocusRef?: { readonly current: HTMLElement | null };
}) {
  const level = (tier >= 1 ? tier : 1) as 1 | 2 | 3;
  const copy = manual
    ? {
        title: "Support is always one tap away",
        body: "Whatever you're feeling right now, you don't have to face it alone. These lines are free, confidential, and available 24/7.",
        dismiss: "Back to the conversation",
      }
    : SAFETY_COPY[level];
  const urgent = !manual && tier === 3;
  const dialogRef = useRef<HTMLDivElement>(null);
  const onDismissRef = useRef(onDismiss);
  const urgentRef = useRef(urgent);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onDismissRef.current = onDismiss;
    urgentRef.current = urgent;
  }, [onDismiss, urgent]);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;
    const dialog: HTMLDivElement = dialogElement;

    const previouslyFocused =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);

    dialog.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!urgentRef.current) {
          event.preventDefault();
          onDismissRef.current();
        }
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = focusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (
        event.shiftKey &&
        (active === first || active === dialog || !dialog.contains(active))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !dialog.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        dialog.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [returnFocusRef]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={urgent ? undefined : onDismiss}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative w-full max-w-md animate-rise rounded-3xl bg-air p-6 shadow-[0_28px_70px_rgba(20,96,59,0.16)] ring-1 ring-hairline focus:outline-none sm:p-7"
      >
        <a
          href={QUICK_EXIT_HREF}
          className="absolute right-4 top-4 rounded-full bg-surface-2 px-2.5 py-1 text-[0.7rem] font-medium text-ink-muted transition-colors hover:bg-hairline"
        >
          Quick exit
        </a>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            urgent ? "bg-alert-soft text-alert" : "bg-mint-soft text-forest"
          }`}
        >
          <ShieldIcon width={22} height={22} />
        </div>

        <h2 id={titleId} className="mt-4 font-serif text-2xl leading-snug text-ink">
          {copy.title}
        </h2>
        <p
          id={descriptionId}
          className="mt-2 text-[0.98rem] leading-relaxed text-ink-muted"
        >
          {copy.body}
        </p>

        <div className="mt-5 space-y-2.5">
          {CRISIS_RESOURCES.map((resource) => (
            <a
              key={resource.name}
              href={resource.href}
              className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface/90 p-3.5 transition-colors hover:border-feather"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-forest">
                <LifebuoyIcon width={18} height={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {resource.action}
                </span>
                <span className="block text-xs text-ink-muted">
                  {boldNumber(resource.detail, resource.number)}
                </span>
              </span>
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 font-medium text-mint transition-colors hover:bg-forest-700"
        >
          <CloseIcon width={17} height={17} /> {copy.dismiss}
        </button>

        <p className="mt-4 text-[0.7rem] leading-relaxed text-ink-muted">
          {SAFETY_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

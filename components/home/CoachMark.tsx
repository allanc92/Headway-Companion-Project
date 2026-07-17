"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CloseIcon, SparkIcon } from "@/components/ui/icons";

const SHOW_DELAY_MS = 1_000;
const VISIBLE_DURATION_MS = 5_000;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function CoachMark() {
  const [visible, setVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const timeoutId = window.setTimeout(() => setVisible(false), VISIBLE_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [visible]);

  function dismiss() {
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 0, scale: 0.98, y: -8 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.98, y: -4 }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.28, ease: EASE_OUT }
          }
          onClick={dismiss}
          className="absolute left-0 top-full z-20 mt-3 w-full cursor-pointer rounded-2xl border border-sky-ink/20 bg-sky p-4 pr-11 text-left shadow-[0_18px_45px_rgba(28,29,26,0.16)] sm:left-auto sm:right-0 sm:w-80"
        >
          <span
            aria-hidden="true"
            className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-sky-ink/20 bg-sky sm:left-auto sm:right-12 sm:translate-x-0"
          />

          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 text-sky-ink">
              <SparkIcon width={18} height={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                New - meet Huey, your care companion
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-soft">
                Tap <span className="font-semibold text-ink">Find care</span> to start a
                supportive, guided conversation that finds the right therapist for you.
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Dismiss Find care tip"
            onClick={(event) => {
              event.stopPropagation();
              dismiss();
            }}
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-white/70 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-ink"
          >
            <CloseIcon width={15} height={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

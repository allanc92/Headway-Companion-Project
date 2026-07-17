"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { HeartIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/home/Wordmark";

type GettingStartedProps = {
  zip?: string;
  insurance?: string;
  providerCount?: string;
  stateName?: string | null;
};

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

function ChatBubbleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.6 16.7c-1.2-1.2-1.9-2.8-1.9-4.6 0-4 3.7-7.2 8.3-7.2s8.3 3.2 8.3 7.2-3.7 7.2-8.3 7.2c-.9 0-1.8-.1-2.6-.4L5 20.3l1.1-3.1-.5-.5Z" />
      <path d="M8.7 11.8h6.6M8.7 14.3h4.2" />
    </svg>
  );
}

function CalmChairIllustration() {
  return (
    <svg
      viewBox="0 0 180 150"
      role="img"
      aria-label="A person sitting calmly in a chair"
      className="mx-auto h-auto w-36 sm:w-40"
    >
      <ellipse cx="92" cy="132" rx="62" ry="9" fill="#cfe4d5" opacity="0.7" />
      <path
        d="M46 77c0-19 15-34 34-34h18c20 0 36 16 36 36v42H46V77Z"
        fill="#c97052"
      />
      <path
        d="M55 84c0-15 12-27 27-27h13c15 0 27 12 27 27v37H55V84Z"
        fill="#de8a68"
      />
      <path d="M43 121h92v10H43z" fill="#9e523d" />
      <path d="M54 129h12v13H54zM113 129h12v13h-12z" fill="#8c4938" />
      <circle cx="91" cy="41" r="17" fill="#b97962" />
      <path
        d="M75 38c3-16 23-23 35-9 5 6 4 14 1 20-7-4-15-8-25-8-5 0-8 1-11 3v-6Z"
        fill="#35445b"
      />
      <path
        d="M70 74c8-13 19-19 33-18 11 1 22 9 28 22l-9 31H74L70 74Z"
        fill="#476f91"
      />
      <path
        d="M75 83c-12 8-22 12-32 11M126 83c8 9 17 13 28 11"
        stroke="#b97962"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M70 108h56l-8 20H82l-12-20Z" fill="#24384f" />
      <path
        d="M70 68c10 10 22 14 37 8"
        stroke="#d7e8f3"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M60 96c16-6 32-6 48 0"
        stroke="#f7f9f5"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
    </svg>
  );
}

export function GettingStarted({
  zip = "",
  insurance = "",
  providerCount,
  stateName,
}: GettingStartedProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  function handleNext() {
    const params = new URLSearchParams();
    const cleanZip = zip.replace(/\D/g, "").slice(0, 5);
    if (cleanZip) params.set("zip", cleanZip);
    if (insurance) params.set("insurance", insurance);
    const query = params.toString();
    router.push(query ? `/intake?${query}` : "/intake");
  }

  const container = {
    hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : { duration: 0.55, ease: easeOut, staggerChildren: 0.09, delayChildren: 0.06 },
    },
  };

  const item = {
    hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion ? { duration: 0 } : { duration: 0.42, ease: easeOut },
    },
  };

  return (
    <div
      className="relative isolate flex min-h-dvh flex-col overflow-hidden px-5 text-ink sm:px-8"
      style={{
        background:
          "radial-gradient(circle at 88% 92%, rgba(207, 226, 118, 0.46) 0%, rgba(207, 226, 118, 0.28) 24%, rgba(207, 226, 118, 0) 52%), radial-gradient(circle at 15% 82%, rgba(232, 244, 238, 0.78) 0%, rgba(232, 244, 238, 0.28) 34%, rgba(232, 244, 238, 0) 62%), linear-gradient(180deg, #dcebf7 0%, #eef6fb 32%, #fbfcf8 58%, #f3f8df 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.72),rgba(255,255,255,0)_68%)]"
      />

      <header className="pt-5 sm:pt-7">
        <Wordmark />
      </header>

      <main className="flex flex-1 flex-col">
        <motion.section
          variants={container}
          initial="hidden"
          animate="visible"
          className="mx-auto w-full max-w-[34rem] pt-[clamp(3.75rem,9vh,6.75rem)]"
          aria-labelledby="getting-started-heading"
        >
          <motion.h1
            id="getting-started-heading"
            variants={item}
            className="text-balance font-serif text-[clamp(2.35rem,11vw,4rem)] leading-[0.98] tracking-[-0.035em] text-ink"
          >
            {stateName && providerCount ? (
              <>
                We have{" "}
                <span className="text-brand">
                  {providerCount} providers in {stateName}
                </span>{" "}
                taking new patients.
              </>
            ) : (
              "We have thousands of providers taking new patients."
            )}
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 text-pretty text-base leading-7 text-[#33433d] sm:text-lg"
          >
            Instead of scrolling through all of them, we&apos;ll narrow it down based on
            what&apos;s important to you, in your own words.
          </motion.p>

          <motion.div variants={item} className="mt-8">
            <StepRow
              icon={<ChatBubbleIcon />}
              title="Answer a few questions"
              subtitle="Tell us what matters most to you"
              shouldReduceMotion={shouldReduceMotion}
            />
            <div className="ml-14 h-px bg-[#cdded5]" />
            <StepRow
              icon={<HeartIcon width={20} height={20} />}
              title="Get your match"
              subtitle="We'll show you the best options for you"
              shouldReduceMotion={shouldReduceMotion}
            />
          </motion.div>

          <motion.div variants={item} className="mt-8 sm:mt-10">
            <CalmChairIllustration />
          </motion.div>
        </motion.section>

        <div className="mx-auto mt-auto w-full max-w-[34rem] pb-6 pt-8 sm:pb-10">
          <button
            type="button"
            onClick={handleNext}
            className="flex w-full items-center justify-center rounded-2xl bg-[#171914] px-8 py-4 text-base font-semibold text-white shadow-[0_16px_38px_rgba(20,31,24,0.18)] transition-colors hover:bg-[#25281f] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-forest disabled:opacity-70"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}

function StepRow({
  icon,
  title,
  subtitle,
  shouldReduceMotion,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  shouldReduceMotion: boolean | null;
}) {
  return (
    <motion.div
      variants={{
        hidden: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: shouldReduceMotion ? { duration: 0 } : { duration: 0.36, ease: easeOut },
        },
      }}
      className="flex items-center gap-4 py-4"
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dff2e7] text-forest ring-1 ring-[#c7e5d3]"
      >
        {icon}
      </span>
      <span>
        <span className="block text-[1.02rem] font-semibold leading-6 text-ink">{title}</span>
        <span className="mt-0.5 block text-sm leading-6 text-[#52635d]">{subtitle}</span>
      </span>
    </motion.div>
  );
}

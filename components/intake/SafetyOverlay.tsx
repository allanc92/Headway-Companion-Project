"use client";



import {

  CRISIS_RESOURCES,

  SAFETY_COPY,

  SAFETY_DISCLAIMER,

  QUICK_EXIT_HREF,

} from "@/lib/copy";

import { ShieldIcon, CloseIcon, LifebuoyIcon } from "@/components/ui/icons";

import type { SafetyTier } from "@/lib/types";



export function SafetyOverlay({

  tier,

  manual,

  onDismiss,

}: {

  tier: SafetyTier;

  manual: boolean;

  onDismiss: () => void;

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



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      <div

        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"

        onClick={urgent ? undefined : onDismiss}

      />

      <div className="relative w-full max-w-md animate-rise rounded-3xl bg-air p-6 shadow-[0_28px_70px_rgba(20,96,59,0.16)] ring-1 ring-hairline sm:p-7">

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



        <h2 className="mt-4 font-serif text-2xl leading-snug text-ink">{copy.title}</h2>

        <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-muted">{copy.body}</p>



        <div className="mt-5 space-y-2.5">

          {CRISIS_RESOURCES.map((r) => (

            <a

              key={r.name}

              href={r.href}

              className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface/90 p-3.5 transition-colors hover:border-feather"

            >

              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-forest">

                <LifebuoyIcon width={18} height={18} />

              </span>

              <span className="min-w-0">

                <span className="block text-sm font-semibold text-ink">{r.action}</span>

                <span className="block text-xs text-ink-muted">{r.detail}</span>

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



        <p className="mt-4 text-[0.7rem] leading-relaxed text-ink-muted">{SAFETY_DISCLAIMER}</p>

      </div>

    </div>

  );

}




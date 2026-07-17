"use client";

import { useEffect, useState } from "react";
import { FeatherIcon } from "@/components/ui/icons";

const LINES = [
  "Taking in everything you shared…",
  "Listening for what matters most…",
  "Putting it into your own words…",
];

export function MirrorTransition() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % LINES.length), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center px-6 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-breathe rounded-full bg-mint" />
        <span className="absolute inset-2 animate-breathe rounded-full bg-mint-200 [animation-delay:0.4s]" />
        <FeatherIcon width={34} height={34} className="relative text-feather" />
      </div>

      <p
        key={i}
        className="mt-8 animate-rise font-serif text-xl text-ink sm:text-2xl"
        aria-live="polite"
      >
        {LINES[i]}
      </p>

      <div className="mt-6 w-full max-w-xs space-y-2.5">
        <div className="h-2.5 w-full rounded-full shimmer-line" />
        <div className="mx-auto h-2.5 w-3/4 rounded-full shimmer-line" />
        <div className="mx-auto h-2.5 w-1/2 rounded-full shimmer-line" />
      </div>
    </div>
  );
}

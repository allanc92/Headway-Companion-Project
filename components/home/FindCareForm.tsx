"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INSURANCE_PLANS } from "@/lib/providers";
import { PinIcon, CardIcon, ChevronDownIcon } from "@/components/ui/icons";
import { CoachMark } from "./CoachMark";

export function FindCareForm() {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [insurance, setInsurance] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const params = new URLSearchParams();
    const cleanZip = zip.replace(/\D/g, "").slice(0, 5);
    if (cleanZip) params.set("zip", cleanZip);
    if (insurance) params.set("insurance", insurance);
    router.push(`/getting-started?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 sm:grid-cols-[minmax(8.5rem,0.75fr)_minmax(12rem,1.35fr)_auto] sm:items-end"
    >
      <div>
        <label htmlFor="find-care-zip" className="text-sm font-medium text-ink">
          Zip code
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-3 shadow-sm focus-within:border-forest">
          <PinIcon className="shrink-0 text-brand" />
          <input
            id="find-care-zip"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            inputMode="numeric"
            maxLength={5}
            placeholder="98101"
            aria-label="Zip code"
            className="w-full bg-transparent text-[0.98rem] text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
      </div>

      <div>
        <label htmlFor="find-care-insurance" className="text-sm font-medium text-ink">
          Insurance <span className="font-normal text-ink-faint">Optional</span>
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-3 shadow-sm focus-within:border-forest">
          <CardIcon className="shrink-0 text-brand" />
          <select
            id="find-care-insurance"
            value={insurance}
            onChange={(e) => setInsurance(e.target.value)}
            aria-label="Insurance"
            className="w-full cursor-pointer appearance-none bg-transparent pr-7 text-[0.98rem] text-ink outline-none"
          >
            <option value="">Find your plan</option>
            {INSURANCE_PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
            <option value="self-pay">I&apos;ll pay out of pocket</option>
            <option value="not-sure">I&apos;m not sure yet</option>
          </select>
          <ChevronDownIcon
            className="pointer-events-none -ml-7 shrink-0 text-ink-soft"
            width={18}
            height={18}
          />
        </div>
      </div>

      <div className="relative w-full sm:w-auto">
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-xl bg-forest px-6 py-3 font-medium text-white transition-colors hover:bg-forest-700 disabled:opacity-70 sm:w-auto"
        >
          {submitting ? "Opening…" : "Find care"}
        </button>
        <CoachMark />
      </div>
    </form>
  );
}

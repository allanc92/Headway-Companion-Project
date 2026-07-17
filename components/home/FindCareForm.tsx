"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INSURANCE_PLANS } from "@/lib/providers";
import { PinIcon, CardIcon, ArrowIcon } from "@/components/ui/icons";

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
    router.push(`/intake?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-white/80 p-2 shadow-sm sm:flex sm:items-stretch sm:gap-2 sm:p-2.5"
    >
      <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 focus-within:bg-mint/40">
        <PinIcon className="shrink-0 text-brand" />
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          inputMode="numeric"
          maxLength={5}
          placeholder="ZIP code"
          aria-label="ZIP code"
          className="w-full bg-transparent text-[0.98rem] text-ink outline-none placeholder:text-ink-faint"
        />
      </div>

      <div className="my-1 hidden w-px bg-line sm:block" />

      <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 focus-within:bg-mint/40">
        <CardIcon className="shrink-0 text-brand" />
        <select
          value={insurance}
          onChange={(e) => setInsurance(e.target.value)}
          aria-label="Insurance"
          className="w-full cursor-pointer bg-transparent text-[0.98rem] text-ink outline-none"
        >
          <option value="">Select your insurance</option>
          {INSURANCE_PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
          <option value="self-pay">I&apos;ll pay out of pocket</option>
          <option value="not-sure">I&apos;m not sure yet</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-6 py-3 font-medium text-mint transition-colors hover:bg-forest-700 disabled:opacity-70 sm:mt-0 sm:w-auto"
      >
        {submitting ? "Opening…" : "Find care"}
        {!submitting && <ArrowIcon width={18} height={18} />}
      </button>
    </form>
  );
}

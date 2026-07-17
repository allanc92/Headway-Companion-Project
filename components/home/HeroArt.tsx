import { FeatherIcon, CheckIcon, HeartIcon } from "@/components/ui/icons";

/* Abstract, copyright-safe hero composition — soft shapes + a floating provider card. */
export function HeroArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      {/* soft background blobs */}
      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-mint-200 to-mint" />
      <div className="absolute -right-4 top-8 h-28 w-28 rounded-full bg-coral/25 blur-xl" />
      <div className="absolute bottom-6 -left-4 h-32 w-32 rounded-full bg-sage/30 blur-xl" />
      <div className="absolute right-10 bottom-16 h-16 w-16 rounded-full bg-mustard/30 blur-lg" />

      {/* floating feather cue */}
      <div className="absolute left-6 top-6 flex h-12 w-12 animate-float items-center justify-center rounded-2xl bg-white/85 text-feather shadow-sm">
        <FeatherIcon width={24} height={24} />
      </div>

      {/* provider mini-card */}
      <div className="absolute left-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white/90 p-5 shadow-lg ring-1 ring-line/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-lg font-semibold text-mint">
            ER
          </div>
          <div>
            <p className="font-serif text-lg leading-tight text-ink">Elena Ruiz</p>
            <p className="text-xs text-ink-soft">LCSW · she/her</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-[0.7rem] font-medium text-forest-700">
            <CheckIcon width={13} height={13} /> In network
          </span>
          <span className="rounded-full bg-sand px-2.5 py-1 text-[0.7rem] font-medium text-ink-soft">
            Grief &amp; loss
          </span>
        </div>
        <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-soft">
          &ldquo;I hold quiet, steady space at whatever pace feels right for you.&rdquo;
        </p>
      </div>

      {/* floating heart / availability pill */}
      <div className="absolute bottom-8 right-6 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 shadow-md ring-1 ring-line/60">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-coral/20 text-coral">
          <HeartIcon width={14} height={14} />
        </span>
        <span className="text-[0.72rem] font-medium text-ink">Open this week</span>
      </div>
    </div>
  );
}

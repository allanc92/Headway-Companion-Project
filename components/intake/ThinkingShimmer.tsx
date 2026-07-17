import { FeatherIcon } from "@/components/ui/icons";

export function ThinkingShimmer({ label = "Sitting with that…" }: { label?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-feather">
        <FeatherIcon width={17} height={17} />
      </div>
      <div className="space-y-2 pt-1.5">
        <div className="h-2.5 w-44 rounded-full shimmer-line" />
        <div className="h-2.5 w-28 rounded-full shimmer-line" />
        <span className="block pt-0.5 text-xs text-ink-faint">{label}</span>
      </div>
    </div>
  );
}

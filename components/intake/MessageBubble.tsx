import { FeatherIcon } from "@/components/ui/icons";
import { QUICK_EXIT_HREF, SAFETY_DISCLAIMER, SAFETY_WEAVE } from "@/lib/copy";
import type { ChatMessage } from "@/lib/types";
import { renderWeave } from "./safety-format";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const paragraphs = message.text.split("\n\n").filter((p) => p.trim().length > 0);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-3xl rounded-br-lg bg-mint-soft px-4 py-3 text-[1.02rem] leading-relaxed text-ink">
          {paragraphs.map((p, i) => (
            <p key={i} className={i > 0 ? "mt-2" : ""}>
              {p}
            </p>
          ))}
        </div>
      </div>
    );
  }

  const safetyTier = (message.safetyTier ?? 0) as 0 | 1 | 2 | 3;

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-soft text-forest">
        <FeatherIcon width={17} height={17} />
      </div>
      <div className="max-w-[46ch] pt-0.5 text-[1.05rem] leading-relaxed text-ink">
        {paragraphs.map((p, i) => (
          <p key={i} className={i > 0 ? "mt-3" : ""}>
            {p}
          </p>
        ))}
        {message.text.length === 0 && (
          <span className="inline-block h-4 w-2 animate-breathe rounded-full bg-feather align-middle" />
        )}
        {safetyTier >= 1 && (
          <div className={paragraphs.length > 0 ? "mt-3 space-y-2" : "space-y-2"}>
            <p>{renderWeave(SAFETY_WEAVE[safetyTier as 1 | 2 | 3])}</p>
            <p className="pt-1 text-xs leading-relaxed text-ink-muted">
              {SAFETY_DISCLAIMER}
            </p>
            <a
              href={QUICK_EXIT_HREF}
              className="inline-block text-xs font-medium text-ink-muted underline underline-offset-2 transition-colors hover:text-ink"
            >
              Quick exit
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

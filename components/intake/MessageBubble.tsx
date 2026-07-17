import { FeatherIcon } from "@/components/ui/icons";
import type { ChatMessage } from "@/lib/types";

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
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ThinkingShimmer } from "./ThinkingShimmer";
import { SparkChips } from "./SparkChips";
import { Composer } from "./Composer";
import { READY_LABEL } from "@/lib/copy";
import { HeartIcon } from "@/components/ui/icons";
import type { ChatMessage } from "@/lib/types";
import type { ChatStatus } from "./useCompanionChat";

export function Conversation({
  messages,
  status,
  userTurnCount,
  onSend,
  onReady,
}: {
  messages: ChatMessage[];
  status: ChatStatus;
  userTurnCount: number;
  onSend: (text: string) => void;
  onReady: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const streaming = status === "streaming";
  const last = messages[messages.length - 1];
  const waitingForReply = streaming && last?.role === "assistant" && last.text === "";

  const visibleMessages = waitingForReply ? messages.slice(0, -1) : messages;
  const showChips = userTurnCount === 0;
  // Appear once the conversation has had room to move from feelings toward what would help,
  // so the person can gracefully close it out — never forced, just available.
  const showReady = userTurnCount >= 3 && !streaming;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waitingForReply]);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="flex-1 space-y-6 pb-6">
        {visibleMessages.map((m) => (
          <div key={m.id} className="animate-rise">
            <MessageBubble message={m} />
          </div>
        ))}
        {waitingForReply && (
          <div className="animate-rise">
            <ThinkingShimmer />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 space-y-3 bg-gradient-to-t from-cream via-cream to-transparent pb-5 pt-3">
        {showReady && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onReady}
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-4 py-2 text-sm text-ink-soft transition-colors hover:border-feather hover:text-ink"
            >
              <HeartIcon width={15} height={15} className="text-feather" />
              {READY_LABEL}
            </button>
          </div>
        )}
        {showChips && <SparkChips onPick={onSend} disabled={streaming} />}
        <Composer
          onSend={onSend}
          disabled={streaming}
          placeholder={
            userTurnCount === 0
              ? "Whatever's on your mind. There's no right way to begin…"
              : "Take your time…"
          }
        />
      </div>
    </div>
  );
}

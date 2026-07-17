"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ThinkingShimmer } from "./ThinkingShimmer";
import { SparkChips } from "./SparkChips";
import { Composer } from "./Composer";
import type { ChatMessage } from "@/lib/types";
import type { ChatStatus } from "./useCompanionChat";

export function Conversation({
  messages,
  status,
  userTurnCount,
  onSend,
}: {
  messages: ChatMessage[];
  status: ChatStatus;
  userTurnCount: number;
  onSend: (text: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const streaming = status === "streaming";
  const last = messages[messages.length - 1];
  const waitingForReply = streaming && last?.role === "assistant" && last.text === "";

  const visibleMessages = waitingForReply ? messages.slice(0, -1) : messages;
  const showChips = userTurnCount === 0;

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

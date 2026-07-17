"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ThinkingShimmer } from "./ThinkingShimmer";
import { SparkChips } from "./SparkChips";
import { Composer } from "./Composer";
import type { ChatMessage } from "@/lib/types";
import type { ChatStatus } from "./useCompanionChat";
import type { ReactNode } from "react";

const BOTTOM_STICK_THRESHOLD_PX = 120;

function isWindowNearBottom() {
  const page = document.documentElement;
  return page.scrollHeight - (window.scrollY + window.innerHeight) <= BOTTOM_STICK_THRESHOLD_PX;
}

export function Conversation({
  messages,
  status,
  userTurnCount,
  onSend,
  afterMessages,
  progressKey,
  composerDisabled = false,
}: {
  messages: ChatMessage[];
  status: ChatStatus;
  userTurnCount: number;
  onSend: (text: string) => void;
  afterMessages?: ReactNode;
  progressKey?: string;
  composerDisabled?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const streaming = status === "streaming";
  const last = messages[messages.length - 1];
  const waitingForReply = streaming && last?.role === "assistant" && last.text === "";

  const visibleMessages = waitingForReply ? messages.slice(0, -1) : messages;
  const showChips = userTurnCount === 0 && !composerDisabled;

  useEffect(() => {
    function updateStickiness() {
      shouldStickToBottomRef.current = isWindowNearBottom();
    }

    updateStickiness();
    window.addEventListener("scroll", updateStickiness, { passive: true });
    window.addEventListener("resize", updateStickiness);

    return () => {
      window.removeEventListener("scroll", updateStickiness);
      window.removeEventListener("resize", updateStickiness);
    };
  }, []);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;

    const behavior: ScrollBehavior = streaming ? "auto" : "smooth";

    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      endRef.current?.scrollIntoView({ behavior, block: "end" });
    });

    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [messages, streaming, waitingForReply, progressKey]);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="flex-1 space-y-10 pb-12 sm:space-y-12 sm:pb-16">
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
        {afterMessages}
        <div ref={endRef} className="h-px scroll-mb-[8.5rem] sm:scroll-mb-[9.5rem]" />
      </div>

      <div className="sticky bottom-0 space-y-3 chat-composer-fade pb-5 pt-3">
        {showChips && <SparkChips onPick={onSend} disabled={streaming} />}
        <Composer
          onSend={onSend}
          disabled={streaming || composerDisabled}
          placeholder={
            composerDisabled
              ? "Use the choices in the thread below…"
              : userTurnCount === 0
              ? "Whatever's on your mind. There's no right way to begin…"
              : "Take your time…"
          }
        />
      </div>
    </div>
  );
}

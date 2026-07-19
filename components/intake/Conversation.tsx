"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ThinkingShimmer } from "./ThinkingShimmer";
import { SparkChips } from "./SparkChips";
import { Composer } from "./Composer";
import { VoiceControls } from "./VoiceControls";
import type { ChatMessage } from "@/lib/types";
import type { ChatStatus } from "./useCompanionChat";
import type { VoiceStatus } from "./useVoiceSession";
import type { ReactNode } from "react";

const BOTTOM_STICK_THRESHOLD_PX = 120;
const GENERIC_THINKING_LABELS = [
  "Taking in what you shared…",
  "Finding the thread in that…",
  "Putting a response together…",
] as const;

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
  composerPlaceholder,
  voiceEnabled = false,
  voiceStatus = "idle",
  voiceMicLevel = 0,
  voiceFallbackMessage = null,
  voiceDisabled = false,
  onVoiceStart,
  onVoiceEnd,
}: {
  messages: ChatMessage[];
  status: ChatStatus;
  userTurnCount: number;
  onSend: (text: string) => void;
  afterMessages?: ReactNode;
  progressKey?: string;
  composerDisabled?: boolean;
  composerPlaceholder?: string;
  voiceEnabled?: boolean;
  voiceStatus?: VoiceStatus;
  voiceMicLevel?: number;
  voiceFallbackMessage?: string | null;
  voiceDisabled?: boolean;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);
  const streaming = status.type === "streaming";
  const last = messages[messages.length - 1];
  const waitingForReply = streaming && last?.role === "assistant" && last.text === "";
  const thinkingLabel =
    GENERIC_THINKING_LABELS[
      (Math.max(userTurnCount, 1) - 1) % GENERIC_THINKING_LABELS.length
    ];

  const visibleMessages = waitingForReply ? messages.slice(0, -1) : messages;
  // Pristine opening (no user turns yet, composer active): center the greeting,
  // chips and composer as one calm focal group rather than stranding the first
  // message at the top of a tall viewport. Flips to the growing transcript once
  // the conversation begins.
  const isWelcome = userTurnCount === 0 && !composerDisabled;
  // Hold the chips back until Huey's greeting has finished streaming, so they
  // don't appear before the person has even been welcomed.
  const showChips = isWelcome && !streaming;

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
    <div
      className={`flex min-h-[calc(100dvh-8rem)] flex-col${
        isWelcome ? " justify-center" : ""
      }`}
    >
      <div
        className={
          isWelcome
            ? "space-y-10 pb-8 sm:space-y-12"
            : "flex-1 space-y-10 pb-12 sm:space-y-12 sm:pb-16"
        }
      >
        {visibleMessages.map((m) => (
          <div key={m.id} className="animate-rise">
            <MessageBubble message={m} />
          </div>
        ))}
        {waitingForReply && (
          <div className="animate-rise">
            <ThinkingShimmer label={thinkingLabel} />
          </div>
        )}
        {afterMessages}
        <div ref={endRef} className="h-px scroll-mb-[8.5rem] sm:scroll-mb-[9.5rem]" />
      </div>

      <div
        className={
          isWelcome
            ? "space-y-3 pt-3"
            : "sticky bottom-0 space-y-3 chat-composer-fade pb-5 pt-3"
        }
      >
        {showChips && <SparkChips onPick={onSend} disabled={streaming} />}

        {voiceEnabled && onVoiceStart && onVoiceEnd && (
          <VoiceControls
            status={voiceStatus}
            micLevel={voiceMicLevel}
            fallbackMessage={voiceFallbackMessage}
            disabled={voiceDisabled}
            onStart={onVoiceStart}
            onEnd={onVoiceEnd}
          />
        )}

        <Composer
          onSend={onSend}
          disabled={streaming || composerDisabled}
          placeholder={
            composerPlaceholder ??
            (composerDisabled
              ? "Use the choices in the thread below…"
              : userTurnCount === 0
              ? "Whatever's on your mind. There's no right way to begin…"
              : "Take your time…")
          }
        />
      </div>
    </div>
  );
}

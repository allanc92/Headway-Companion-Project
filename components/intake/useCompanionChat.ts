"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MIRROR_READY_MARKER } from "@/lib/types";
import { mirrorSafetyNet } from "@/lib/signal";
import type { ChatMessage, SafetyTier } from "@/lib/types";

let counter = 0;
const genId = () => `m${++counter}-${Date.now()}`;

/** Fixed id for the assistant's opening greeting bubble. */
const OPENING_ID = "opening";

export type ChatStatus = "idle" | "streaming";

/**
 * Strip the readiness marker (and any partial trailing fragment of it that is
 * still mid-stream) from text meant for display, so the sentinel never flashes
 * on screen. Returns the clean text and whether the full marker was present.
 */
function extractReadiness(raw: string): { text: string; ready: boolean } {
  if (raw.includes(MIRROR_READY_MARKER)) {
    const text = raw.split(MIRROR_READY_MARKER).join("").trimEnd();
    return { text, ready: true };
  }
  // Hide a partial marker that may still be arriving token-by-token.
  for (let i = MIRROR_READY_MARKER.length - 1; i > 0; i--) {
    const partial = MIRROR_READY_MARKER.slice(0, i);
    if (raw.endsWith(partial)) {
      return { text: raw.slice(0, -partial.length).trimEnd(), ready: false };
    }
  }
  return { text: raw, ready: false };
}

interface StreamOptions {
  /** Whether to watch for the Mirror-readiness marker (never on the greeting). */
  trackReadiness: boolean;
  /** Shown if the stream finishes empty. */
  emptyFallback: string;
  /** Shown if the request fails outright. */
  errorFallback: string;
}

export function useCompanionChat() {
  // Huey opens the conversation, but the greeting is generated live on mount
  // (see greet()) rather than canned — so it starts empty and streams in.
  const openingMessage: ChatMessage = {
    id: OPENING_ID,
    role: "assistant",
    text: "",
  };
  const [messages, setMessages] = useState<ChatMessage[]>([openingMessage]);
  const [status, setStatus] = useState<ChatStatus>("streaming");
  const [ready, setReady] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([openingMessage]);
  const busyRef = useRef(false);
  const didGreetRef = useRef(false);

  const commit = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        messagesRef.current = next;
        return next;
      });
    },
    [],
  );

  // Shared stream consumer for both the opening greeting and ordinary replies:
  // reads the token stream into the target assistant bubble, hides the readiness
  // marker, and degrades gracefully on empty/failed responses.
  const runStream = useCallback(
    async (assistantId: string, body: unknown, opts: StreamOptions) => {
      setStatus("streaming");
      busyRef.current = true;
      if (opts.trackReadiness) setReady(false);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        let sawReady = false;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const { text, ready: isReady } = extractReadiness(acc);
          if (isReady) sawReady = true;
          commit((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, text } : m)),
          );
        }
        const { text: finalText, ready: finalReady } = extractReadiness(acc);
        if (!finalText.trim()) {
          commit((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, text: opts.emptyFallback } : m,
            ),
          );
        }
        // Primary signal: the model appends the readiness marker when it judges the
        // conversation is deep enough for the Mirror. Safety net: if it never does but
        // the conversation has run enough substantive turns, force the transition so it
        // can't circle forever. Only while tracking readiness (never on the greeting).
        if (opts.trackReadiness) {
          const userTexts = messagesRef.current
            .filter((m) => m.role === "user")
            .map((m) => m.text);
          if (finalReady || sawReady || mirrorSafetyNet(userTexts)) setReady(true);
        }
      } catch {
        commit((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, text: opts.errorFallback } : m,
          ),
        );
      } finally {
        setStatus("idle");
        busyRef.current = false;
      }
    },
    [commit],
  );

  // Ask Huey to open the conversation. Fired once on mount.
  const greet = useCallback(async () => {
    await runStream(
      OPENING_ID,
      { messages: [] },
      {
        trackReadiness: false,
        emptyFallback:
          "Hi, I'm Huey, your Headway care companion. Whenever you're ready, tell me what's on your mind — there's no right way to begin.",
        errorFallback:
          "Hi, I'm Huey, your Headway care companion. I had a little trouble loading just now, but I'm here. Whenever you're ready, tell me what's on your mind.",
      },
    );
  }, [runStream]);

  useEffect(() => {
    if (didGreetRef.current) return;
    didGreetRef.current = true;
    void greet();
  }, [greet]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current) return;

      const userMsg: ChatMessage = { id: genId(), role: "user", text: trimmed };
      const convo = [...messagesRef.current, userMsg];
      const assistantId = genId();
      commit(() => [...convo, { id: assistantId, role: "assistant", text: "" }]);

      await runStream(
        assistantId,
        { messages: convo.map((m) => ({ role: m.role, text: m.text })) },
        {
          trackReadiness: true,
          emptyFallback: "I'm here with you. Take your time.",
          errorFallback:
            "I'm still here with you. I had trouble responding just then — whenever you're ready, try again.",
        },
      );
    },
    [commit, runStream],
  );

  const addAssistantMessage = useCallback(
    (text: string) => {
      const msg: ChatMessage = { id: genId(), role: "assistant", text };
      const next = [...messagesRef.current, msg];
      commit(() => next);
      return next;
    },
    [commit],
  );

  const addUserMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return messagesRef.current;
      const msg: ChatMessage = { id: genId(), role: "user", text: trimmed };
      const next = [...messagesRef.current, msg];
      commit(() => next);
      return next;
    },
    [commit],
  );

  const userTurnCount = messages.filter((m) => m.role === "user").length;

  // Latest transcript, read straight from the ref so callers (e.g. a synth retry)
  // always see messages added since their last read, not a stale snapshot.
  const getMessages = useCallback(() => messagesRef.current, []);

  /**
   * Weave crisis resources into the most recent assistant turn so they render as
   * part of Huey's own reply (never a popup). Only ever escalates the tier on a
   * given message.
   */
  const flagSafety = useCallback(
    (tier: SafetyTier) => {
      if (tier < 1) return;
      commit((prev) => {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === "assistant") {
            const current = prev[i].safetyTier ?? 0;
            if (tier <= current) return prev;
            const next = [...prev];
            next[i] = { ...next[i], safetyTier: tier };
            return next;
          }
        }
        return prev;
      });
    },
    [commit],
  );

  return { messages, status, send, addAssistantMessage, addUserMessage, getMessages, userTurnCount, ready, flagSafety };
}

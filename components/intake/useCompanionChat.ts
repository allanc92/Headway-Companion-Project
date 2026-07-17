"use client";

import { useCallback, useRef, useState } from "react";
import { OPENING_LINES } from "@/lib/copy";
import { MIRROR_READY_MARKER } from "@/lib/types";
import type { ChatMessage } from "@/lib/types";

let counter = 0;
const genId = () => `m${++counter}-${Date.now()}`;

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

export function useCompanionChat() {
  const openingMessage: ChatMessage = {
    id: "opening",
    role: "assistant",
    text: OPENING_LINES.join("\n\n"),
  };
  const [messages, setMessages] = useState<ChatMessage[]>([openingMessage]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [ready, setReady] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([openingMessage]);
  const busyRef = useRef(false);

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

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current) return;

      const userMsg: ChatMessage = { id: genId(), role: "user", text: trimmed };
      const convo = [...messagesRef.current, userMsg];
      const assistantId = genId();
      commit(() => [...convo, { id: assistantId, role: "assistant", text: "" }]);

      setStatus("streaming");
      busyRef.current = true;
      setReady(false);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: convo.map((m) => ({ role: m.role, text: m.text })),
          }),
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
              m.id === assistantId
                ? { ...m, text: "I'm here with you. Take your time." }
                : m,
            ),
          );
        }
        if (finalReady || sawReady) setReady(true);
      } catch {
        commit((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text: "I'm still here with you. I had trouble responding just then — whenever you're ready, try again.",
                }
              : m,
          ),
        );
      } finally {
        setStatus("idle");
        busyRef.current = false;
      }
    },
    [commit],
  );

  const userTurnCount = messages.filter((m) => m.role === "user").length;

  return { messages, status, send, userTurnCount, ready };
}

"use client";

import { useCallback, useRef, useState } from "react";
import { OPENING_LINES } from "@/lib/copy";
import type { ChatMessage } from "@/lib/types";

let counter = 0;
const genId = () => `m${++counter}-${Date.now()}`;

export type ChatStatus = "idle" | "streaming";

export function useCompanionChat() {
  const openingMessage: ChatMessage = {
    id: "opening",
    role: "assistant",
    text: OPENING_LINES.join("\n\n"),
  };
  const [messages, setMessages] = useState<ChatMessage[]>([openingMessage]);
  const [status, setStatus] = useState<ChatStatus>("idle");
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
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          commit((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, text: acc } : m)),
          );
        }
        if (!acc.trim()) {
          commit((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, text: "I'm here with you. Take your time." }
                : m,
            ),
          );
        }
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

  return { messages, status, send, userTurnCount };
}

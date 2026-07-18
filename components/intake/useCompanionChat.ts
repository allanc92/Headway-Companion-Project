"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SUMMARY_READINESS_PROMPT } from "@/lib/copy";
import { MIRROR_READY_MARKER } from "@/lib/types";
import { mirrorSafetyNet } from "@/lib/signal";
import type { ChatMessage, SafetyTier } from "@/lib/types";

let counter = 0;
const genId = () => `m${++counter}-${Date.now()}`;
const genRequestId = () =>
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : genId();

/** Fixed id for the assistant's opening greeting bubble. */
const OPENING_ID = "opening";

export type ChatStatus =
  | { type: "idle" }
  | { type: "streaming" };

type ChatStreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      requestId: string;
      finishReason: string;
      usage: unknown;
      elapsedMs: number;
    }
  | { type: "error"; requestId: string; message: string };

class StreamInterruption extends Error {
  constructor(
    readonly requestId: string,
    readonly displayMessage: string,
  ) {
    super(displayMessage);
    this.name = "StreamInterruption";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStreamEvent(line: string): ChatStreamEvent {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw new Error("Invalid chat stream JSON");
  }

  if (!isRecord(value)) throw new Error("Invalid chat stream event");

  if (value.type === "delta" && typeof value.text === "string") {
    return { type: "delta", text: value.text };
  }
  if (
    value.type === "done" &&
    typeof value.requestId === "string" &&
    typeof value.finishReason === "string" &&
    typeof value.elapsedMs === "number" &&
    "usage" in value
  ) {
    return {
      type: "done",
      requestId: value.requestId,
      finishReason: value.finishReason,
      usage: value.usage,
      elapsedMs: value.elapsedMs,
    };
  }
  if (
    value.type === "error" &&
    typeof value.requestId === "string" &&
    typeof value.message === "string"
  ) {
    return {
      type: "error",
      requestId: value.requestId,
      message: value.message,
    };
  }

  throw new Error("Invalid chat stream event");
}

/**
 * Strip the readiness marker (and any partial trailing fragment of it that is
 * still mid-stream) from text meant for display, so the sentinel never flashes
 * on screen. Returns the clean text and whether the full marker was present.
 */
export function extractReadiness(raw: string): {
  text: string;
  ready: boolean;
} {
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

function extractVoiceReadiness(raw: string): {
  text: string;
  ready: boolean;
} {
  const result = extractReadiness(raw);
  const normalize = (text: string) =>
    text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return {
    text: result.text,
    ready:
      result.ready ||
      normalize(result.text) === normalize(SUMMARY_READINESS_PROMPT),
  };
}

export type VoiceReadinessDecision = "confirm" | "continue";

const VOICE_READINESS_CONFIRMATIONS = new Set([
  "yes",
  "yes please",
  "yeah",
  "yep",
  "i am ready",
  "im ready",
  "yes i am ready",
  "im ready for my summary",
  "i am ready for my summary",
  "im ready to see my summary",
  "i am ready to see my summary",
  "lets see my summary",
  "lets see the summary",
  "lets do it",
]);

const VOICE_READINESS_DECLINES = new Set([
  "no",
  "no thanks",
  "no thank you",
  "nope",
  "not yet",
  "no not yet",
  "i am not ready",
  "im not ready",
  "keep talking",
  "lets keep talking",
  "i want to keep talking",
  "id like to keep talking",
  "i would like to keep talking",
]);

export function classifyVoiceReadinessResponse(
  text: string,
): VoiceReadinessDecision | null {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (VOICE_READINESS_CONFIRMATIONS.has(normalized)) return "confirm";
  if (VOICE_READINESS_DECLINES.has(normalized)) return "continue";
  return null;
}

function readinessUserTexts(messages: ChatMessage[]): string[] {
  const readinessWindowStart = messages.reduce(
    (start, message, index) =>
      message.excludeFromSynthesis ? index + 1 : start,
    0,
  );
  return messages
    .slice(readinessWindowStart)
    .filter((message) => message.role === "user" && !message.excludeFromSynthesis)
    .map((message) => message.text);
}

interface StreamOptions {
  /** Whether this turn may trigger a summary-readiness offer. */
  trackReadiness: boolean;
  /** Shown if the stream finishes empty. */
  emptyFallback: string;
  /** Shown if the request fails outright. */
  errorFallback: string;
}

interface MessageOptions {
  excludeFromSynthesis?: boolean;
}

interface SendOptions extends MessageOptions {
  trackReadiness?: boolean;
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
  const [status, setStatus] = useState<ChatStatus>({ type: "streaming" });
  const [ready, setReady] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([openingMessage]);
  const busyRef = useRef(false);
  const didGreetRef = useRef(false);
  const voiceRawTextRef = useRef(new Map<string, string>());

  const commit = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      const next = updater(messagesRef.current);
      messagesRef.current = next;
      setMessages(next);
    },
    [],
  );

  // Shared stream consumer for both the opening greeting and ordinary replies:
  // reads the token stream into the target assistant bubble, hides the readiness
  // marker, and degrades gracefully on empty/failed responses.
  const runStream = useCallback(
    async function consumeStream(
      assistantId: string,
      body: unknown,
      opts: StreamOptions,
    ) {
      if (busyRef.current) return;

      const requestId = genRequestId();
      let diagnosticId = requestId;
      let acc = "";
      let sawReady = false;

      setStatus({ type: "streaming" });
      busyRef.current = true;
      setReady(false);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-request-id": requestId,
          },
          body: JSON.stringify(body),
        });
        diagnosticId = res.headers.get("x-request-id") || requestId;
        if (!res.ok) {
          throw new StreamInterruption(
            diagnosticId,
            "The response could not be completed.",
          );
        }
        if (!res.body) {
          throw new StreamInterruption(
            diagnosticId,
            "The response ended before it began.",
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let completed = false;

        const processLine = (line: string) => {
          if (!line.trim()) return;
          if (completed) throw new Error("Event received after done");

          const event = parseStreamEvent(line);
          if (event.type === "delta") {
            acc += event.text;
            const { text, ready: isReady } = extractReadiness(acc);
            if (isReady) sawReady = true;
            commit((prev) =>
              prev.map((message) =>
                message.id === assistantId ? { ...message, text } : message,
              ),
            );
            return;
          }

          if (event.requestId !== diagnosticId) {
            throw new Error("Chat stream request ID mismatch");
          }
          if (event.type === "error") {
            throw new StreamInterruption(event.requestId, event.message);
          }
          completed = true;
        };

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline = buffer.indexOf("\n");
          while (newline >= 0) {
            processLine(buffer.slice(0, newline));
            buffer = buffer.slice(newline + 1);
            newline = buffer.indexOf("\n");
          }
        }
        buffer += decoder.decode();
        if (buffer.trim()) processLine(buffer);
        if (!completed) {
          throw new StreamInterruption(
            diagnosticId,
            "The response ended before it finished.",
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
        // conversation is deep enough to offer a summary. The safety net ensures the
        // offer eventually appears if the conversation otherwise circles forever.
        if (opts.trackReadiness) {
          // A declined offer starts a fresh safety-net window. The model can still
          // offer sooner, but the fallback counter cannot immediately override the
          // person's choice to keep talking.
          const userTexts = readinessUserTexts(messagesRef.current);
          if (finalReady || sawReady || mirrorSafetyNet(userTexts)) {
            // Keep readiness in the assistant turn already on screen so the
            // person never sees two conflicting questions back-to-back.
            commit((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      text: SUMMARY_READINESS_PROMPT,
                      excludeFromSynthesis: true,
                    }
                  : message,
              ),
            );
            setReady(true);
          }
        }
        setStatus({ type: "idle" });
      } catch {
        const currentText =
          messagesRef.current.find((message) => message.id === assistantId)
            ?.text ?? "";
        // Keep a partial answer if any arrived. If none did, remove the empty
        // bubble without surfacing implementation details to the participant.
        if (!acc.trim() && !currentText.trim()) {
          commit((prev) => prev.filter((message) => message.id !== assistantId));
        }
        setStatus({ type: "idle" });
      } finally {
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
    async (text: string, options: SendOptions = {}) => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current) return;

      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        text: trimmed,
        excludeFromSynthesis: options.excludeFromSynthesis,
      };
      const convo = [...messagesRef.current, userMsg];
      const assistantId = genId();
      commit(() => [
        ...convo,
        {
          id: assistantId,
          role: "assistant",
          text: "",
          excludeFromSynthesis: options.excludeFromSynthesis,
        },
      ]);

      await runStream(
        assistantId,
        {
          messages: convo.map((m) => ({
            role: m.role,
            text: m.text,
            excludeFromSynthesis: m.excludeFromSynthesis,
          })),
        },
        {
          trackReadiness: options.trackReadiness ?? true,
          emptyFallback: "I'm here with you. Take your time.",
          errorFallback:
            "I'm still here with you. I had trouble responding just then — whenever you're ready, try again.",
        },
      );
    },
    [commit, runStream],
  );

  const addAssistantMessage = useCallback(
    (text: string, options: MessageOptions = {}) => {
      const msg: ChatMessage = {
        id: genId(),
        role: "assistant",
        text,
        excludeFromSynthesis: options.excludeFromSynthesis,
      };
      const next = [...messagesRef.current, msg];
      commit(() => next);
      return next;
    },
    [commit],
  );

  const addUserMessage = useCallback(
    (text: string, options: MessageOptions = {}) => {
      const trimmed = text.trim();
      if (!trimmed) return messagesRef.current;
      const msg: ChatMessage = {
        id: genId(),
        role: "user",
        text: trimmed,
        excludeFromSynthesis: options.excludeFromSynthesis,
      };
      const next = [...messagesRef.current, msg];
      commit(() => next);
      return next;
    },
    [commit],
  );

  const commitVoiceUserTurn = useCallback(
    (text: string, options: MessageOptions = {}) => {
      setReady(false);
      return addUserMessage(text, options);
    },
    [addUserMessage],
  );

  const beginVoiceAssistantTurn = useCallback(() => {
    const id = genId();
    voiceRawTextRef.current.set(id, "");
    commit((prev) => [
      ...prev,
      { id, role: "assistant", text: "" },
    ]);
    setStatus({ type: "streaming" });
    return id;
  }, [commit]);

  const appendVoiceAssistantDelta = useCallback(
    (id: string, delta: string) => {
      const raw = (voiceRawTextRef.current.get(id) ?? "") + delta;
      voiceRawTextRef.current.set(id, raw);
      const { text } = extractReadiness(raw);
      commit((prev) =>
        prev.map((message) =>
          message.id === id ? { ...message, text } : message,
        ),
      );
    },
    [commit],
  );

  const finalizeVoiceAssistantTurn = useCallback(
    (id: string, finalTranscript: string) => {
      const accumulated = voiceRawTextRef.current.get(id) ?? "";
      const raw = finalTranscript.trim() ? finalTranscript : accumulated;
      voiceRawTextRef.current.delete(id);
      const result = extractVoiceReadiness(raw);
      const isReady =
        result.ready ||
        mirrorSafetyNet(readinessUserTexts(messagesRef.current));

      if (!result.text.trim()) {
        commit((prev) => prev.filter((message) => message.id !== id));
      } else if (isReady) {
        commit((prev) =>
          prev.map((message) =>
            message.id === id
              ? {
                  ...message,
                  text: SUMMARY_READINESS_PROMPT,
                  excludeFromSynthesis: true,
                }
              : message,
          ),
        );
        setReady(true);
      } else {
        commit((prev) =>
          prev.map((message) =>
            message.id === id
              ? { ...message, text: result.text.trimEnd() }
              : message,
          ),
        );
      }
      setStatus({ type: "idle" });
    },
    [commit],
  );

  const interruptVoiceAssistantTurn = useCallback(
    (id: string) => {
      const raw = voiceRawTextRef.current.get(id) ?? "";
      voiceRawTextRef.current.delete(id);
      const { text } = extractReadiness(raw);
      commit((prev) =>
        text.trim()
          ? prev.map((message) =>
              message.id === id
                ? { ...message, text: text.trimEnd() }
                : message,
            )
          : prev.filter((message) => message.id !== id),
      );
      setStatus({ type: "idle" });
    },
    [commit],
  );

  const userTurnCount = messages.filter((m) => m.role === "user").length;

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

  return {
    messages,
    status,
    send,
    addAssistantMessage,
    addUserMessage,
    commitVoiceUserTurn,
    beginVoiceAssistantTurn,
    appendVoiceAssistantDelta,
    finalizeVoiceAssistantTurn,
    interruptVoiceAssistantTurn,
    userTurnCount,
    ready,
    flagSafety,
  };
}

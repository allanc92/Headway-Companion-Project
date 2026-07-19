"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VOICE_COPY } from "@/lib/copy";
import {
  parseRealtimeServerEvent,
  type VoiceTransportEvent,
} from "@/lib/realtime-events";
import type { ChatMessage } from "@/lib/types";

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "reconnecting"
  | "error";

export type VoiceUserTranscriptAction = "stop-listening";

interface VoiceSessionOptions {
  getConversation: () => ChatMessage[];
  onUserTranscript: (text: string) => VoiceUserTranscriptAction | void;
  onAssistantDelta: (turnId: string, text: string) => void;
  onAssistantDone: (turnId: string, text: string) => void;
  onAssistantPlaybackDone: (turnId: string | null) => void;
  onAssistantInterrupted: (turnId: string) => void;
}

interface VoiceSessionAuthorization {
  clientSecret: string;
  expiresAt: number;
  webrtcUrl: string;
}

class VoiceUnavailableError extends Error {
  constructor() {
    super("Voice is unavailable.");
    this.name = "VoiceUnavailableError";
  }
}

const MAX_RECONNECT_ATTEMPTS = 2;
const RECONNECT_DELAYS_MS = [600, 1_400] as const;
const REQUEST_TIMEOUT_MS = 8_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseVoiceSessionAuthorization(
  value: unknown,
): VoiceSessionAuthorization | null {
  if (!isRecord(value) || value.enabled !== true) return null;
  if (
    typeof value.clientSecret !== "string" ||
    !value.clientSecret ||
    typeof value.expiresAt !== "number" ||
    typeof value.webrtcUrl !== "string"
  ) {
    return null;
  }

  try {
    const url = new URL(value.webrtcUrl);
    if (url.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return {
    clientSecret: value.clientSecret,
    expiresAt: value.expiresAt,
    webrtcUrl: value.webrtcUrl,
  };
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function permissionWasDenied(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "NotFoundError")
  );
}

export function useVoiceSession(options: VoiceSessionOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

  const optionsRef = useRef(options);
  const statusRef = useRef<VoiceStatus>("idle");
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterFrameRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const generationRef = useRef(0);
  const intentionalStopRef = useRef(true);
  const activeAssistantRef = useRef<string | null>(null);
  const lastAssistantTurnRef = useRef<string | null>(null);
  const interruptedTurnsRef = useRef(new Set<string>());
  const responseTurnIdsRef = useRef(new Map<string, string>());
  const inputLockedRef = useRef(false);
  const handoffResponsePendingRef = useRef(false);
  const awaitingTranscriptRef = useRef(false);
  const queuedAssistantEventsRef = useRef<VoiceTransportEvent[]>([]);
  const localTurnCounterRef = useRef(0);
  const voiceOpeningPendingRef = useRef(false);
  const connectRef = useRef<
    ((generation: number) => Promise<void>) | null
  >(null);
  const recoverRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const updateStatus = useCallback((next: VoiceStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const interruptActiveAssistant = useCallback(() => {
    const turnId = activeAssistantRef.current;
    if (!turnId) return;
    interruptedTurnsRef.current.add(turnId);
    activeAssistantRef.current = null;
    optionsRef.current.onAssistantInterrupted(turnId);
  }, []);

  const closePeer = useCallback(() => {
    const channel = channelRef.current;
    channelRef.current = null;
    if (channel && channel.readyState !== "closed") channel.close();

    const peer = peerRef.current;
    peerRef.current = null;
    if (peer) {
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
    }

    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
    }
    responseTurnIdsRef.current.clear();
    lastAssistantTurnRef.current = null;
  }, []);

  const stopMeter = useCallback(() => {
    if (meterFrameRef.current !== null) {
      window.cancelAnimationFrame(meterFrameRef.current);
      meterFrameRef.current = null;
    }
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
    setMicLevel(0);
  }, []);

  const releaseAll = useCallback(() => {
    closePeer();
    const media = mediaRef.current;
    mediaRef.current = null;
    media?.getTracks().forEach((track) => track.stop());
    stopMeter();
  }, [closePeer, stopMeter]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const fallBackToText = useCallback(
    (permissionDenied = false) => {
      intentionalStopRef.current = true;
      generationRef.current += 1;
      clearReconnectTimer();
      interruptActiveAssistant();
      releaseAll();
      queuedAssistantEventsRef.current = [];
      awaitingTranscriptRef.current = false;
      voiceOpeningPendingRef.current = false;
      inputLockedRef.current = false;
      handoffResponsePendingRef.current = false;
      setFallbackMessage(
        permissionDenied
          ? VOICE_COPY.permissionFallback
          : VOICE_COPY.unavailableFallback,
      );
      updateStatus("error");
    },
    [
      clearReconnectTimer,
      interruptActiveAssistant,
      releaseAll,
      updateStatus,
    ],
  );

  const emitAssistantEvent = useCallback(
    (
      event: Extract<
        VoiceTransportEvent,
        { type: "assistant-delta" | "assistant-done" }
      >,
    ) => {
      const turnId =
        event.itemId ??
        activeAssistantRef.current ??
        `voice-turn-${++localTurnCounterRef.current}`;

      if (event.responseId) {
        responseTurnIdsRef.current.set(event.responseId, turnId);
      }
      handoffResponsePendingRef.current = false;
      if (interruptedTurnsRef.current.has(turnId)) return;
      lastAssistantTurnRef.current = turnId;
      if (
        activeAssistantRef.current &&
        activeAssistantRef.current !== turnId
      ) {
        interruptActiveAssistant();
      }
      activeAssistantRef.current = turnId;

      if (event.type === "assistant-delta") {
        optionsRef.current.onAssistantDelta(turnId, event.text);
        return;
      }

      if (activeAssistantRef.current === turnId) {
        activeAssistantRef.current = null;
      }
      optionsRef.current.onAssistantDone(turnId, event.text);
    },
    [interruptActiveAssistant],
  );

  const emitAssistantPlaybackDone = useCallback(
    (
      event: Extract<
        VoiceTransportEvent,
        { type: "assistant-audio-stopped" }
      >,
    ) => {
      const mappedTurnId = event.responseId
        ? responseTurnIdsRef.current.get(event.responseId) ?? null
        : null;
      const turnId =
        mappedTurnId ??
        activeAssistantRef.current ??
        lastAssistantTurnRef.current;
      if (event.responseId) {
        responseTurnIdsRef.current.delete(event.responseId);
      }
      if (lastAssistantTurnRef.current === turnId) {
        lastAssistantTurnRef.current = null;
      }
      optionsRef.current.onAssistantPlaybackDone(turnId);
    },
    [],
  );

  const flushQueuedAssistantEvents = useCallback(() => {
    const queued = queuedAssistantEventsRef.current;
    queuedAssistantEventsRef.current = [];
    for (const event of queued) {
      if (
        event.type === "assistant-delta" ||
        event.type === "assistant-done"
      ) {
        emitAssistantEvent(event);
      } else if (event.type === "assistant-audio-stopped") {
        emitAssistantPlaybackDone(event);
      }
    }
  }, [emitAssistantEvent, emitAssistantPlaybackDone]);

  const handleTransportEvent = useCallback(
    (event: VoiceTransportEvent) => {
      switch (event.type) {
        case "user-transcript":
          awaitingTranscriptRef.current = false;
          if (
            optionsRef.current.onUserTranscript(event.text) ===
            "stop-listening"
          ) {
            inputLockedRef.current = true;
            handoffResponsePendingRef.current = true;
            mediaRef.current
              ?.getAudioTracks()
              .forEach((track) => (track.enabled = false));
            setMicLevel(0);
          }
          flushQueuedAssistantEvents();
          return;
        case "assistant-delta":
        case "assistant-done":
          voiceOpeningPendingRef.current = false;
          if (awaitingTranscriptRef.current) {
            queuedAssistantEventsRef.current.push(event);
          } else {
            emitAssistantEvent(event);
          }
          return;
        case "user-speech-started":
          voiceOpeningPendingRef.current = false;
          awaitingTranscriptRef.current = true;
          queuedAssistantEventsRef.current = [];
          if (audioRef.current) audioRef.current.muted = true;
          interruptActiveAssistant();
          updateStatus("listening");
          return;
        case "user-speech-stopped":
          updateStatus("listening");
          return;
        case "assistant-audio-started":
          voiceOpeningPendingRef.current = false;
          if (audioRef.current) audioRef.current.muted = false;
          updateStatus("speaking");
          return;
        case "assistant-audio-stopped":
          if (awaitingTranscriptRef.current) {
            queuedAssistantEventsRef.current.push(event);
          } else {
            emitAssistantPlaybackDone(event);
          }
          if (statusRef.current !== "reconnecting") {
            updateStatus("listening");
          }
          return;
        case "transport-error":
          recoverRef.current();
      }
    },
    [
      emitAssistantEvent,
      emitAssistantPlaybackDone,
      flushQueuedAssistantEvents,
      interruptActiveAssistant,
      updateStatus,
    ],
  );

  const startMeter = useCallback((stream: MediaStream) => {
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);
    audioContextRef.current = context;

    const samples = new Uint8Array(analyser.fftSize);
    let lastUpdate = 0;
    const measure = (now: number) => {
      analyser.getByteTimeDomainData(samples);
      if (now - lastUpdate >= 80) {
        let sum = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          sum += normalized * normalized;
        }
        setMicLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
        lastUpdate = now;
      }
      meterFrameRef.current = window.requestAnimationFrame(measure);
    };
    meterFrameRef.current = window.requestAnimationFrame(measure);
  }, []);

  const sendConversationHistory = useCallback((channel: RTCDataChannel) => {
    for (const message of optionsRef.current.getConversation()) {
      const text = message.text.trim();
      if (!text) continue;
      channel.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: message.role,
            content: [
              {
                type:
                  message.role === "user" ? "input_text" : "output_text",
                text,
              },
            ],
          },
        }),
      );
    }
  }, []);

  const connect = useCallback(
    async (generation: number) => {
      const authorizationResponse = await fetchWithTimeout(
        "/api/realtime/session",
        {
          method: "POST",
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
      );

      let authorizationValue: unknown = null;
      try {
        authorizationValue = await authorizationResponse.json();
      } catch {
        throw new VoiceUnavailableError();
      }
      const authorization =
        parseVoiceSessionAuthorization(authorizationValue);
      if (authorizationResponse.status === 404) {
        throw new VoiceUnavailableError();
      }
      if (!authorizationResponse.ok) {
        throw new Error("Realtime authorization failed.");
      }
      if (!authorization) {
        throw new VoiceUnavailableError();
      }
      if (
        generation !== generationRef.current ||
        intentionalStopRef.current
      ) {
        return;
      }

      closePeer();
      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.hidden = true;
      audio.setAttribute("aria-hidden", "true");
      document.body.appendChild(audio);
      audioRef.current = audio;

      peer.ontrack = (event) => {
        if (peerRef.current !== peer) return;
        audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      };

      const media = mediaRef.current;
      const microphone = media?.getAudioTracks()[0];
      if (!media || !microphone) throw new VoiceUnavailableError();
      microphone.enabled = false;
      peer.addTrack(microphone, media);

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      const openDeadline = window.setTimeout(() => {
        if (channel.readyState !== "open" && peerRef.current === peer) {
          recoverRef.current();
        }
      }, REQUEST_TIMEOUT_MS);

      channel.addEventListener("open", () => {
        window.clearTimeout(openDeadline);
        if (
          peerRef.current !== peer ||
          generation !== generationRef.current ||
          intentionalStopRef.current
        ) {
          return;
        }
        // Give a pending response full context before restoring microphone input.
        sendConversationHistory(channel);
        if (
          voiceOpeningPendingRef.current ||
          handoffResponsePendingRef.current
        ) {
          channel.send(JSON.stringify({ type: "response.create" }));
        }
        microphone.enabled = !inputLockedRef.current;
        reconnectAttemptsRef.current = 0;
        updateStatus("listening");
      });
      channel.addEventListener("message", (message) => {
        if (peerRef.current !== peer || typeof message.data !== "string") {
          return;
        }
        const event = parseRealtimeServerEvent(message.data);
        if (event) handleTransportEvent(event);
      });
      channel.addEventListener("close", () => {
        window.clearTimeout(openDeadline);
        if (peerRef.current === peer) recoverRef.current();
      });
      channel.addEventListener("error", () => {
        if (peerRef.current === peer) recoverRef.current();
      });

      peer.onconnectionstatechange = () => {
        if (peerRef.current !== peer) return;
        if (
          peer.connectionState === "failed" ||
          peer.connectionState === "disconnected"
        ) {
          recoverRef.current();
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (!offer.sdp) throw new Error("WebRTC offer was empty.");

      const answerResponse = await fetchWithTimeout(
        authorization.webrtcUrl,
        {
          method: "POST",
          headers: {
            Authorization: ["Bearer", authorization.clientSecret].join(" "),
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );
      if (!answerResponse.ok) {
        throw new Error("WebRTC negotiation failed.");
      }
      const answerSdp = await answerResponse.text();
      if (!answerSdp.trim()) throw new Error("WebRTC answer was empty.");
      await peer.setRemoteDescription({ type: "answer", sdp: answerSdp });
    },
    [
      closePeer,
      handleTransportEvent,
      sendConversationHistory,
      updateStatus,
    ],
  );

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const recover = useCallback(() => {
    if (
      intentionalStopRef.current ||
      !mediaRef.current ||
      reconnectTimerRef.current !== null
    ) {
      return;
    }

    interruptActiveAssistant();
    if (intentionalStopRef.current || !mediaRef.current) return;
    closePeer();
    mediaRef.current
      .getAudioTracks()
      .forEach((track) => (track.enabled = false));

    const attempt = reconnectAttemptsRef.current;
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      fallBackToText();
      return;
    }

    updateStatus("reconnecting");
    reconnectAttemptsRef.current = attempt + 1;
    const generation = generationRef.current;
    reconnectTimerRef.current = window.setTimeout(async () => {
      reconnectTimerRef.current = null;
      try {
        await connectRef.current?.(generation);
      } catch (error) {
        if (error instanceof VoiceUnavailableError) {
          fallBackToText();
        } else {
          recoverRef.current();
        }
      }
    }, RECONNECT_DELAYS_MS[attempt]);
  }, [
    closePeer,
    fallBackToText,
    interruptActiveAssistant,
    updateStatus,
  ]);

  useEffect(() => {
    recoverRef.current = recover;
  }, [recover]);

  const start = useCallback(async () => {
    if (statusRef.current !== "idle") return;

    intentionalStopRef.current = false;
    reconnectAttemptsRef.current = 0;
    interruptedTurnsRef.current.clear();
    responseTurnIdsRef.current.clear();
    lastAssistantTurnRef.current = null;
    inputLockedRef.current = false;
    handoffResponsePendingRef.current = false;
    awaitingTranscriptRef.current = false;
    queuedAssistantEventsRef.current = [];
    voiceOpeningPendingRef.current = true;
    setFallbackMessage(null);
    updateStatus("connecting");
    const generation = ++generationRef.current;

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (
        intentionalStopRef.current ||
        generation !== generationRef.current
      ) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaRef.current = media;
      startMeter(media);
      await connectRef.current?.(generation);
    } catch (error) {
      if (permissionWasDenied(error) || error instanceof VoiceUnavailableError) {
        fallBackToText(permissionWasDenied(error));
      } else {
        recoverRef.current();
      }
    }
  }, [fallBackToText, startMeter, updateStatus]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    generationRef.current += 1;
    clearReconnectTimer();
    interruptActiveAssistant();
    releaseAll();
    inputLockedRef.current = false;
    handoffResponsePendingRef.current = false;
    awaitingTranscriptRef.current = false;
    queuedAssistantEventsRef.current = [];
    voiceOpeningPendingRef.current = false;
    setFallbackMessage(null);
    updateStatus("idle");
  }, [
    clearReconnectTimer,
    interruptActiveAssistant,
    releaseAll,
    updateStatus,
  ]);

  useEffect(() => {
    const releaseOnPageHide = () => {
      intentionalStopRef.current = true;
      generationRef.current += 1;
      clearReconnectTimer();
      releaseAll();
      voiceOpeningPendingRef.current = false;
      inputLockedRef.current = false;
      handoffResponsePendingRef.current = false;
    };
    window.addEventListener("pagehide", releaseOnPageHide);
    return () => {
      window.removeEventListener("pagehide", releaseOnPageHide);
      releaseOnPageHide();
    };
  }, [clearReconnectTimer, releaseAll]);

  const active =
    status === "connecting" ||
    status === "listening" ||
    status === "speaking" ||
    status === "reconnecting";

  return {
    status,
    active,
    micLevel,
    fallbackMessage,
    start,
    stop,
  };
}

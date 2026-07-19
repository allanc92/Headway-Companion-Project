"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeHeader } from "./IntakeHeader";
import { Conversation } from "./Conversation";
import { SafetyOverlay } from "./SafetyOverlay";
import {
  BookingBlock,
  FindingMatchesBeat,
  InlineIntentionCard,
  ReflectingBeat,
  ResumeIntentionPrompt,
  SummaryReadinessActions,
  SummaryUnderstandingCard,
  UpdatingSummaryBeat,
  WelcomeBackBlock,
} from "./ThreadBlocks";
import { InlineProviderResults } from "./InlineProviderResults";
import {
  classifyVoiceReadinessResponse,
  useCompanionChat,
} from "./useCompanionChat";
import { useVoiceSession } from "./useVoiceSession";
import { PROVIDERS } from "@/lib/providers";
import {
  SUMMARY_CONFIRMATION_RESPONSE,
  SUMMARY_CONTINUE_RESPONSE,
  VOICE_COPY,
} from "@/lib/copy";
import {
  loadIntention,
  saveIntention,
  clearIntention,
} from "@/lib/intention-store";
import type {
  Booking,
  ChatMessage,
  IntakeContext,
  Intention,
  MatchResult,
  Priority,
  SafetyTier,
  Spectrum,
  Synthesis,
} from "@/lib/types";

type IntakeStage =
  | "conversation"
  | "confirming"
  | "reflecting"
  | "understanding"
  | "matching"
  | "results"
  | "booking"
  | "intention";

interface PendingVoiceSummaryHandoff {
  transcript: ChatMessage[];
  turnId: string | null;
  assistantDone: boolean;
  playbackDone: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const READINESS_PROMPT_DELAY_MS = 1100;
const VOICE_FEATURE_ENABLED =
  process.env.NEXT_PUBLIC_VOICE_ENABLED === "true";

export function IntakeExperience({ context }: { context: IntakeContext }) {
  const router = useRouter();
  const chat = useCompanionChat();

  const [stage, setStage] = useState<IntakeStage>("conversation");
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [spectrums, setSpectrums] = useState<Spectrum[]>([]);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [chosenProviderId, setChosenProviderId] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [resumable, setResumable] = useState<Intention | null>(null);
  const [resumed, setResumed] = useState(false);
  const [refining, setRefining] = useState(false);
  const [timestamps, setTimestamps] = useState(() => {
    const now = new Date().toISOString();
    return { createdAt: now, updatedAt: now };
  });

  const [helpOpen, setHelpOpen] = useState(false);
  const shownTierRef = useRef<SafetyTier>(0);

  // Count every in-flight classification rather than toggling a boolean: the user
  // can send again after chat streaming ends while an earlier safety call is still
  // pending, and whichever request finishes first must not clear the Mirror gate.
  const [pendingSafetyRequests, setPendingSafetyRequests] = useState(0);

  const readinessDecisionRef = useRef(false);
  const synthesizingRef = useRef(false);
  const voiceAssistantTurnsRef = useRef(new Map<string, string>());
  const pendingVoiceSummaryHandoffRef =
    useRef<PendingVoiceSummaryHandoff | null>(null);

  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      const saved = loadIntention();
      if (active && saved?.chosenProviderId) setResumable(saved);
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, []);

  const step: 1 | 2 | 3 =
    stage === "conversation" || stage === "confirming" || stage === "reflecting"
      ? 1
      : stage === "understanding"
        ? 2
        : 3;

  async function runSafety(text: string) {
    setPendingSafetyRequests((count) => count + 1);
    try {
      const recent = chat.messages
        .filter((m) => !m.excludeFromSynthesis)
        .slice(-4)
        .map((m) => `${m.role}: ${m.text}`)
        .join("\n");
      const res = await fetch("/api/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, context: recent }),
      });
      const data = await res.json();
      const tier = Number(data?.tier) as SafetyTier;
      if (tier >= 1 && tier > shownTierRef.current) {
        shownTierRef.current = tier;
        chat.flagSafety(tier);
      }
    } catch {
      /* fail open — never block the person */
    } finally {
      setPendingSafetyRequests((count) => count - 1);
    }
  }

  const voice = useVoiceSession({
    getConversation: () => chat.messages,
    onUserTranscript: (text) => {
      if (stage === "confirming") {
        const decision = classifyVoiceReadinessResponse(text);
        if (decision === "confirm") {
          return beginVoiceSummaryHandoff(text);
        }
        if (decision === "continue") {
          continueConversation(text);
          return;
        }
        readinessDecisionRef.current = true;
        setStage("conversation");
      }
      chat.commitVoiceUserTurn(text);
      void runSafety(text);
    },
    onAssistantDelta: (turnId, text) => {
      const handoff = pendingVoiceSummaryHandoffRef.current;
      const isHandoffTurn =
        handoff !== null &&
        (handoff.turnId === null || handoff.turnId === turnId);
      if (handoff && handoff.turnId === null) {
        handoff.turnId = turnId;
      }
      let messageId = voiceAssistantTurnsRef.current.get(turnId);
      if (!messageId) {
        messageId = chat.beginVoiceAssistantTurn({
          excludeFromSynthesis: isHandoffTurn,
        });
        voiceAssistantTurnsRef.current.set(turnId, messageId);
      }
      chat.appendVoiceAssistantDelta(messageId, text);
    },
    onAssistantDone: (turnId, text) => {
      const handoff = pendingVoiceSummaryHandoffRef.current;
      const isHandoffTurn =
        handoff !== null &&
        (handoff.turnId === null || handoff.turnId === turnId);
      if (handoff && handoff.turnId === null) {
        handoff.turnId = turnId;
      }
      let messageId = voiceAssistantTurnsRef.current.get(turnId);
      if (!messageId) {
        messageId = chat.beginVoiceAssistantTurn({
          excludeFromSynthesis: isHandoffTurn,
        });
      }
      const becameReady = chat.finalizeVoiceAssistantTurn(messageId, text, {
        trackReadiness: !isHandoffTurn,
      });
      voiceAssistantTurnsRef.current.delete(turnId);
      if (handoff && isHandoffTurn) {
        handoff.assistantDone = true;
        maybeCompleteVoiceSummaryHandoff();
        return;
      }
      if (becameReady) {
        readinessDecisionRef.current = false;
        setStage("confirming");
      }
    },
    onAssistantPlaybackDone: (turnId) => {
      const handoff = pendingVoiceSummaryHandoffRef.current;
      if (!handoff || handoff.turnId !== turnId) return;
      handoff.playbackDone = true;
      maybeCompleteVoiceSummaryHandoff();
    },
    onAssistantInterrupted: (turnId) => {
      const messageId = voiceAssistantTurnsRef.current.get(turnId);
      if (messageId) chat.interruptVoiceAssistantTurn(messageId);
      voiceAssistantTurnsRef.current.delete(turnId);
      const handoff = pendingVoiceSummaryHandoffRef.current;
      if (handoff?.turnId === turnId) {
        handoff.assistantDone = true;
        handoff.playbackDone = true;
        maybeCompleteVoiceSummaryHandoff();
      }
    },
  });

  const { active: voiceActive, stop: stopVoice } = voice;

  useEffect(() => {
    if (
      voiceActive &&
      stage !== "conversation" &&
      stage !== "confirming"
    ) {
      stopVoice();
    }
  }, [stage, voiceActive, stopVoice]);

  function handleSend(text: string) {
    if (voice.active) return;
    if (stage === "confirming") {
      if (readinessDecisionRef.current) return;
      readinessDecisionRef.current = true;
      setStage("conversation");
    }
    void runSafety(text);
    if (stage === "understanding") {
      void refineSummary(text);
      return;
    }
    void chat.send(text);
  }

  function persist(patch: Partial<Intention>) {
    const updatedAt = new Date().toISOString();
    const base: Intention = {
      createdAt: timestamps.createdAt,
      updatedAt,
      context,
      reflection: synthesis?.reflection ?? "",
      priorities,
      spectrums,
      chosenProviderId: chosenProviderId ?? undefined,
      booking: booking ?? undefined,
    };
    const next: Intention = { ...base, ...patch, updatedAt };

    saveIntention(next);
    setTimestamps((prev) => ({ ...prev, updatedAt }));
  }

  async function goToMirror(transcript: ChatMessage[]) {
    if (synthesizingRef.current) return;
    synthesizingRef.current = true;
    setStage("reflecting");
    try {
      const [res] = await Promise.all([
        fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: transcript
              .filter((m) => !m.excludeFromSynthesis)
              .map((m) => ({ role: m.role, text: m.text })),
          }),
        }),
        sleep(2600),
      ]);
      if (!res.ok) throw new Error("Synthesis failed");
      const data: Synthesis = await res.json();
      setSynthesis(data);
      setPriorities(data.priorities);
      setSpectrums(data.spectrums);
      persist({
        reflection: data.reflection,
        priorities: data.priorities,
        spectrums: data.spectrums,
      });
      setStage("understanding");
    } catch {
      readinessDecisionRef.current = false;
      chat.addAssistantMessage(
        "I had trouble putting that summary together just now. We can try again whenever you’re ready, or keep talking.",
        { excludeFromSynthesis: true },
      );
      setStage("confirming");
    } finally {
      synthesizingRef.current = false;
    }
  }

  function beginVoiceSummaryHandoff(
    text: string,
  ): "stop-listening" | undefined {
    if (
      stage !== "confirming" ||
      readinessDecisionRef.current ||
      synthesizingRef.current
    ) {
      return;
    }

    readinessDecisionRef.current = true;
    pendingVoiceSummaryHandoffRef.current = {
      transcript: chat.commitVoiceUserTurn(text, {
        excludeFromSynthesis: true,
      }),
      turnId: null,
      assistantDone: false,
      playbackDone: false,
    };
    return "stop-listening";
  }

  function maybeCompleteVoiceSummaryHandoff() {
    const handoff = pendingVoiceSummaryHandoffRef.current;
    if (!handoff?.assistantDone || !handoff.playbackDone) return;

    completeVoiceSummaryHandoff(handoff);
  }

  function completeVoiceSummaryHandoff(
    handoff: PendingVoiceSummaryHandoff,
  ) {
    pendingVoiceSummaryHandoffRef.current = null;
    voice.stop();
    void goToMirror(handoff.transcript);
  }

  function handleVoiceEnd() {
    const handoff = pendingVoiceSummaryHandoffRef.current;
    if (handoff) {
      completeVoiceSummaryHandoff(handoff);
      return;
    }
    voice.stop();
  }

  function confirmSummary() {
    if (
      stage !== "confirming" ||
      readinessDecisionRef.current ||
      synthesizingRef.current
    ) {
      return;
    }
    if (voice.active) voice.stop();
    readinessDecisionRef.current = true;
    const transcript = chat.addUserMessage(SUMMARY_CONFIRMATION_RESPONSE, {
      excludeFromSynthesis: true,
    });
    void goToMirror(transcript);
  }

  function continueConversation(voiceTranscript?: string) {
    const isVoiceResponse = voiceTranscript !== undefined;
    if (
      stage !== "confirming" ||
      readinessDecisionRef.current ||
      (voice.active && !isVoiceResponse)
    ) {
      return;
    }
    readinessDecisionRef.current = true;
    setStage("conversation");
    if (isVoiceResponse) {
      chat.commitVoiceUserTurn(voiceTranscript, {
        excludeFromSynthesis: true,
      });
      return;
    }
    void chat.send(SUMMARY_CONTINUE_RESPONSE, {
      trackReadiness: false,
      excludeFromSynthesis: true,
    });
  }

  async function refineSummary(text: string) {
    if (!synthesis || refining) return;

    const current: Synthesis = {
      reflection: synthesis.reflection,
      priorities,
      spectrums,
    };
    const transcript = chat.addUserMessage(text);
    setRefining(true);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: transcript
            .filter((m) => !m.excludeFromSynthesis)
            .map((m) => ({ role: m.role, text: m.text })),
          synthesis: current,
        }),
      });
      if (!res.ok) throw new Error("Refine failed");
      const data: Synthesis & { acknowledgment?: string } = await res.json();
      const next: Synthesis = {
        reflection: data.reflection,
        priorities: data.priorities,
        spectrums: data.spectrums,
      };
      setSynthesis(next);
      setPriorities(next.priorities);
      setSpectrums(next.spectrums);
      persist({
        reflection: next.reflection,
        priorities: next.priorities,
        spectrums: next.spectrums,
      });
      chat.addAssistantMessage(
        data.acknowledgment?.trim() ||
          "I've updated your summary — take a look and tell me if anything still feels off.",
      );
    } catch {
      chat.addAssistantMessage(
        "I had trouble updating that just now, but I'm still here — you can try telling me again.",
      );
    } finally {
      setRefining(false);
    }
  }

  const {
    messages: readinessMessages,
    ready: summaryReady,
    status: readinessStatus,
  } = chat;

  useEffect(() => {
    if (stage !== "conversation") return;
    if (!summaryReady || readinessStatus.type !== "idle") return;
    if (helpOpen) return;
    // Hold the transition until every outstanding safety check settles, so
    // overlapping classifications cannot clear the gate out of order.
    if (pendingSafetyRequests > 0) return;
    const lastMessage = readinessMessages[readinessMessages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.safetyTier) return;

    const t = setTimeout(() => {
      readinessDecisionRef.current = false;
      setStage("confirming");
    }, READINESS_PROMPT_DELAY_MS);
    return () => clearTimeout(t);
  }, [
    summaryReady,
    readinessStatus,
    stage,
    helpOpen,
    pendingSafetyRequests,
    readinessMessages,
  ]);

  async function findMatches() {
    // Guard on refining too: a pending correction can still replace the summary,
    // so matching now would use stale priorities/spectrums.
    if (priorities.length === 0 || refining) return;

    setStage("matching");
    persist({ priorities, spectrums, chosenProviderId: undefined, booking: undefined });
    setChosenProviderId(null);
    setBooking(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, priorities, spectrums }),
      });
      const data: MatchResult = await res.json();
      setMatchResult(data);
      setStage("results");
    } catch {
      setStage("understanding");
    }
  }

  function chooseProvider(id: string) {
    setChosenProviderId(id);
    setBooking(null);
    setStage("booking");
    persist({ chosenProviderId: id, booking: undefined });
  }

  function confirmBooking(nextBooking: Booking) {
    setBooking(nextBooking);
    setChosenProviderId(nextBooking.providerId);
    persist({
      chosenProviderId: nextBooking.providerId,
      booking: nextBooking,
    });
    setStage("intention");
  }

  function restart() {
    clearIntention();
    router.push("/");
  }

  function resume() {
    if (!resumable) return;

    setSynthesis({
      reflection: resumable.reflection,
      priorities: resumable.priorities,
      spectrums: resumable.spectrums,
    });
    setPriorities(resumable.priorities);
    setSpectrums(resumable.spectrums);
    setChosenProviderId(resumable.chosenProviderId ?? null);
    setBooking(resumable.booking ?? null);
    setTimestamps({
      createdAt: resumable.createdAt,
      updatedAt: resumable.updatedAt,
    });
    setStage("intention");
    setResumed(true);
    setResumable(null);
  }

  function editIntention() {
    setResumed(false);
    setChosenProviderId(null);
    setBooking(null);
    setMatchResult(null);
    setStage("understanding");
    persist({ chosenProviderId: undefined, booking: undefined });
  }

  const chosenProvider =
    PROVIDERS.find((p) => p.id === chosenProviderId) ?? null;

  const currentIntention: Intention = {
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
    context,
    reflection: synthesis?.reflection ?? "",
    priorities,
    spectrums,
    chosenProviderId: chosenProviderId ?? undefined,
    booking: booking ?? undefined,
  };

  const matching = stage === "matching";
  const showUnderstanding = Boolean(synthesis) && !resumed;
  const composerDisabled =
    (stage !== "conversation" &&
      stage !== "confirming" &&
      stage !== "understanding") ||
    resumed ||
    refining ||
    voice.active;
  const composerPlaceholder =
    voice.active
      ? VOICE_COPY.activePlaceholder
      : stage === "confirming"
      ? "Add anything else, or choose when you’re ready…"
      : stage === "understanding"
      ? refining
        ? "I’m updating that now…"
        : "Want to change anything? Just tell me…"
      : undefined;
  const progressKey = [
    stage,
    synthesis ? "synthesis" : "no-synthesis",
    matchResult ? `matches-${matchResult.matches.length}` : "no-matches",
    chosenProviderId ?? "no-provider",
    booking ? `booking-${booking.date}-${booking.time}` : "no-booking",
    resumed ? "resumed" : "fresh",
    refining ? "refining" : "not-refining",
    voice.status,
  ].join(":");

  const afterMessages = (
    <>
      {resumable && stage === "conversation" && (
        <ResumeIntentionPrompt
          onResume={resume}
          onDismiss={() => setResumable(null)}
        />
      )}

      {resumed && <WelcomeBackBlock />}

      {stage === "confirming" && !voice.active && (
        <SummaryReadinessActions
          onConfirm={confirmSummary}
          onContinue={() => continueConversation()}
        />
      )}

      {stage === "reflecting" && <ReflectingBeat />}

      {showUnderstanding && synthesis && (
        <>
          <SummaryUnderstandingCard
            reflection={synthesis.reflection}
            priorities={priorities}
            spectrums={spectrums}
            disabled={priorities.length === 0 || refining}
            matching={matching}
            onFindMatches={findMatches}
            showAction={!matchResult}
          />
          {refining && <UpdatingSummaryBeat />}
        </>
      )}

      {matching && <FindingMatchesBeat />}

      {matchResult && (
        <InlineProviderResults
          result={matchResult}
          context={context}
          onChoose={chooseProvider}
        />
      )}

      {stage === "booking" && chosenProvider && (
        <BookingBlock provider={chosenProvider} onConfirm={confirmBooking} />
      )}

      {stage === "intention" && (
        <InlineIntentionCard
          intention={currentIntention}
          provider={chosenProvider}
          onEdit={editIntention}
          onRestart={restart}
        />
      )}
    </>
  );

  return (
    <div className="min-h-dvh chat-canvas">
      <IntakeHeader
        step={step}
        onHelp={() => setHelpOpen(true)}
      />

      <main className="mx-auto max-w-3xl px-5 pt-8 sm:pt-10">
        <Conversation
          messages={chat.messages}
          status={chat.status}
          userTurnCount={chat.userTurnCount}
          onSend={handleSend}
          afterMessages={afterMessages}
          progressKey={progressKey}
          composerDisabled={composerDisabled}
          composerPlaceholder={composerPlaceholder}
          voiceEnabled={
            VOICE_FEATURE_ENABLED &&
            (stage === "conversation" || stage === "confirming")
          }
          voiceStatus={voice.status}
          voiceMicLevel={voice.micLevel}
          voiceFallbackMessage={voice.fallbackMessage}
          voiceDisabled={chat.status.type === "streaming"}
          onVoiceStart={voice.start}
          onVoiceEnd={handleVoiceEnd}
        />
      </main>

      {helpOpen && (
        <SafetyOverlay tier={0} manual onDismiss={() => setHelpOpen(false)} />
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeHeader } from "./IntakeHeader";
import { Conversation } from "./Conversation";
import { SafetyOverlay } from "./SafetyOverlay";
import {
  BookingBlock,
  FindMatchesBlock,
  FindingMatchesBeat,
  InlineIntentionCard,
  InlineProviderResults,
  PrioritiesBlock,
  ReflectingBeat,
  ReflectionBlock,
  ResumeIntentionPrompt,
  SpectrumsBlock,
  WelcomeBackBlock,
} from "./ThreadBlocks";
import { useCompanionChat } from "./useCompanionChat";
import { PROVIDERS } from "@/lib/providers";
import {
  loadIntention,
  saveIntention,
  clearIntention,
} from "@/lib/intention-store";
import type {
  Booking,
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
  | "reflecting"
  | "understanding"
  | "matching"
  | "results"
  | "booking"
  | "intention";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const READINESS_TRANSITION_MS = 1100;

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
  const [timestamps, setTimestamps] = useState(() => {
    const now = new Date().toISOString();
    return { createdAt: now, updatedAt: now };
  });

  const [helpOpen, setHelpOpen] = useState(false);
  const shownTierRef = useRef<SafetyTier>(0);

  // True while /api/safety is still classifying the latest user turn. The Mirror
  // transition must wait on this: the mechanical mirrorSafetyNet backstop can set
  // `ready` before the safety tier lands, so without this gate a slow safety call
  // could let goToMirror() advance mid-crisis.
  const [safetyPending, setSafetyPending] = useState(false);

  const transitionedRef = useRef(false);

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
    stage === "conversation" || stage === "reflecting"
      ? 1
      : stage === "understanding"
        ? 2
        : 3;

  async function runSafety(text: string) {
    try {
      const recent = chat.messages
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
      setSafetyPending(false);
    }
  }

  function handleSend(text: string) {
    setSafetyPending(true);
    chat.send(text);
    runSafety(text);
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

  async function goToMirror() {
    setStage("reflecting");
    try {
      const [res] = await Promise.all([
        fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chat.messages.map((m) => ({ role: m.role, text: m.text })),
          }),
        }),
        sleep(2600),
      ]);
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
      transitionedRef.current = false;
      setStage("conversation");
    }
  }

  useEffect(() => {
    if (transitionedRef.current) return;
    if (stage !== "conversation") return;
    if (!chat.ready || chat.status !== "idle") return;
    if (helpOpen) return;
    // Hold the transition until the latest turn's safety check settles, so a slow
    // classification can't let the backstop advance before a crisis tier is flagged.
    if (safetyPending) return;
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.safetyTier) return;

    const t = setTimeout(() => {
      transitionedRef.current = true;
      goToMirror();
    }, READINESS_TRANSITION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.ready, chat.status, stage, helpOpen, safetyPending, chat.messages]);

  async function findMatches() {
    if (priorities.length === 0) return;

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
  const composerDisabled = stage !== "conversation" || resumed;
  const progressKey = [
    stage,
    synthesis ? "synthesis" : "no-synthesis",
    matchResult ? `matches-${matchResult.matches.length}` : "no-matches",
    chosenProviderId ?? "no-provider",
    booking ? `booking-${booking.date}-${booking.time}` : "no-booking",
    resumed ? "resumed" : "fresh",
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

      {stage === "reflecting" && <ReflectingBeat />}

      {showUnderstanding && synthesis && (
        <>
          <ReflectionBlock reflection={synthesis.reflection} />
          <PrioritiesBlock priorities={priorities} onChange={setPriorities} />
          <SpectrumsBlock spectrums={spectrums} onChange={setSpectrums} />
          {!matchResult && (
            <FindMatchesBlock
              disabled={priorities.length === 0}
              matching={matching}
              onFindMatches={findMatches}
            />
          )}
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
        />
      </main>

      {helpOpen && (
        <SafetyOverlay tier={0} manual onDismiss={() => setHelpOpen(false)} />
      )}
    </div>
  );
}

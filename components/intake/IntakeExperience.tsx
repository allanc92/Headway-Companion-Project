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
  SummaryUnderstandingCard,
  UpdatingSummaryBeat,
  WelcomeBackBlock,
} from "./ThreadBlocks";
import { InlineProviderResults } from "./InlineProviderResults";
import { useCompanionChat } from "./useCompanionChat";
import { PROVIDERS } from "@/lib/providers";
import { HANDOFF_LINE } from "@/lib/copy";
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
  const [refining, setRefining] = useState(false);
  const [timestamps, setTimestamps] = useState(() => {
    const now = new Date().toISOString();
    return { createdAt: now, updatedAt: now };
  });

  const [safety, setSafety] = useState<{
    open: boolean;
    tier: SafetyTier;
    manual: boolean;
  }>({ open: false, tier: 0, manual: false });

  const transitionedRef = useRef(false);
  // The handoff line is posted once per intake; on a synth retry we re-read the
  // latest transcript instead of reusing a cached array, so user turns added during
  // an outage aren't dropped from the summary.
  const handoffPostedRef = useRef(false);

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
      if (tier >= 1) {
        setSafety((prev) =>
          prev.open && prev.tier >= tier
            ? prev
            : { open: true, tier, manual: false },
        );
      }
    } catch {
      /* fail open — never block the person */
    }
  }

  function handleSend(text: string) {
    runSafety(text);
    if (stage === "understanding") {
      void refineSummary(text);
      return;
    }
    chat.send(text);
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
    if (!handoffPostedRef.current) {
      chat.addAssistantMessage(HANDOFF_LINE);
      handoffPostedRef.current = true;
    }
    // Read the freshest transcript (includes the handoff line plus anything the
    // person added since a previous failed attempt) so retries never omit new turns.
    const transcript = chat.getMessages();
    setStage("reflecting");
    try {
      const [res] = await Promise.all([
        fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: transcript.map((m) => ({ role: m.role, text: m.text })),
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
          messages: transcript.map((m) => ({ role: m.role, text: m.text })),
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

  useEffect(() => {
    if (transitionedRef.current) return;
    if (stage !== "conversation") return;
    if (!chat.ready || chat.status !== "idle") return;
    if (safety.open) return;

    const t = setTimeout(() => {
      transitionedRef.current = true;
      goToMirror();
    }, READINESS_TRANSITION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.ready, chat.status, stage, safety.open]);

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
  const composerDisabled =
    (stage !== "conversation" && stage !== "understanding") || resumed || refining;
  const composerPlaceholder =
    stage === "understanding"
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
          <SummaryUnderstandingCard
            reflection={synthesis.reflection}
            priorities={priorities}
            spectrums={spectrums}
            disabled={priorities.length === 0}
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
        onHelp={() => setSafety({ open: true, tier: 0, manual: true })}
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
        />
      </main>

      {safety.open && (
        <SafetyOverlay
          tier={safety.tier}
          manual={safety.manual}
          onDismiss={() => setSafety({ open: false, tier: 0, manual: false })}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeHeader } from "./IntakeHeader";
import { Conversation } from "./Conversation";
import { MirrorTransition } from "./MirrorTransition";
import { Understanding } from "./Understanding";
import { ProviderResults } from "./ProviderResults";
import { IntentionArtifact } from "./IntentionArtifact";
import { SafetyOverlay } from "./SafetyOverlay";
import { useCompanionChat } from "./useCompanionChat";
import { PROVIDERS } from "@/lib/providers";
import {
  loadIntention,
  saveIntention,
  clearIntention,
} from "@/lib/intention-store";
import type {
  IntakeContext,
  Intention,
  MatchResult,
  Priority,
  SafetyTier,
  Spectrum,
  Synthesis,
} from "@/lib/types";

type Phase = "conversation" | "mirror" | "understanding" | "results" | "intention";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A short held beat before auto-advancing, so the person can take in the
 *  companion's last words rather than being yanked into The Mirror. */
const READINESS_TRANSITION_MS = 1100;

export function IntakeExperience({ context }: { context: IntakeContext }) {
  const router = useRouter();
  const chat = useCompanionChat();

  const [phase, setPhase] = useState<Phase>("conversation");
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [spectrums, setSpectrums] = useState<Spectrum[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [chosenProviderId, setChosenProviderId] = useState<string | null>(null);

  const [safety, setSafety] = useState<{
    open: boolean;
    tier: SafetyTier;
    manual: boolean;
  }>({ open: false, tier: 0, manual: false });

  const [resumable, setResumable] = useState<Intention | null>(null);
  const createdAtRef = useRef<string>(new Date().toISOString());
  const transitionedRef = useRef(false);

  useEffect(() => {
    const saved = loadIntention();
    if (saved?.chosenProviderId) setResumable(saved);
  }, []);

  const step: 1 | 2 | 3 =
    phase === "conversation" || phase === "mirror"
      ? 1
      : phase === "understanding"
        ? 2
        : 3;

  // --- Safety -------------------------------------------------------------
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
    chat.send(text);
    runSafety(text);
  }

  // --- The Mirror ---------------------------------------------------------
  function persist(patch: Partial<Intention>) {
    const base: Intention = {
      createdAt: createdAtRef.current,
      updatedAt: new Date().toISOString(),
      context,
      reflection: synthesis?.reflection ?? "",
      priorities,
      spectrums,
      chosenProviderId: chosenProviderId ?? undefined,
    };
    saveIntention({ ...base, ...patch, updatedAt: new Date().toISOString() });
  }

  async function goToMirror() {
    setPhase("mirror");
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
      persist({ reflection: data.reflection, priorities: data.priorities, spectrums: data.spectrums });
      setPhase("understanding");
    } catch {
      setPhase("understanding");
    }
  }

  // Model-driven transition: when the companion signals sufficient depth
  // (chat.ready) on a completed turn, move into The Mirror on its own — no
  // manual affordance. Guardrails: only from the conversation phase, only once,
  // and never while an elevated safety overlay is asking the person to pause.
  useEffect(() => {
    if (transitionedRef.current) return;
    if (phase !== "conversation") return;
    if (!chat.ready || chat.status !== "idle") return;
    // Never transition out from under a safety overlay — the person is being
    // asked to pause or is reaching for help. Re-runs once it's dismissed.
    if (safety.open) return;

    // A short held beat so the person can take in the companion's last words.
    const t = setTimeout(() => {
      transitionedRef.current = true;
      goToMirror();
    }, READINESS_TRANSITION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.ready, chat.status, phase, safety.open]);

  // --- Matching -----------------------------------------------------------
  async function findMatches() {
    setMatching(true);
    persist({ priorities, spectrums });
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, priorities, spectrums }),
      });
      const data: MatchResult = await res.json();
      setMatchResult(data);
      setPhase("results");
    } catch {
      /* stay on understanding */
    } finally {
      setMatching(false);
    }
  }

  function chooseProvider(id: string) {
    setChosenProviderId(id);
    persist({ chosenProviderId: id });
    setPhase("intention");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    createdAtRef.current = resumable.createdAt;
    setPhase("intention");
    setResumable(null);
  }

  const chosenProvider =
    PROVIDERS.find((p) => p.id === chosenProviderId) ?? null;

  const currentIntention: Intention = {
    createdAt: createdAtRef.current,
    updatedAt: new Date().toISOString(),
    context,
    reflection: synthesis?.reflection ?? "",
    priorities,
    spectrums,
    chosenProviderId: chosenProviderId ?? undefined,
  };

  return (
    <div className="min-h-dvh bg-cream">
      <IntakeHeader
        step={step}
        onHelp={() => setSafety({ open: true, tier: 0, manual: true })}
      />

      <main className="mx-auto max-w-3xl px-5">
        {phase === "conversation" && (
          <>
            {resumable && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-mint-200 bg-mint/40 px-4 py-3">
                <p className="text-sm text-ink-soft">
                  Welcome back — you have a saved Intention.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resume}
                    className="rounded-full bg-forest px-3.5 py-1.5 text-sm font-medium text-mint hover:bg-forest-700"
                  >
                    View it
                  </button>
                  <button
                    type="button"
                    onClick={() => setResumable(null)}
                    className="rounded-full px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
                  >
                    Start fresh
                  </button>
                </div>
              </div>
            )}
            <Conversation
              messages={chat.messages}
              status={chat.status}
              userTurnCount={chat.userTurnCount}
              onSend={handleSend}
            />
          </>
        )}

        {phase === "mirror" && <MirrorTransition />}

        {phase === "understanding" && synthesis && (
          <Understanding
            reflection={synthesis.reflection}
            priorities={priorities}
            spectrums={spectrums}
            onPrioritiesChange={setPriorities}
            onSpectrumsChange={setSpectrums}
            onFindMatches={findMatches}
            matching={matching}
          />
        )}

        {phase === "results" && matchResult && (
          <ProviderResults
            result={matchResult}
            context={context}
            onChoose={chooseProvider}
          />
        )}

        {phase === "intention" && (
          <IntentionArtifact
            intention={currentIntention}
            provider={chosenProvider}
            onEdit={() => setPhase("understanding")}
            onRestart={restart}
          />
        )}
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

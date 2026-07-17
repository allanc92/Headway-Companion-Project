// Shared signal helpers.
//
// The PRIMARY decision to move the conversation forward — softening toward fit, or
// stepping into the Mirror — is a judgement call the model makes from the substance
// of what the person has shared, guided by its prompt. These helpers don't try to
// re-make that judgement. They only provide a turn-count SAFETY NET: an edge-case
// backstop that steps in when the conversation risks circling forever, never the
// primary trigger. Turns are counted by substance (empty replies and "help me start"
// chip taps don't count), so the backstop tracks real exchanges, not stalling.

import { SPARK_CHIPS } from "./copy";

// Spark chips are the "help me start" on-ramps a person taps when they're stuck
// (e.g. "It's hard to start", "Could you ask me something to help me begin?").
// They're an invitation for help beginning, not substantive sharing, so they never
// count as a real turn.
//
// Tapping a chip sends its EXACT signal text (see SPARK_CHIPS in ./copy), so we
// detect a spark by exact match, never by substring. Substring matching would drop
// genuine messages that merely contain a chip phrase -- e.g. "I'm not sure what I
// need from therapy, but ..." or "my partner doesn't ask me ..." -- as non-
// substantive, starving the fit and Mirror safety nets below of real turns.
const SPARK_TAP_TEXTS: ReadonlySet<string> = new Set(
  SPARK_CHIPS.map((chip) => chip.signal.trim().toLowerCase()),
);

export function isSpark(text: string): boolean {
  return SPARK_TAP_TEXTS.has(text.trim().toLowerCase());
}

/** Turns that actually move the conversation forward: non-empty and not a spark. */
export function substantiveTurns(userTexts: string[]): string[] {
  return userTexts.filter((t) => t.trim().length > 0 && !isSpark(t));
}

/** Total word count across the given texts. */
export function countWords(texts: string[]): number {
  return texts.reduce(
    (n, t) => n + t.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
}

/**
 * Safety-net cap for the fit softening. If the model hasn't let the conversation
 * drift toward what kind of support would help by this many substantive turns, the
 * server slips in the hidden fit nudge to gently break the circling. The model
 * should almost always transition on its own judgement well before this.
 */
export const FIT_NUDGE_SAFETY_NET_TURNS = 5;

/**
 * Safety-net cap for Mirror readiness. If the model never emits the readiness marker
 * but the conversation has run this many substantive turns, the client forces the
 * transition so it can't circle forever. Deliberately generous — a high bar the
 * model's own judgement should reach first.
 */
export const MIRROR_SAFETY_NET_TURNS = 8;

/**
 * Minimum words accumulated across the substantive turns before a backstop may
 * fire. A turn count alone isn't enough: clipped replies like "ok", "yeah", or
 * "idk" are non-empty and aren't spark chips, so they pass substantiveTurns and
 * could otherwise let five or eight low-content turns trip the nets — recreating
 * the raw turn-count behavior this design set out to remove. Gating on cumulative
 * substance keeps the backstop tied to real signal (mirroring how the offline
 * fallbackReadyForMirror gauges depth), while the model's own judgement stays the
 * primary trigger. Deliberately low bars: enough to filter pure filler, not to
 * suppress a genuinely terse but real conversation.
 */
export const FIT_NUDGE_SAFETY_NET_WORDS = 25;
export const MIRROR_SAFETY_NET_WORDS = 60;

/**
 * True once the fit softening has circled long enough to warrant the backstop nudge.
 * NOT the primary trigger — the model's own read of "do they feel heard?" is.
 */
export function fitNudgeSafetyNet(userTexts: string[]): boolean {
  const substantive = substantiveTurns(userTexts);
  return (
    substantive.length >= FIT_NUDGE_SAFETY_NET_TURNS &&
    countWords(substantive) >= FIT_NUDGE_SAFETY_NET_WORDS
  );
}

/**
 * True once the conversation has circled long enough to offer the Mirror.
 * NOT the primary trigger — the model-emitted readiness marker is.
 */
export function mirrorSafetyNet(userTexts: string[]): boolean {
  const substantive = substantiveTurns(userTexts);
  return (
    substantive.length >= MIRROR_SAFETY_NET_TURNS &&
    countWords(substantive) >= MIRROR_SAFETY_NET_WORDS
  );
}

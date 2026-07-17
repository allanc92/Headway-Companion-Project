// Shared signal helpers.
//
// The PRIMARY decision to move the conversation forward — softening toward fit, or
// stepping into the Mirror — is a judgement call the model makes from the substance
// of what the person has shared, guided by its prompt. These helpers don't try to
// re-make that judgement. They only provide a turn-count SAFETY NET: an edge-case
// backstop that steps in when the conversation risks circling forever, never the
// primary trigger. Turns are counted by substance (empty replies and "help me start"
// chip taps don't count), so the backstop tracks real exchanges, not stalling.

// Spark chips are the "help me start" on-ramps a person taps when they're stuck
// (e.g. "it's hard to start", "could you ask me something?"). They're an invitation
// for help beginning, not substantive sharing, so they never count as a real turn.
export const SPARK_SIGNALS = [
  "hard to start",
  "ask me",
  "how does this",
  "not sure what",
] as const;

export function isSpark(text: string): boolean {
  const t = text.toLowerCase();
  return SPARK_SIGNALS.some((s) => t.includes(s));
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
 * True once the fit softening has circled long enough to warrant the backstop nudge.
 * NOT the primary trigger — the model's own read of "do they feel heard?" is.
 */
export function fitNudgeSafetyNet(userTexts: string[]): boolean {
  return substantiveTurns(userTexts).length >= FIT_NUDGE_SAFETY_NET_TURNS;
}

/**
 * True once the conversation has circled long enough to force Mirror readiness.
 * NOT the primary trigger — the model-emitted readiness marker is.
 */
export function mirrorSafetyNet(userTexts: string[]): boolean {
  return substantiveTurns(userTexts).length >= MIRROR_SAFETY_NET_TURNS;
}


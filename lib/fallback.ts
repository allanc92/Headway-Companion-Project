import type { SafetyAssessment, SafetyTier, Synthesis } from "./types";
import { MIRROR_READY_MARKER } from "./types";

/*
  Offline fallbacks so the prototype never hard-crashes without Azure creds.
  These are deliberately warm but simple — the real experience uses the LLM.
*/

// ---- Companion (Phase 1) ----------------------------------------------------

const GENTLE_PROMPTS = [
  "There's no right way to say it. What feels closest to true right now?",
  "What's that been like to carry?",
  "If it helps, you could stay with whatever feels most present for you.",
];

// Movement two: once someone has opened up, gently wonder — warmly, never as a list —
// about the kind of support that might help. Each one reflects first, then asks one soft thing.
const FIT_PROMPTS = [
  "It sounds like a lot to hold. I'm curious — when you picture talking to someone about this, would you want them mostly to listen and hold space, or to also offer things to try?",
  "That helps me understand. Some people want a steady sense of structure each time; others want room to follow whatever comes up. Do you have a feel for which would sit better with you?",
  "Thank you for that. And in the work itself — are you hoping mostly for some relief in the here-and-now, or to understand the deeper roots of it too?",
  "That's really helpful to know. Is there anything else that would help you feel at ease with the person you talk to?",
];

const SPARK_SIGNALS = ["hard to start", "ask me", "how does this", "not sure what"];

/**
 * Offline stand-in for the model's readiness judgment. Without the LLM we can't
 * truly assess depth, so we approximate "sufficient depth" the same way the
 * prompt frames it: enough turns AND enough substance to synthesize without
 * guessing. Deliberately conservative so short conversations stay in Phase 1.
 */
function fallbackReadyForMirror(userTexts: string[]): boolean {
  const meaningful = userTexts.filter((t) => t.trim().length > 0);
  if (meaningful.length < 3) return false;

  // A spark-chip signal (e.g. "it's hard to start") isn't real depth.
  const last = (meaningful[meaningful.length - 1] || "").toLowerCase();
  if (SPARK_SIGNALS.some((s) => last.includes(s))) return false;

  const totalWords = meaningful.reduce(
    (n, t) => n + t.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  // Roughly a few substantive sentences across the conversation.
  return totalWords >= 40;
}

export function fallbackCompanionReply(userTexts: string[]): string {
  const last = (userTexts[userTexts.length - 1] || "").toLowerCase();
  const turn = userTexts.length;

  let reply: string;
  if (SPARK_SIGNALS.some((s) => last.includes(s))) {
    reply =
      "That's okay — most people don't quite know where to begin. There's no wrong way in. We could start small: what's today been like for you?";
  } else if (turn <= 1) {
    // Movement one — help them feel heard.
    reply =
      "Thank you for saying that — it takes something to put it into words. I'm here, and there's no rush. What feels most tangled up in it right now?";
  } else if (turn === 2) {
    reply =
      "That makes a lot of sense. It sounds like there's real weight in what you're describing. What part of it feels heaviest?";
  } else {
    // Movement two — once they've opened up, let the same conversation drift toward what kind
    // of support would help, grown from what they've shared. Never announced, never a list.
    reply = FIT_PROMPTS[turn - 3] ?? GENTLE_PROMPTS[turn % GENTLE_PROMPTS.length];
  }

  // Append the model-driven readiness signal when depth is sufficient, mirroring
  // how the live model emits the marker on its own final line.
  if (fallbackReadyForMirror(userTexts)) {
    return `${reply}\n${MIRROR_READY_MARKER}`;
  }
  return reply;
}

// ---- Safety -----------------------------------------------------------------

const TIER3 = [
  "kill myself", "end my life", "want to die", "take my life", "suicide",
  "overdose", "no reason to live", "better off dead", "kill him", "kill her",
  "kill them", "hurt myself tonight", "don't want to be alive",
  "dont want to be alive", "don't want to live", "dont want to live",
  "not want to be alive", "want to be dead", "wish i was dead", "wish i were dead",
  "don't want to be here", "dont want to be here", "wish i wasn't here",
  "wish i wasnt here", "end it all",
];
const TIER2 = [
  "hurt myself", "self harm", "self-harm", "cutting", "can't go on",
  "hitting me", "hits me", "afraid of him", "afraid of her", "not safe",
  "abusing", "abuse", "harm myself",
];
const TIER1 = [
  "can't do this anymore", "hopeless", "worthless", "exhausted by everything",
  "what's the point", "numb", "give up",
];

export function fallbackSafety(text: string): SafetyAssessment {
  const t = text.toLowerCase();
  const scan = (list: string[]) => list.some((k) => t.includes(k));
  let tier: SafetyTier = 0;
  let category = "none";
  if (scan(TIER3)) {
    tier = 3;
    category = t.includes("him") || t.includes("her") || t.includes("them")
      ? "harm-to-others"
      : "self-harm";
  } else if (scan(TIER2)) {
    tier = 2;
    category = t.includes("abus") || t.includes("safe") || t.includes("hit")
      ? "abuse"
      : "self-harm";
  } else if (scan(TIER1)) {
    tier = 1;
    category = "distress";
  }
  return {
    tier,
    category,
    rationale:
      tier === 0
        ? "No acute risk indicators detected."
        : "Heuristic keyword match (offline fallback); flagged for a gentle check-in.",
  };
}

// ---- Synthesis (The Mirror) -------------------------------------------------

const THEME_MAP: { key: string[]; focus: string; title: string; desc: string }[] = [
  { key: ["relationship", "partner", "marriage", "husband", "wife", "boyfriend", "girlfriend", "breakup", "divorce"], focus: "relationships", title: "Making sense of a relationship", desc: "You want space to understand what's shifting with someone close to you." },
  { key: ["anxious", "anxiety", "panic", "worry", "overwhelm", "racing"], focus: "anxiety", title: "Quieting the anxiety", desc: "You're looking for relief from a mind that won't slow down." },
  { key: ["sad", "depress", "empty", "numb", "low", "hopeless"], focus: "depression", title: "Lifting out of a low season", desc: "You want support through a heaviness that's been hard to shake." },
  { key: ["grief", "loss", "died", "death", "passed away", "mourning"], focus: "grief & loss", title: "Carrying a loss", desc: "You need a steady place to grieve at your own pace." },
  { key: ["trauma", "ptsd", "flashback", "abuse", "assault"], focus: "trauma", title: "Healing something that still hurts", desc: "You want to work through the past feeling safe, not rushed." },
  { key: ["work", "job", "burnout", "burned out", "career", "stress", "stressed"], focus: "stress & burnout", title: "Coming back from burnout", desc: "You're carrying more than is sustainable and need a way through it." },
  { key: ["transition", "move", "change", "moved", "new city", "graduat"], focus: "life transitions", title: "Navigating a big change", desc: "You're in a season of change and want your footing back." },
  { key: ["who i am", "identity", "myself", "self-worth", "self worth", "confidence"], focus: "identity & self", title: "Coming home to yourself", desc: "You want to feel more like yourself again." },
  { key: ["family", "mom", "dad", "parent", "sibling", "kids", "children"], focus: "family", title: "Untangling family dynamics", desc: "You want help with the relationships you were raised in or are raising." },
];

function pickQuote(transcript: string, keys: string[]): string {
  const sentences = transcript.split(/(?<=[.!?])\s+|\n+/);
  for (const s of sentences) {
    const low = s.toLowerCase();
    if (keys.some((k) => low.includes(k))) {
      const cleaned = s.replace(/^Person:\s*/i, "").trim();
      if (cleaned.length > 4) return truncate(cleaned, 90);
    }
  }
  return "";
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function fallbackSynthesis(transcript: string): Synthesis {
  const low = transcript.toLowerCase();
  const matched = THEME_MAP.filter((t) => t.key.some((k) => low.includes(k)));
  const chosen = (matched.length ? matched : [THEME_MAP[1], THEME_MAP[7]]).slice(0, 4);

  const priorities = chosen.map((t, i) => ({
    id: `p-${i}`,
    title: t.title,
    sourceQuote: pickQuote(transcript, t.key) || "what you shared just now",
    description: t.desc,
    focusTags: [t.focus],
  }));

  // Add a universal "feel understood" priority if we have room.
  if (priorities.length < 3) {
    priorities.push({
      id: `p-${priorities.length}`,
      title: "Someone who really listens",
      sourceQuote: "what you shared just now",
      description: "More than anything, you want to feel genuinely heard.",
      focusTags: ["identity & self"],
    });
  }

  return {
    reflection:
      "Here's what I'm hearing, in your words — tell me where I've got it wrong. You named something real, and you gave me a sense not just of how it feels but of the kind of support that would help. What matters now is finding someone who meets you where you actually are. These are a first draft — move them, edit them, or throw any out.",
    priorities,
    spectrums: [
      { id: "action_space", leftLabel: "Action-oriented", rightLabel: "Space-holding", value: 55, note: "You seem to want to feel heard first, with tools when you're ready." },
      { id: "structure", leftLabel: "Structured sessions", rightLabel: "Open & exploratory", value: 50, note: "A balance of gentle direction and room to follow what comes up." },
      { id: "depth", leftLabel: "Practical & present", rightLabel: "Insight & depth", value: 55, note: "Both relief now and understanding the deeper why." },
    ],
  };
}

export function fallbackMatchReason(providerName: string): string {
  return `${providerName} works in a way that lines up closely with what you said matters most to you right now.`;
}

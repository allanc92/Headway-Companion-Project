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

// Each spark chip gets its own reply so tapping different chips doesn't return
// the same stale line. Keyed by a substring found in that chip's signal text.
const SPARK_REPLIES: Record<string, string> = {
  "hard to start":
    "That's okay — beginning is often the hardest part, and there's no wrong way in. We don't have to name anything big; even a word or two about how you're feeling right now is more than enough.",
  "ask me":
    "Of course. Here's a gentle one, and you can answer however feels right: what's been taking up the most space in your mind lately?",
  "how does this":
    "It's simpler than it might look — this is just a space to talk. No forms, no checkboxes. You share whatever's on your mind, I listen and reflect it back, and together we get a clearer sense of what might help. You lead, I'll follow.",
  "not sure what":
    "That's completely okay — you really don't need to have it figured out. Most people arrive not quite knowing. If we just talk about what's going on for you, the part about what you need tends to surface on its own.",
};

const SPARK_SIGNALS = Object.keys(SPARK_REPLIES);

/**
 * Offline stand-in for the model-generated opening greeting (used when Azure
 * creds are absent or a request fails). Warm and static — the live experience
 * varies this via COMPANION_GREETING. Blank lines split it into paragraphs.
 */
export function fallbackOpening(): string {
  return [
    "Hi, I'm Huey, your Headway care companion. I'm really glad you're here.",
    "I'm here to help you get connected to the therapist who best matches what you need — and to stay with you along the way, answering questions and supporting you through your care journey.",
    "First, I'd just like to understand you a little. What's on your mind? Whether it's a feeling, a situation, or something that's been brewing for a while, there's no right way to begin — start however you want, and we'll work through it together.",
  ].join("\n\n");
}

function isSpark(text: string): boolean {
  const t = text.toLowerCase();
  return SPARK_SIGNALS.some((s) => t.includes(s));
}

// The turns that actually move the conversation forward: non-empty and not a
// "help me start" spark. Fit progress and readiness derive from THESE, not the
// raw turn count, so a spark turn never skips a fit prompt or fakes depth.
function substantiveTurns(userTexts: string[]): string[] {
  return userTexts.filter((t) => t.trim().length > 0 && !isSpark(t));
}

/**
 * Offline stand-in for the model's readiness judgment. Without the LLM we can't
 * truly assess depth, so we approximate "sufficient depth" the same way the
 * prompt frames it: enough substantive turns AND enough substance to synthesize
 * without guessing. Deliberately conservative so short conversations stay in Phase 1.
 */
function fallbackReadyForMirror(userTexts: string[]): boolean {
  // A spark-chip nudge (e.g. "it's hard to start") isn't readiness.
  const last = userTexts[userTexts.length - 1] || "";
  if (isSpark(last)) return false;

  const substantive = substantiveTurns(userTexts);
  // Movement one is ~2 turns; the first fit wondering is posed on the third
  // substantive turn, so require a fourth — the person has actually answered a
  // fit question — before signaling readiness. Otherwise the Mirror could open
  // with no support-preference signal for synthesis to reflect.
  if (substantive.length < 4) return false;

  const totalWords = substantive.reduce(
    (n, t) => n + t.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  // Roughly a few substantive sentences across the conversation.
  return totalWords >= 40;
}

export function fallbackCompanionReply(userTexts: string[]): string {
  const last = userTexts[userTexts.length - 1] || "";
  // Fit progress counts substantive turns, so a spark ("can you ask me something?")
  // neither skips the first fit prompt nor advances toward the Mirror on its own.
  const progress = substantiveTurns(userTexts).length;

  let reply: string;
  if (isSpark(last)) {
    // Meet a stuck signal with its own per-chip on-ramp; don't advance fit progress.
    const lower = last.toLowerCase();
    const sparkSignal = SPARK_SIGNALS.find((s) => lower.includes(s));
    reply = sparkSignal ? SPARK_REPLIES[sparkSignal] : SPARK_REPLIES[SPARK_SIGNALS[0]];
  } else if (progress <= 1) {
    // Movement one — help them feel heard.
    reply =
      "Thank you for saying that — it takes something to put it into words. I'm here, and there's no rush. What feels most tangled up in it right now?";
  } else if (progress === 2) {
    reply =
      "That makes a lot of sense. It sounds like there's real weight in what you're describing. What part of it feels heaviest?";
  } else {
    // Movement two — once they've opened up, let the same conversation drift toward what kind
    // of support would help, grown from what they've shared. Never announced, never a list.
    const fitIndex = progress - 3;
    reply = FIT_PROMPTS[fitIndex] ?? GENTLE_PROMPTS[fitIndex % GENTLE_PROMPTS.length];
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

// Person-only text (the transcript marks user turns "Person:"), so fit-preference
// keyword checks never accidentally match the companion's own fit questions.
function personText(transcript: string): string {
  return transcript
    .split(/\n+/)
    .filter((line) => /^\s*Person:/i.test(line))
    .map((line) => line.replace(/^\s*Person:\s*/i, ""))
    .join(" ")
    .toLowerCase();
}

/**
 * Lightweight offline reading of the fit preferences the person actually voiced,
 * so the Mirror's spectrums reflect what they said rather than fixed defaults.
 * Each axis only moves off-center when there's a clear one-sided signal; otherwise
 * it stays balanced (we don't invent a preference they didn't express).
 */
function deriveSpectrums(
  transcript: string,
): Record<"action_space" | "structure" | "depth", { value: number; note: string }> {
  const t = personText(transcript);
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  // action_space: 0 = tools & action, 100 = space to be heard.
  const wantsTools = has("things to try", "tools", "techniques", "strategies", "practical", "advice", "guidance", "homework", "exercises", "worksheets", "something to do", "action");
  const wantsSpace = has("listen", "hold space", "be heard", "feel heard", "just talk", "vent", "space to", "someone who hears");
  let action_space = { value: 55, note: "A balance of being heard and getting tools when you're ready." };
  if (wantsSpace && !wantsTools) action_space = { value: 80, note: "You said you mostly want someone who listens and holds space." };
  else if (wantsTools && !wantsSpace) action_space = { value: 25, note: "You said you'd want someone who also offers things to try, not only listening." };

  // structure: 0 = structured sessions, 100 = open exploration.
  const wantsStructure = has("structure", "agenda", "a plan", "clear steps", "goals", "direction", "framework", "organized", "each time", "guided");
  const wantsOpen = has("follow whatever", "wherever it goes", "room to", "unstructured", "see what comes up", "let it flow", "go where it", "open-ended");
  let structure = { value: 50, note: "A mix of gentle direction and room to follow what comes up." };
  if (wantsStructure && !wantsOpen) structure = { value: 25, note: "You leaned toward steady structure and a clear sense of direction." };
  else if (wantsOpen && !wantsStructure) structure = { value: 78, note: "You leaned toward open room to follow whatever surfaces." };

  // depth: 0 = practical & present, 100 = insight & depth.
  const wantsPresent = has("relief", "cope", "right now", "day to day", "day-to-day", "get through", "manage", "here and now", "here-and-now", "practical");
  const wantsDepth = has("deeper", "roots", "understand why", "root cause", "the past", "childhood", "patterns", "insight", "make sense of", "underneath");
  let depth = { value: 55, note: "Both some relief now and understanding the deeper why." };
  if (wantsPresent && !wantsDepth) depth = { value: 28, note: "You leaned toward practical relief in the here-and-now." };
  else if (wantsDepth && !wantsPresent) depth = { value: 80, note: "You leaned toward understanding the deeper roots, not just relief." };

  return { action_space, structure, depth };
}

export function fallbackSynthesis(transcript: string): Synthesis {
  const low = transcript.toLowerCase();
  const matched = THEME_MAP.filter((t) => t.key.some((k) => low.includes(k)));
  const chosen = (matched.length ? matched : [THEME_MAP[1], THEME_MAP[7]]).slice(0, 4);

  const fit = deriveSpectrums(transcript);

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
      { id: "action_space", leftLabel: "Action-oriented", rightLabel: "Space-holding", value: fit.action_space.value, note: fit.action_space.note },
      { id: "structure", leftLabel: "Structured sessions", rightLabel: "Open & exploratory", value: fit.structure.value, note: fit.structure.note },
      { id: "depth", leftLabel: "Practical & present", rightLabel: "Insight & depth", value: fit.depth.value, note: fit.depth.note },
    ],
  };
}

export function fallbackMatchReason(providerName: string): string {
  return `${providerName} works in a way that lines up closely with what you said matters most to you right now.`;
}

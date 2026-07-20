import type { Priority, SafetyAssessment, SafetyTier, Spectrum, SpectrumId, Synthesis } from "./types";
import { SUMMARY_READINESS_PROMPT } from "./copy";
import { MIRROR_READY_MARKER } from "./types";
import { isSpark, substantiveTurns, countWords } from "./signal";

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

// Each spark chip gets its own reply so tapping different chips doesn't return the
// same stale line. Keyed by the chip's exact signal text, lowercased -- the same
// value isSpark matches on (see SPARK_CHIPS in ./copy).
const SPARK_REPLIES: Record<string, string> = {
  "it's hard to start.":
    "That's okay — beginning is often the hardest part, and there's no wrong way in. We don't have to name anything big; even a word or two about how you're feeling right now is more than enough.",
  "could you ask me something to help me begin?":
    "Of course. Here's a gentle one, and you can answer however feels right: what's been taking up the most space in your mind lately?",
  "how does this work?":
    "It's simpler than it might look — this is just a space to talk. No forms, no checkboxes. You share whatever's on your mind, I listen and reflect it back, and together we get a clearer sense of what might help. You lead, I'll follow.",
  "i'm not sure what i need yet.":
    "That's completely okay — you really don't need to have it figured out. Most people arrive not quite knowing. If we just talk about what's going on for you, the part about what you need tends to surface on its own.",
};

/**
 * Offline stand-in for the model-generated opening greeting (used when Azure
 * creds are absent or a request fails). Warm and static — the live experience
 * varies this via companionGreeting. Blank lines split it into paragraphs.
 */
export function fallbackOpening(voiceEnabled: boolean): string {
  const invitation = voiceEnabled
    ? "You can share here, or use the voice button in the message box to talk it through."
    : "You can share whatever feels most present here.";

  return [
    "Hi, I'm Huey, your Headway care companion. I'm really glad you're here.",
    "I'm here to help you get connected to the therapist who best matches what you need — and to stay with you along the way, answering questions and supporting you through your care journey.",
    `First, I'd just like to understand how you're feeling. ${invitation} There's no right way to begin.`,
  ].join("\n\n");
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

  // Roughly a few substantive sentences across the conversation.
  return countWords(substantive) >= 40;
}

// Warm, steady holding replies for when the person's latest message trips the
// safety classifier. Deliberately NON-probing: a crisis moment is a time to
// steady someone and let them feel you're right there — not to interview them.
// The actual resources are woven in beneath by the UI, so these focus on
// presence and validation and hand off naturally to that layer.
const SAFETY_HOLD: Record<1 | 2 | 3, string> = {
  1: "Thank you for saying that out loud — it sounds like you're carrying something really heavy right now, and I'm really glad you told me. There's nothing you need to explain or have figured out; I'm here with you.",
  2: "I'm really glad you told me. What you're going through sounds so painful to carry, and I want you to know I'm taking it to heart — you deserve real support with this.",
  3: "I'm really glad you told me, and I'm taking what you shared seriously. You matter — more than this moment of pain is letting you feel right now — and you deserve to have someone with you through it.",
};

export function fallbackCompanionReply(userTexts: string[]): string {
  const last = userTexts[userTexts.length - 1] || "";

  // In a crisis moment, hold and steady rather than asking a probing question —
  // this pairs with the resources the UI weaves in beneath. Uses the same
  // classifier that drives that woven block, so the reply and the resources
  // always agree, and never appends the readiness marker (never move on mid-crisis).
  const tier = fallbackSafety(last).tier;
  if (tier >= 1) return SAFETY_HOLD[tier as 1 | 2 | 3];

  // Fit progress counts substantive turns, so a spark ("can you ask me something?")
  // neither skips the first fit prompt nor advances toward the Mirror on its own.
  const progress = substantiveTurns(userTexts).length;

  let reply: string;
  if (isSpark(last)) {
    // Meet a stuck signal with its own per-chip on-ramp; don't advance fit progress.
    // isSpark guarantees an exact chip signal, so this key is present; fall back
    // defensively in case a chip's signal text ever drifts from its reply key.
    reply = SPARK_REPLIES[last.trim().toLowerCase()] ?? Object.values(SPARK_REPLIES)[0];
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

  // Append the model-driven signal when depth is sufficient to offer a summary,
  // mirroring how the live model emits the marker on its own final line.
  if (fallbackReadyForMirror(userTexts)) {
    return `${SUMMARY_READINESS_PROMPT}\n${MIRROR_READY_MARKER}`;
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

// Parse the "Speaker: ..." transcript into whole turns. buildTranscript only
// prefixes the FIRST physical line of a message, so a Shift+Enter continuation
// line arrives without a "Person:"/"Companion:" marker; we attach such lines to
// the current turn instead of dropping them, keeping multi-line messages intact
// for the keyword, spectrum, and quote heuristics below.
type TranscriptTurn = { speaker: "person" | "companion"; text: string };

function parseTurns(transcript: string): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  for (const line of transcript.split("\n")) {
    const m = /^\s*(Person|Companion):\s?(.*)$/i.exec(line);
    if (m) {
      turns.push({ speaker: /^person$/i.test(m[1]) ? "person" : "companion", text: m[2] });
    } else if (turns.length) {
      turns[turns.length - 1].text += "\n" + line;
    }
  }
  return turns;
}

/** The person's own turns (continuation lines included, newlines preserved). */
function personTurns(transcript: string): string[] {
  return parseTurns(transcript)
    .filter((t) => t.speaker === "person")
    .map((t) => t.text);
}

function pickQuote(transcript: string, keys: string[]): string {
  // Draw the quote only from the person's own turns, never the companion's, so
  // the "in your words" source line can't accidentally surface Huey's copy.
  for (const turn of personTurns(transcript)) {
    for (const s of turn.split(/(?<=[.!?])\s+|\n+/)) {
      const low = s.toLowerCase();
      if (keys.some((k) => low.includes(k))) {
        const cleaned = s.trim();
        if (cleaned.length > 4) return truncate(cleaned, 90);
      }
    }
  }
  return "";
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

// Person-only text (continuation lines of multi-line messages included), so
// fit-preference keyword checks see everything the person said and never match
// the companion's own fit questions. Whitespace collapses for clean matching.
function personText(transcript: string): string {
  return personTurns(transcript).join(" ").replace(/\s+/g, " ").toLowerCase();
}

/**
 * Fit axes for the offline reading. Each axis has a low side (0) and high side
 * (100) with the keywords that voice each, so both the synthesis reading and the
 * refine correction path share one source of truth.
 */
type SpectrumAxis = {
  id: SpectrumId;
  low: { keys: string[]; value: number; note: string };
  high: { keys: string[]; value: number; note: string };
  neutral: { value: number; note: string };
};

const SPECTRUM_AXES: SpectrumAxis[] = [
  {
    id: "action_space", // 0 = tools & action, 100 = space to be heard.
    low: {
      keys: ["things to try", "tools", "techniques", "strategies", "practical", "advice", "guidance", "homework", "exercises", "worksheets", "something to do", "action"],
      value: 25,
      note: "You said you'd want someone who also offers things to try, not only listening.",
    },
    high: {
      keys: ["listen", "hold space", "be heard", "feel heard", "just talk", "vent", "space to", "someone who hears"],
      value: 80,
      note: "You said you mostly want someone who listens and holds space.",
    },
    neutral: { value: 55, note: "A balance of being heard and getting tools when you're ready." },
  },
  {
    id: "structure", // 0 = structured sessions, 100 = open exploration.
    low: {
      keys: ["structure", "agenda", "a plan", "clear steps", "goals", "direction", "framework", "organized", "each time", "guided"],
      value: 25,
      note: "You leaned toward steady structure and a clear sense of direction.",
    },
    high: {
      keys: ["follow whatever", "wherever it goes", "room to", "unstructured", "see what comes up", "let it flow", "go where it", "open-ended"],
      value: 78,
      note: "You leaned toward open room to follow whatever surfaces.",
    },
    neutral: { value: 50, note: "A mix of gentle direction and room to follow what comes up." },
  },
  {
    id: "depth", // 0 = practical & present, 100 = insight & depth.
    low: {
      keys: ["relief", "cope", "right now", "day to day", "day-to-day", "get through", "manage", "here and now", "here-and-now", "practical"],
      value: 28,
      note: "You leaned toward practical relief in the here-and-now.",
    },
    high: {
      keys: ["deeper", "roots", "understand why", "root cause", "the past", "childhood", "patterns", "insight", "make sense of", "underneath"],
      value: 80,
      note: "You leaned toward understanding the deeper roots, not just relief.",
    },
    neutral: { value: 55, note: "Both some relief now and understanding the deeper why." },
  },
];

/**
 * Lightweight offline reading of the fit preferences the person actually voiced,
 * so the Mirror's spectrums reflect what they said rather than fixed defaults.
 * Each axis only moves off-center when there's a clear one-sided signal; otherwise
 * it stays balanced (we don't invent a preference they didn't express).
 */
function deriveSpectrums(
  transcript: string,
): Record<SpectrumId, { value: number; note: string }> {
  const t = personText(transcript);
  const has = (keys: string[]) => keys.some((w) => t.includes(w));
  const out = {} as Record<SpectrumId, { value: number; note: string }>;
  for (const ax of SPECTRUM_AXES) {
    const low = has(ax.low.keys);
    const high = has(ax.high.keys);
    const pick = low && !high ? ax.low : high && !low ? ax.high : ax.neutral;
    out[ax.id] = { value: pick.value, note: pick.note };
  }
  return out;
}

export function fallbackSynthesis(transcript: string): Synthesis {
  // Match themes against only the person's words. The transcript also carries the
  // companion's turns (e.g. the handoff line, which says "changed"), and those
  // must never inject a theme the person never actually raised.
  const personLow = personText(transcript);
  const matched = THEME_MAP.filter((t) => t.key.some((k) => personLow.includes(k)));
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
      "Thank you for sharing. You named something real, and you gave me a sense not just of how it feels but of the kind of support that would help. What matters now is finding someone who meets you where you actually are. This is a first draft, and you can change anything by telling me.",
    priorities,
    spectrums: [
      { id: "action_space", leftLabel: "Action-oriented", rightLabel: "Space-holding", value: fit.action_space.value, note: fit.action_space.note },
      { id: "structure", leftLabel: "Structured sessions", rightLabel: "Open & exploratory", value: fit.structure.value, note: fit.structure.note },
      { id: "depth", leftLabel: "Practical & present", rightLabel: "Insight & depth", value: fit.depth.value, note: fit.depth.note },
    ],
  };
}

// Explicit removal cues for dropping a focus/priority. "less" is intentionally
// NOT here: "help me feel less anxious" is a goal, not a request to drop the
// anxiety focus. Softer dialing like "less" only negates fit-axis keywords.
const REFINE_REMOVAL_RE =
  /\b(remove|removing|drop|dropping|delete|deleting|take out|took out|get rid|rid of|without|not|no longer|no|don'?t|doesn'?t|didn'?t|won'?t|can'?t|cannot|isn'?t|aren'?t|stop|scratch|nix|forget)\b/;

// Spectrum axes additionally read softer "dial it down" phrasing as negation, so
// "less structure" moves toward the open end. Never applied to focus tags.
const REFINE_SOFT_NEGATION_RE = /\bless\b/;

// Contrast/replacement boundaries: a correction like "not anxiety, it's really work
// burnout" or "not anxiety but burnout" / "drop anxiety and add burnout" pivots at a
// comma, newline, "it's", "but", or an "and <verb>" hand-off, so we evaluate removal
// per clause rather than letting an earlier "not"/"drop" bleed onto the replacement
// named later. A Shift+Enter newline counts too, so "remove anxiety\nadd burnout"
// splits. Plain "and <noun>" is left intact so conjoined removals ("get rid of
// anxiety and depression") still drop both.
const REFINE_CLAUSE_RE =
  /[,;\n]|\bit'?s\b|\bit is\b|\binstead\b|\brather\b|\bbut\b|\bplus\b|\band\b(?=\s+(?:add|also|include|want|keep|drop|remove|delete|get\s+rid|take\s+out|nix|forget|scratch|lose|ditch))/;

/** The person's most recent turn (their correction), lowercased; newlines kept so
 *  REFINE_CLAUSE_RE can still split a multi-line correction into clauses. */
function latestPersonTurn(transcript: string): string {
  const turns = personTurns(transcript);
  const last = turns[turns.length - 1] ?? "";
  return last.trim().toLowerCase();
}

// True when the clause naming the keyword also carries a removal/negation cue — e.g.
// "remove anxiety" or "it's not anxiety" — but not "i'm not sure, maybe anxiety helps"
// (the hedge lives in a different clause) or "work is another burnout thing" (word
// boundaries keep "not" from matching inside "another"). With softNegation on (fit
// axes only), a soft "less" also counts, so "less structure" flips the axis while
// "feeling less anxious" never drops the anxiety focus.
function keywordRemoved(turn: string, keyword: string, softNegation = false): boolean {
  for (const clause of turn.split(REFINE_CLAUSE_RE)) {
    if (!clause.includes(keyword)) continue;
    if (REFINE_REMOVAL_RE.test(clause)) return true;
    if (softNegation && REFINE_SOFT_NEGATION_RE.test(clause)) return true;
  }
  return false;
}

/**
 * Read a fit signal from just the latest correction, honoring negation so
 * "less structure" or "not so structured" moves toward open exploration instead of
 * the structured side. Returns only the axes the newest turn clearly speaks to;
 * everything else is left to the existing summary.
 */
function latestSpectrumSignal(
  latest: string,
): Partial<Record<SpectrumId, { value: number; note: string }>> {
  const out: Partial<Record<SpectrumId, { value: number; note: string }>> = {};
  for (const ax of SPECTRUM_AXES) {
    const lowHit = ax.low.keys.some((k) => latest.includes(k));
    const highHit = ax.high.keys.some((k) => latest.includes(k));
    const lowNeg = ax.low.keys.some((k) => keywordRemoved(latest, k, true));
    const highNeg = ax.high.keys.some((k) => keywordRemoved(latest, k, true));
    // A negated keyword flips to the opposite side of the axis.
    const wantsLow = (lowHit && !lowNeg) || highNeg;
    const wantsHigh = (highHit && !highNeg) || lowNeg;
    if (wantsLow && !wantsHigh) out[ax.id] = { value: ax.low.value, note: ax.low.note };
    else if (wantsHigh && !wantsLow) out[ax.id] = { value: ax.high.value, note: ax.high.note };
  }
  return out;
}

export function fallbackRefine(
  transcript: string,
  current: Synthesis,
): Synthesis & { acknowledgment: string } {
  const latest = latestPersonTurn(transcript);
  const ack = "I've updated your summary — take a look.";

  // No prior summary to build on, or we couldn't read a latest turn: fall back to a
  // full resynthesis (the original behavior) rather than guessing.
  if (!latest || (!current.priorities.length && !current.spectrums.length)) {
    const next = fallbackSynthesis(transcript);
    return {
      reflection: next.reflection || current.reflection,
      priorities: next.priorities.length ? next.priorities : current.priorities,
      spectrums: next.spectrums.length ? next.spectrums : current.spectrums,
      acknowledgment: ack,
    };
  }

  // Bias toward the latest correction: keep the existing summary and apply only the
  // add/remove intent voiced in the newest turn. This way "drop anxiety, it's really
  // work burnout" removes anxiety instead of re-matching it from earlier in the
  // transcript (where the word still appears).
  const removedFocuses = new Set<string>();
  const additions: Priority[] = [];
  for (const theme of THEME_MAP) {
    const mentioned = theme.key.filter((k) => latest.includes(k));
    if (!mentioned.length) continue;
    if (mentioned.some((k) => keywordRemoved(latest, k))) {
      removedFocuses.add(theme.focus);
    } else {
      additions.push({
        id: "",
        title: theme.title,
        sourceQuote: pickQuote("Person: " + latest, theme.key) || "what you just added",
        description: theme.desc,
        focusTags: [theme.focus],
      });
    }
  }

  const kept = current.priorities.filter(
    (p) => !p.focusTags.some((f) => removedFocuses.has(f)),
  );
  const focuses = new Set(kept.flatMap((p) => p.focusTags));
  const merged = [...kept];
  for (const add of additions) {
    if (add.focusTags.some((f) => focuses.has(f))) continue;
    merged.push(add);
    add.focusTags.forEach((f) => focuses.add(f));
  }

  let priorities = merged.slice(0, 5).map((p, i) => ({ ...p, id: `p-${i}` }));
  if (!priorities.length) {
    priorities = [
      {
        id: "p-0",
        title: "Someone who really listens",
        sourceQuote: "what you shared just now",
        description: "More than anything, you want to feel genuinely heard.",
        focusTags: ["identity & self"],
      },
    ];
  }

  // Spectrums: only move an axis when the newest turn voices a fresh preference,
  // honoring negation ("less structure" -> open), otherwise keep what the person
  // already steered.
  const signal = latestSpectrumSignal(latest);
  const base = current.spectrums.length
    ? current.spectrums
    : fallbackSynthesis(transcript).spectrums;
  const spectrums: Spectrum[] = base.map((s) => {
    const sig = signal[s.id];
    return sig ? { ...s, value: sig.value, note: sig.note } : s;
  });

  return {
    reflection: current.reflection,
    priorities,
    spectrums,
    acknowledgment: ack,
  };
}

export function fallbackMatchReason(providerName: string): string {
  return `${providerName} works in a way that lines up closely with what you said matters most to you right now.`;
}

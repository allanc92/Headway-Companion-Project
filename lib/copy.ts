// Client-facing static copy. Kept out of prompts.ts (server) on purpose.

export interface SparkChip {
  label: string;
  /** The companionship signal sent to the AI when tapped — never prepopulates the composer. */
  signal: string;
}

/** Tapping a chip sends a gentle signal that summons more companionship. */
export const SPARK_CHIPS: SparkChip[] = [
  { label: "It's hard to start", signal: "It's hard to start." },
  { label: "Ask me something", signal: "Could you ask me something to help me begin?" },
  { label: "How does this work?", signal: "How does this work?" },
  { label: "I'm not sure what I need", signal: "I'm not sure what I need yet." },
];

export interface CrisisResource {
  name: string;
  detail: string;
  action: string;
  href: string;
  /** The dialable/textable digits within this resource — bolded when rendered. */
  number: string;
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: "988 Suicide & Crisis Lifeline",
    detail: "Call or text 988 — free, confidential, 24/7 (US).",
    action: "Call or text 988",
    href: "tel:988",
    number: "988",
  },
  {
    name: "Crisis Text Line",
    detail: "Text HOME to 741741 to reach a trained counselor (US).",
    action: "Text HOME to 741741",
    href: "sms:741741?&body=HOME",
    number: "741741",
  },
  {
    name: "Emergency services",
    detail: "If you or someone else is in immediate danger, call 911.",
    action: "Call 911",
    href: "tel:911",
    number: "911",
  },
];

/** Always-on quiet help affordance. */
export const HELP_LABEL = "Get help now";

/** Copy for the tiered safety overlay. */
export const SAFETY_COPY: Record<
  1 | 2 | 3,
  { title: string; body: string; dismiss: string }
> = {
  1: {
    title: "I want to pause with you for a second",
    body: "What you're carrying sounds really heavy. There's no pressure here — but if it would help to talk to someone right now, support is always one tap away.",
    dismiss: "I'm okay to keep going",
  },
  2: {
    title: "You don't have to hold this alone",
    body: "It sounds like things feel really hard right now. I'm not a crisis service, but people who are trained for exactly this are here for you, any time — day or night.",
    dismiss: "Thank you — I'd like to keep going",
  },
  3: {
    title: "Your safety matters most right now",
    body: "I'm really concerned about what you just shared, and I want to make sure you're safe. Please reach out to one of these now — they're free, confidential, and available 24/7. This matters more than anything else here.",
    dismiss: "I'm safe — return to the conversation",
  },
};

/**
 * Huey-voiced prose that weaves the crisis resources into his own reply (tiers
 * 1–3) as one continuous thought — no lead-in seam, no bolted-on list. Numbers
 * are wrapped in `{...}` tokens so they render bold and tappable inline while
 * the rest reads as ordinary conversation. Each tier ends by returning to the
 * conversation so it never dead-ends on a wall of resources.
 */
export const SAFETY_WEAVE: Record<1 | 2 | 3, string> = {
  1: "If it would ever help to talk this through with someone who isn't me, you don't have to carry it by yourself — you can call or text {988} any time, or text HOME to {741741} to reach a trained counselor. And if things ever feel like an emergency, {911} is always there. I'm still right here with you, though, and we can go at your pace.",
  2: "You really don't have to hold this alone. There are people trained for exactly this, here for you any time of day or night — you can call or text {988}, or text HOME to {741741} to reach a counselor. If it ever feels like immediate danger, please call {911}. I'm not going anywhere; we can keep talking whenever you're ready.",
  3: "What you're carrying sounds so heavy, and I don't want you to be alone with it. If it ever gets to be too much, please reach for someone who can be right there with you — you can call or text {988} any time, or text HOME to {741741} for a trained counselor. And if you or someone else is in immediate danger, please call {911}. I'm staying right here with you.",
};

/** Note shown near crisis resources acknowledging prototype status. */
export const SAFETY_DISCLAIMER =
  "This is a design prototype. The crisis-detection model shown here would require clinical review and sign-off before real-world use.";

/** Quick-exit for anyone in an unsafe living situation. */
export const QUICK_EXIT_HREF = "https://www.google.com/search?q=weather";

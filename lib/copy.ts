// Client-facing static copy. Kept out of prompts.ts (server) on purpose.

export interface SparkChip {
  label: string;
  /** The companionship signal sent to the AI when tapped — never prepopulates the composer. */
  signal: string;
}

/** The AI speaks first. Static so it appears instantly and breaks the blank-screen freeze. */
export const OPENING_LINES: string[] = [
  "I'm really glad you're here. That first step is often the hardest one.",
  "There are no forms or checkboxes here — I'd just like to understand you a little first, in your own words.",
  "Whatever's on your mind — a feeling, a situation, something from today — you can just start there. There's no right way to do this.",
];

/** Tapping a chip sends a gentle signal that summons more companionship. */
export const SPARK_CHIPS: SparkChip[] = [
  { label: "It's hard to start", signal: "It's hard to start." },
  { label: "Ask me something", signal: "Could you ask me something to help me begin?" },
  { label: "How does this work?", signal: "How does this work?" },
  { label: "I'm not sure what I need", signal: "I'm not sure what I need yet." },
];

/** Gentle affordance to move from Phase 1 into the Mirror when the person feels ready. */
export const READY_LABEL = "I think that's it for now";

export interface CrisisResource {
  name: string;
  detail: string;
  action: string;
  href: string;
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: "988 Suicide & Crisis Lifeline",
    detail: "Call or text 988 — free, confidential, 24/7 (US).",
    action: "Call or text 988",
    href: "tel:988",
  },
  {
    name: "Crisis Text Line",
    detail: "Text HOME to 741741 to reach a trained counselor (US).",
    action: "Text HOME to 741741",
    href: "sms:741741?&body=HOME",
  },
  {
    name: "Emergency services",
    detail: "If you or someone else is in immediate danger, call 911.",
    action: "Call 911",
    href: "tel:911",
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

/** Note shown near crisis resources acknowledging prototype status. */
export const SAFETY_DISCLAIMER =
  "This is a design prototype. The crisis-detection model shown here would require clinical review and sign-off before real-world use.";

/** Quick-exit for anyone in an unsafe living situation. */
export const QUICK_EXIT_HREF = "https://www.google.com/search?q=weather";

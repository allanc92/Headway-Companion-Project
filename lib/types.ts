// Shared domain types for the Intention Engine.

export type SafetyTier = 0 | 1 | 2 | 3;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export interface SafetyAssessment {
  tier: SafetyTier;
  category: string; // e.g. "none" | "distress" | "self-harm" | "harm-to-others" | "abuse" | "medical"
  rationale: string;
}

/** A single co-authored priority card, grown from the patient's own words. */
export interface Priority {
  id: string;
  title: string; // short, patient-owned label
  sourceQuote: string; // the patient's own phrase this grew from
  description: string; // one warm sentence of what this means for their care
  focusTags: string[]; // from FOCUS_AREAS — drives provider matching
}

/** A human spectrum the patient can steer (replaces cold filters). */
export interface Spectrum {
  id: SpectrumId;
  leftLabel: string;
  rightLabel: string;
  /** 0 = fully left, 100 = fully right */
  value: number;
  note?: string; // why the AI placed it here, in warm language
}

export type SpectrumId = "action_space" | "structure" | "depth";

/** The Mirror's structured synthesis of Phase 1. */
export interface Synthesis {
  reflection: string; // warm, in the patient's own words
  priorities: Priority[];
  spectrums: Spectrum[];
}

export interface IntakeContext {
  zip: string;
  insurance: string; // "" when skipped
}

export type Availability = "open" | "limited" | "waitlist";

export interface Provider {
  id: string;
  name: string;
  title: string; // "LICSW", "PhD, Psychologist", etc.
  pronouns?: string;
  photoSeed: string; // deterministic placeholder avatar seed
  modalities: string[]; // CBT, EMDR, Psychodynamic, ACT, ...
  specialties: string[]; // from FOCUS_AREAS
  spectrums: Record<SpectrumId, number>; // provider's position 0-100
  insuranceAccepted: string[];
  states: string[]; // licensed for telehealth
  inPersonZips: string[]; // metros with in-person availability
  telehealth: boolean;
  availability: Availability;
  nextAvailable: string; // human string
  identityTags: string[]; // e.g. "Woman of color", "LGBTQ+ affirming", "Multilingual (Spanish)"
  bio: string;
}

export interface ScoredProvider {
  provider: Provider;
  score: number; // 0-100 soft-fit
  reasons: string[]; // deterministic fit reasons in the patient's terms
  whyThisFits?: string; // optional LLM-written, patient-facing sentence
}

export interface Bottleneck {
  kind: "insurance" | "location" | "availability" | "none";
  message: string;
  unlocks: number; // how many more providers relaxing this unlocks
}

export interface MatchResult {
  matches: ScoredProvider[];
  totalInNetwork: number; // passed hard filters
  bottleneck: Bottleneck;
}

/** The persisted, living artifact. */
export interface Intention {
  createdAt: string;
  updatedAt: string;
  context: IntakeContext;
  reflection: string;
  priorities: Priority[];
  spectrums: Spectrum[];
  chosenProviderId?: string;
}

// Controlled vocabulary the synthesis maps priorities onto, and providers list.
export const FOCUS_AREAS = [
  "relationships",
  "anxiety",
  "depression",
  "grief & loss",
  "trauma",
  "life transitions",
  "identity & self",
  "stress & burnout",
  "self-esteem",
  "family",
] as const;

export type FocusArea = (typeof FOCUS_AREAS)[number];

export const SPECTRUM_META: Record<
  SpectrumId,
  { leftLabel: string; rightLabel: string; prompt: string }
> = {
  action_space: {
    leftLabel: "Action-oriented",
    rightLabel: "Space-holding",
    prompt:
      "Do they want a therapist who gives tools and homework, or one who holds quiet space to be heard?",
  },
  structure: {
    leftLabel: "Structured sessions",
    rightLabel: "Open & exploratory",
    prompt:
      "Do they want a clear agenda each session, or room to follow whatever surfaces?",
  },
  depth: {
    leftLabel: "Practical & present",
    rightLabel: "Insight & depth",
    prompt:
      "Do they want to work on the here-and-now, or explore roots and patterns?",
  },
};

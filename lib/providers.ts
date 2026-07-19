import type {
  IntakeContext,
  MatchTradeoff,
  MatchResult,
  Priority,
  Provider,
  ScoredProvider,
  Spectrum,
  SpectrumId,
} from "./types";

/** Canonical insurance plans offered on the homepage dropdown. */
export const INSURANCE_PLANS = [
  "Aetna",
  "Cigna",
  "UnitedHealthcare",
  "Blue Cross Blue Shield",
  "Optum",
  "Anthem",
  "Oscar Health",
  "Kaiser Permanente",
] as const;

/** Sentinel values from the homepage that mean "don't hard-filter on insurance." */
export const NO_INSURANCE_VALUES = ["", "self-pay", "not-sure"];

/**
 * Lightweight ZIP -> state approximation. Not exhaustive — enough for a prototype
 * so the location eligibility filter behaves believably.
 */
const ZIP3_STATE: Record<string, string> = {
  "100": "NY", "101": "NY", "102": "NY", "103": "NY", "104": "NY", "112": "NY",
  "070": "NJ", "071": "NJ", "072": "NJ", "088": "NJ",
  "060": "CT", "061": "CT", "062": "CT",
  "021": "MA", "022": "MA", "024": "MA",
  "191": "PA", "190": "PA",
  "200": "DC", "202": "DC",
  "300": "GA", "303": "GA",
  "330": "FL", "331": "FL", "333": "FL",
  "606": "IL", "600": "IL", "601": "IL",
  "770": "TX", "787": "TX", "750": "TX",
  "800": "CO", "802": "CO",
  "980": "WA", "981": "WA",
  "900": "CA", "902": "CA", "941": "CA", "940": "CA", "945": "CA",
};

const FIRST_DIGIT_STATE: Record<string, string> = {
  "0": "MA", "1": "NY", "2": "VA", "3": "FL", "4": "OH",
  "5": "MN", "6": "IL", "7": "TX", "8": "CO", "9": "CA",
};

export function zipToState(zip: string): string | null {
  const z = (zip || "").trim();
  if (!/^\d{3,5}/.test(z)) return null;
  const three = z.slice(0, 3);
  if (ZIP3_STATE[three]) return ZIP3_STATE[three];
  const first = z.slice(0, 1);
  return FIRST_DIGIT_STATE[first] ?? null;
}

const WIDE = ["NY", "NJ", "CT", "CA", "TX", "FL", "IL", "MA", "WA", "CO", "PA", "GA"];

export const PROVIDERS: Provider[] = [
  {
    id: "maya-ellison",
    name: "Maya Ellison",
    title: "LCSW",
    pronouns: "she/her",
    photoSeed: "maya",
    modalities: ["Emotionally Focused (EFT)", "CBT"],
    specialties: ["relationships", "anxiety"],
    spectrums: { action_space: 45, structure: 40, depth: 55 },
    insuranceAccepted: ["Aetna", "Cigna", "UnitedHealthcare", "Optum"],
    states: [...WIDE],
    inPersonZips: ["100", "101", "112"],
    telehealth: true,
    availability: "open",
    nextAvailable: "This week",
    identityTags: ["Warm & relational"],
    bio: "I help people untangle what's happening in their closest relationships and feel steadier in themselves.",
  },
  {
    id: "david-osei",
    name: "David Osei",
    title: "PsyD, Psychologist",
    pronouns: "he/him",
    photoSeed: "david",
    modalities: ["EMDR", "Psychodynamic"],
    specialties: ["trauma", "depression"],
    spectrums: { action_space: 70, structure: 65, depth: 85 },
    insuranceAccepted: ["Blue Cross Blue Shield", "Anthem", "Cigna"],
    states: ["NY", "NJ", "CT", "MA", "PA", "FL"],
    inPersonZips: ["100", "191"],
    telehealth: true,
    availability: "limited",
    nextAvailable: "Next week",
    identityTags: ["Trauma-informed"],
    bio: "I sit with people in the harder, deeper places and help them make sense of what they carry.",
  },
  {
    id: "priya-nair",
    name: "Priya Nair",
    title: "LMFT",
    pronouns: "she/her",
    photoSeed: "priya",
    modalities: ["Emotionally Focused (EFT)", "Systemic"],
    specialties: ["family", "relationships", "life transitions"],
    spectrums: { action_space: 60, structure: 55, depth: 60 },
    insuranceAccepted: ["Aetna", "Kaiser Permanente"],
    states: ["CA", "WA", "CO", "TX", "NY"],
    inPersonZips: ["941", "900"],
    telehealth: true,
    availability: "open",
    nextAvailable: "This week",
    identityTags: ["Multilingual (Hindi)"],
    bio: "I work with families and couples through change — and with the people holding it all together.",
  },
  {
    id: "sarah-chen",
    name: "Sarah Chen",
    title: "PhD, Psychologist",
    pronouns: "she/her",
    photoSeed: "sarah",
    modalities: ["CBT", "Mindfulness", "ACT"],
    specialties: ["anxiety", "stress & burnout"],
    spectrums: { action_space: 20, structure: 20, depth: 35 },
    insuranceAccepted: ["UnitedHealthcare", "Optum", "Oscar Health"],
    states: [...WIDE],
    inPersonZips: ["606"],
    telehealth: true,
    availability: "waitlist",
    nextAvailable: "In ~3 weeks",
    identityTags: ["Practical & structured"],
    bio: "I give people concrete tools for anxiety and burnout, so the week ahead feels more manageable.",
  },
  {
    id: "marcus-bell",
    name: "Marcus Bell",
    title: "LPC",
    pronouns: "he/him",
    photoSeed: "marcus",
    modalities: ["Person-centered", "IFS"],
    specialties: ["identity & self", "self-esteem"],
    spectrums: { action_space: 85, structure: 80, depth: 80 },
    insuranceAccepted: ["Cigna", "Aetna"],
    states: ["NY", "NJ", "GA", "FL", "TX", "CA"],
    inPersonZips: ["300"],
    telehealth: true,
    availability: "open",
    nextAvailable: "This week",
    identityTags: ["LGBTQ+ affirming"],
    bio: "I make room for people to explore who they are and come home to themselves, without judgment.",
  },
  {
    id: "elena-ruiz",
    name: "Elena Ruiz",
    title: "LCSW",
    pronouns: "she/her",
    photoSeed: "elena",
    modalities: ["Psychodynamic", "Person-centered"],
    specialties: ["grief & loss", "depression"],
    spectrums: { action_space: 80, structure: 75, depth: 80 },
    insuranceAccepted: ["Blue Cross Blue Shield", "Anthem"],
    states: ["CA", "TX", "FL", "CO", "WA", "NY"],
    inPersonZips: ["900", "902"],
    telehealth: true,
    availability: "open",
    nextAvailable: "This week",
    identityTags: ["Multilingual (Spanish)"],
    bio: "I hold quiet, steady space for grief and low seasons, at whatever pace feels right for you.",
  },
  {
    id: "james-whitfield",
    name: "James Whitfield",
    title: "PhD, Psychologist",
    pronouns: "he/him",
    photoSeed: "james",
    modalities: ["CBT", "Emotionally Focused (EFT)"],
    specialties: ["relationships", "anxiety"],
    spectrums: { action_space: 35, structure: 30, depth: 45 },
    insuranceAccepted: ["Aetna", "Cigna", "UnitedHealthcare"],
    states: ["NY", "NJ", "CT", "MA", "PA"],
    inPersonZips: ["021"],
    telehealth: true,
    availability: "limited",
    nextAvailable: "Next week",
    identityTags: ["Structured & warm"],
    bio: "I blend practical structure with real warmth to help you and your relationships feel less stuck.",
  },
  {
    id: "aisha-rahman",
    name: "Aisha Rahman",
    title: "LMHC",
    pronouns: "she/her",
    photoSeed: "aisha",
    modalities: ["EMDR", "DBT", "Mindfulness"],
    specialties: ["trauma", "anxiety"],
    spectrums: { action_space: 40, structure: 35, depth: 60 },
    insuranceAccepted: ["Optum", "UnitedHealthcare", "Oscar Health"],
    states: ["NY", "NJ", "FL", "TX", "IL", "CA"],
    inPersonZips: ["100"],
    telehealth: true,
    availability: "open",
    nextAvailable: "This week",
    identityTags: ["Trauma-informed", "Multilingual (Arabic)"],
    bio: "I help people steady their nervous system and move through trauma at a pace that feels safe.",
  },
  {
    id: "tomas-herrera",
    name: "Tomás Herrera",
    title: "LMFT",
    pronouns: "he/him",
    photoSeed: "tomas",
    modalities: ["Emotionally Focused (EFT)", "Systemic"],
    specialties: ["relationships", "family"],
    spectrums: { action_space: 55, structure: 50, depth: 55 },
    insuranceAccepted: ["Kaiser Permanente", "Aetna"],
    states: ["CA", "WA", "CO", "TX"],
    inPersonZips: ["941"],
    telehealth: true,
    availability: "limited",
    nextAvailable: "Next week",
    identityTags: ["Multilingual (Spanish)"],
    bio: "I help partners and families hear each other again and rebuild trust where it's frayed.",
  },
  {
    id: "rebecca-stern",
    name: "Rebecca Stern",
    title: "LICSW",
    pronouns: "she/her",
    photoSeed: "rebecca",
    modalities: ["ACT", "Solution-focused"],
    specialties: ["stress & burnout", "life transitions"],
    spectrums: { action_space: 15, structure: 25, depth: 30 },
    insuranceAccepted: ["Cigna", "Blue Cross Blue Shield", "Anthem"],
    states: [...WIDE],
    inPersonZips: ["021", "100"],
    telehealth: true,
    availability: "open",
    nextAvailable: "This week",
    identityTags: ["Goal-oriented"],
    bio: "I help people in big transitions get clear on what matters next and take doable steps toward it.",
  },
  {
    id: "nina-patel",
    name: "Nina Patel",
    title: "PsyD, Psychologist",
    pronouns: "she/her",
    photoSeed: "nina",
    modalities: ["IFS", "Psychodynamic"],
    specialties: ["identity & self", "self-esteem", "anxiety"],
    spectrums: { action_space: 75, structure: 70, depth: 85 },
    insuranceAccepted: ["UnitedHealthcare", "Optum"],
    states: ["NY", "NJ", "CA", "IL", "CO", "WA"],
    inPersonZips: ["606"],
    telehealth: true,
    availability: "open",
    nextAvailable: "This week",
    identityTags: ["Depth-oriented"],
    bio: "I help people meet the parts of themselves they've been at war with, and soften toward who they are.",
  },
  {
    id: "grace-okafor",
    name: "Grace Okafor",
    title: "LPC",
    pronouns: "she/her",
    photoSeed: "grace",
    modalities: ["Person-centered", "CBT"],
    specialties: ["depression", "grief & loss"],
    spectrums: { action_space: 50, structure: 45, depth: 50 },
    insuranceAccepted: ["Aetna", "Cigna"],
    states: ["GA", "FL", "TX", "NY", "NJ"],
    inPersonZips: ["300"],
    telehealth: true,
    availability: "waitlist",
    nextAvailable: "In ~2 weeks",
    identityTags: ["Woman of color"],
    bio: "I walk with people through depression and loss with steadiness, honesty, and real care.",
  },
  {
    id: "daniel-kim",
    name: "Daniel Kim",
    title: "PhD, Psychologist",
    pronouns: "he/him",
    photoSeed: "daniel",
    modalities: ["CBT", "EMDR"],
    specialties: ["anxiety", "trauma"],
    spectrums: { action_space: 30, structure: 30, depth: 55 },
    insuranceAccepted: ["Blue Cross Blue Shield", "Anthem", "UnitedHealthcare"],
    states: ["CA", "WA", "OR", "NY", "TX", "IL"],
    inPersonZips: ["980", "900"],
    telehealth: true,
    availability: "limited",
    nextAvailable: "Next week",
    identityTags: ["Structured & calming"],
    bio: "I use practical, evidence-based tools to quiet anxiety and gently process what's underneath it.",
  },
  {
    id: "hannah-levi",
    name: "Hannah Levi",
    title: "LMFT",
    pronouns: "she/her",
    photoSeed: "hannah",
    modalities: ["Emotionally Focused (EFT)", "Narrative"],
    specialties: ["relationships", "life transitions", "identity & self"],
    spectrums: { action_space: 65, structure: 60, depth: 65 },
    insuranceAccepted: ["Aetna", "Cigna", "Optum"],
    states: [...WIDE],
    inPersonZips: ["100", "021"],
    telehealth: true,
    availability: "open",
    nextAvailable: "This week",
    identityTags: ["Warm & curious"],
    bio: "I help people rewrite the stories they tell about themselves as life shifts around them.",
  },
];

// ---- Matching ---------------------------------------------------------------

function passesInsurance(p: Provider, insurance: string): boolean {
  if (NO_INSURANCE_VALUES.includes(insurance)) return true;
  return p.insuranceAccepted.includes(insurance);
}

function passesLocation(p: Provider, zip: string): boolean {
  const state = zipToState(zip);
  const inPerson = p.inPersonZips.some((z) => zip.startsWith(z));
  if (inPerson) return true;
  if (!p.telehealth) return false;
  if (!state) return true; // unknown ZIP: don't block a telehealth provider
  return p.states.includes(state);
}

const AVAIL_BONUS: Record<Provider["availability"], number> = {
  open: 0.08,
  limited: 0,
  waitlist: -0.07,
};

const SPECTRUM_IDS: SpectrumId[] = ["action_space", "structure", "depth"];

function spectrumSimilarity(
  desired: Record<SpectrumId, number>,
  provider: Record<SpectrumId, number>,
): number {
  const avgDiff =
    SPECTRUM_IDS.reduce(
      (sum, id) => sum + Math.abs(desired[id] - provider[id]),
      0,
    ) / SPECTRUM_IDS.length;
  return 1 - avgDiff / 100;
}

function toDesiredSpectrums(spectrums: Spectrum[]): Record<SpectrumId, number> {
  const out: Record<SpectrumId, number> = {
    action_space: 50,
    structure: 50,
    depth: 50,
  };
  for (const s of spectrums) {
    if (s.id in out) out[s.id] = clamp(s.value, 0, 100);
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

const SPECTRUM_PHRASES: Record<SpectrumId, [string, string]> = {
  action_space: ["offers tools and direction", "holds quiet space to be heard"],
  structure: ["keeps sessions structured", "leaves room to explore openly"],
  depth: ["stays practical and present", "goes deep into roots and patterns"],
};

function buildReasons(
  p: Provider,
  sharedFocus: string[],
  desired: Record<SpectrumId, number>,
): string[] {
  const reasons: string[] = [];
  if (sharedFocus.length) {
    reasons.push(`Specializes in ${sharedFocus.join(" & ")}`);
  }
  // Highlight the spectrum where alignment is strongest.
  let bestId: SpectrumId = "action_space";
  let bestDiff = Infinity;
  for (const id of SPECTRUM_IDS) {
    const diff = Math.abs(desired[id] - p.spectrums[id]);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestId = id;
    }
  }
  if (bestDiff <= 25) {
    const leansRight = p.spectrums[bestId] >= 50;
    reasons.push(
      `Matches how you want to work — ${SPECTRUM_PHRASES[bestId][leansRight ? 1 : 0]}`,
    );
  }
  if (p.availability === "open") reasons.push("Has openings this week");
  else if (p.availability === "waitlist") reasons.push("Has a short waitlist");
  return reasons;
}

function scoreProvider(
  p: Provider,
  focusSet: Set<string>,
  desired: Record<SpectrumId, number>,
): ScoredProvider {
  const shared = p.specialties.filter((s) => focusSet.has(s));
  const focusOverlap = focusSet.size ? shared.length / focusSet.size : 0;
  const spectrumSim = spectrumSimilarity(desired, p.spectrums);

  let score01: number;
  if (focusSet.size) {
    score01 = 0.55 * focusOverlap + 0.37 * spectrumSim + AVAIL_BONUS[p.availability];
  } else {
    score01 = 0.85 * spectrumSim + AVAIL_BONUS[p.availability];
  }
  const score = Math.round(clamp(score01, 0, 1) * 100);

  return {
    provider: p,
    score: clamp(score, 35, 99),
    reasons: buildReasons(p, shared, desired),
  };
}

interface TradeoffCandidate extends MatchTradeoff {
  strength: number;
}

const SPECTRUM_TRADEOFF_LABELS: Record<
  SpectrumId,
  readonly [string, string]
> = {
  action_space: ["tools and direction", "space to be heard"],
  structure: ["structured sessions", "open exploration"],
  depth: ["practical, present-focused work", "deeper exploration"],
};

const FOCUS_LABELS: Record<string, string> = {
  relationships: "relationship work",
  anxiety: "anxiety support",
  depression: "depression support",
  "grief & loss": "grief and loss",
  trauma: "trauma-informed work",
  "life transitions": "life transitions",
  "identity & self": "identity and self-exploration",
  "stress & burnout": "stress and burnout",
  "self-esteem": "self-esteem",
  family: "family work",
};

function availabilityTradeoff(
  matches: ScoredProvider[],
): TradeoffCandidate | null {
  const closest = matches[0];
  if (!closest || closest.provider.availability === "open") return null;

  const openCount = matches.filter(
    ({ provider }) => provider.availability === "open",
  ).length;
  if (!openCount) return null;

  const timing =
    closest.provider.availability === "waitlist"
      ? "a short waitlist"
      : "limited availability";
  const alternatives =
    openCount === 1
      ? "Another match has openings this week"
      : `${openCount} other matches have openings this week`;

  return {
    kind: "availability",
    strength: 100,
    message: `Your closest fit has ${timing}. If starting sooner matters more, ${alternatives}, with a different balance of focus and working style.`,
  };
}

function priorityTradeoff(
  matches: ScoredProvider[],
  priorities: Priority[],
): TradeoffCandidate | null {
  const focusTags = [...new Set(priorities.flatMap((p) => p.focusTags))];
  if (focusTags.length < 2) return null;

  const coverage = focusTags
    .map((tag) => ({
      tag,
      providerIds: new Set(
        matches
          .filter(({ provider }) => provider.specialties.includes(tag))
          .map(({ provider }) => provider.id),
      ),
    }))
    .filter(({ providerIds }) => providerIds.size > 0);

  let best:
    | {
        first: (typeof coverage)[number];
        second: (typeof coverage)[number];
        reach: number;
      }
    | undefined;

  for (let i = 0; i < coverage.length; i += 1) {
    for (let j = i + 1; j < coverage.length; j += 1) {
      const first = coverage[i];
      const second = coverage[j];
      const sharesProvider = [...first.providerIds].some((id) =>
        second.providerIds.has(id),
      );
      if (sharesProvider) continue;

      const reach = first.providerIds.size + second.providerIds.size;
      if (!best || reach > best.reach) best = { first, second, reach };
    }
  }

  if (!best) return null;

  const firstLabel =
    FOCUS_LABELS[best.first.tag] ?? best.first.tag.replaceAll("&", "and");
  const secondLabel =
    FOCUS_LABELS[best.second.tag] ?? best.second.tag.replaceAll("&", "and");

  return {
    kind: "priority",
    strength: 55 + Math.min(20, best.reach * 3),
    message: `Your matches divide between therapists who lead with ${firstLabel} and those who lead with ${secondLabel}. Deciding which feels most important right now can help you choose where to start.`,
  };
}

function styleTradeoff(
  matches: ScoredProvider[],
  spectrums: Spectrum[],
  desired: Record<SpectrumId, number>,
): TradeoffCandidate | null {
  const specifiedIds = new Set(spectrums.map((s) => s.id));
  let best: TradeoffCandidate | null = null;

  for (const id of SPECTRUM_IDS) {
    if (!specifiedIds.has(id)) continue;

    const desiredValue = desired[id];
    if (Math.abs(desiredValue - 50) < 15) continue;

    const towardHigh = desiredValue < 50;
    const alternatives = matches
      .map(({ provider }) => {
        const providerValue = provider.spectrums[id];
        const movement = towardHigh
          ? providerValue - desiredValue
          : desiredValue - providerValue;
        return movement;
      })
      .filter((movement) => movement >= 20);

    if (!alternatives.length) continue;

    const preferredLabel =
      SPECTRUM_TRADEOFF_LABELS[id][desiredValue < 50 ? 0 : 1];
    const alternativeLabel =
      SPECTRUM_TRADEOFF_LABELS[id][desiredValue < 50 ? 1 : 0];
    const subject =
      alternatives.length === 1
        ? "One of these matches leans"
        : `${alternatives.length} of these matches lean`;
    const averageMovement =
      alternatives.reduce((sum, movement) => sum + movement, 0) /
      alternatives.length;
    const candidate: TradeoffCandidate = {
      kind: "style",
      strength:
        45 +
        Math.min(35, Math.round(averageMovement / 2)) +
        Math.min(15, alternatives.length * 3),
      message: `You leaned toward ${preferredLabel}. ${subject} more toward ${alternativeLabel}. Staying open to that balance gives you more choice without changing the priorities you named.`,
    };

    if (!best || candidate.strength > best.strength) best = candidate;
  }

  return best;
}

function detectTradeoff(
  matches: ScoredProvider[],
  priorities: Priority[],
  spectrums: Spectrum[],
  desired: Record<SpectrumId, number>,
): MatchTradeoff {
  if (matches.length < 2) return { kind: "none", message: "" };

  const candidates = [
    availabilityTradeoff(matches),
    priorityTradeoff(matches, priorities),
    styleTradeoff(matches, spectrums, desired),
  ].filter((candidate): candidate is TradeoffCandidate => candidate !== null);

  const best = candidates.reduce<TradeoffCandidate | null>(
    (current, candidate) =>
      !current || candidate.strength > current.strength ? candidate : current,
    null,
  );

  return best
    ? { kind: best.kind, message: best.message }
    : { kind: "none", message: "" };
}

export function matchProviders(
  context: IntakeContext,
  priorities: Priority[],
  spectrums: Spectrum[],
): MatchResult {
  const desired = toDesiredSpectrums(spectrums);
  const focusSet = new Set<string>();
  for (const pr of priorities) for (const t of pr.focusTags) focusSet.add(t);

  const inNetwork = PROVIDERS.filter(
    (p) => passesInsurance(p, context.insurance) && passesLocation(p, context.zip),
  );

  const scored = inNetwork
    .map((p) => scoreProvider(p, focusSet, desired))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // tie-break: distribute toward real availability
      const rank = { open: 0, limited: 1, waitlist: 2 } as const;
      return rank[a.provider.availability] - rank[b.provider.availability];
    });
  const matches = scored.slice(0, 6);

  return {
    matches,
    totalInNetwork: inNetwork.length,
    tradeoff: detectTradeoff(matches, priorities, spectrums, desired),
  };
}

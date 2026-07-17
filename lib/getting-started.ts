export const STATE_NAMES: Record<string, string> = {
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "Washington, DC",
  FL: "Florida",
  GA: "Georgia",
  IL: "Illinois",
  MA: "Massachusetts",
  MN: "Minnesota",
  NJ: "New Jersey",
  NY: "New York",
  OH: "Ohio",
  PA: "Pennsylvania",
  TX: "Texas",
  VA: "Virginia",
  WA: "Washington",
};

export function getStateName(abbreviation: string | null): string | null {
  if (!abbreviation) return null;
  return STATE_NAMES[abbreviation.toUpperCase()] ?? null;
}

export function getDeterministicProviderCount(seed: string): number {
  const normalized = seed.trim().toUpperCase();
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) % 1401;
  }

  return 1200 + hash;
}

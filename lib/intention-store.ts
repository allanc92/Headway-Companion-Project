import type { Intention } from "./types";

const KEY = "headway.intention.v1";

export function loadIntention(): Intention | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Intention) : null;
  } catch {
    return null;
  }
}

export function saveIntention(intention: Intention): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(intention));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function updateIntention(patch: Partial<Intention>): Intention | null {
  const current = loadIntention();
  if (!current) return null;
  const next: Intention = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  saveIntention(next);
  return next;
}

export function clearIntention(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

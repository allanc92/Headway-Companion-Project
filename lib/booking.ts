import type { Provider } from "./types";

export interface BookingDay {
  date: string;
  dayLabel: string;
  times: string[];
}

const THERAPY_TIMES = [
  "8:00 AM",
  "9:00 AM",
  "10:30 AM",
  "11:00 AM",
  "12:30 PM",
  "1:00 PM",
  "2:30 PM",
  "3:00 PM",
  "4:30 PM",
  "5:00 PM",
  "6:00 PM",
] as const;

const TIME_TO_MINUTES: Record<string, number> = {
  "8:00 AM": 8 * 60,
  "9:00 AM": 9 * 60,
  "10:30 AM": 10 * 60 + 30,
  "11:00 AM": 11 * 60,
  "12:30 PM": 12 * 60 + 30,
  "1:00 PM": 13 * 60,
  "2:30 PM": 14 * 60 + 30,
  "3:00 PM": 15 * 60,
  "4:30 PM": 16 * 60 + 30,
  "5:00 PM": 17 * 60,
  "6:00 PM": 18 * 60,
};

const AVAILABILITY_CONFIG = {
  open: { minOffset: 2, maxOffset: 3, minDays: 4, maxDays: 5, minTimes: 3, maxTimes: 4 },
  limited: { minOffset: 5, maxOffset: 6, minDays: 2, maxDays: 3, minTimes: 2, maxTimes: 3 },
  waitlist: { minOffset: 10, maxOffset: 14, minDays: 2, maxDays: 3, minTimes: 1, maxTimes: 2 },
} as const;

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickInRange(seed: number, min: number, max: number): number {
  return min + (seed % (max - min + 1));
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function firstWeekdayOnOrAfter(date: Date): Date {
  let next = new Date(date);
  while (isWeekend(next)) {
    next = addDays(next, 1);
  }
  return next;
}

function nextWeekdayAfter(date: Date): Date {
  return firstWeekdayOnOrAfter(addDays(date, 1));
}

function pickTimes(providerId: string, dayIndex: number, count: number): string[] {
  return [...THERAPY_TIMES]
    .map((time) => ({
      time,
      rank: hashSeed(`${providerId}:${dayIndex}:${time}`),
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, count)
    .map(({ time }) => time)
    .sort((a, b) => TIME_TO_MINUTES[a] - TIME_TO_MINUTES[b]);
}

export function getProviderBookingDays(provider: Provider, today = new Date()): BookingDay[] {
  const config = AVAILABILITY_CONFIG[provider.availability];
  const providerSeed = hashSeed(provider.id);
  const startOffset = pickInRange(providerSeed, config.minOffset, config.maxOffset);
  const dayCount = pickInRange(hashSeed(`${provider.id}:days`), config.minDays, config.maxDays);
  let cursor = firstWeekdayOnOrAfter(addDays(today, startOffset));

  return Array.from({ length: dayCount }, (_, index) => {
    const timeSeed = hashSeed(`${provider.id}:times:${index}`);
    const timeCount = pickInRange(timeSeed, config.minTimes, config.maxTimes);
    const day: BookingDay = {
      date: toIsoDate(cursor),
      dayLabel: toDayLabel(cursor),
      times: pickTimes(provider.id, index, timeCount),
    };
    cursor = nextWeekdayAfter(cursor);
    return day;
  });
}

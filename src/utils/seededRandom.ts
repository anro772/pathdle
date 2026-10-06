/**
 * Deterministic random numbers for the Daily challenge.
 * Everyone playing on the same UTC day gets the same targets, shops, hints and gold options.
 */

/** A random source returning floats in [0, 1), like Math.random */
export type Rng = () => number;

/** First Daily puzzle (#1) */
const DAILY_EPOCH = Date.UTC(2026, 9, 6);

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Mulberry32: tiny, fast, good-enough seeded PRNG.
 * @param seed - 32-bit integer seed
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash to a 32-bit integer */
export function hashString(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Creates a seeded RNG from any number of string/number parts */
export function seededRng(...parts: Array<string | number>): Rng {
  return mulberry32(hashString(parts.join('|')));
}

/** Fisher-Yates shuffle (in place) using the given random source */
export function shuffle<T>(array: T[], rng: Rng = Math.random): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** Today's Daily key as an ISO date (UTC), e.g. "2026-10-06" */
export function getDailyKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Daily puzzle number (#1 = 2026-10-06) */
export function getDailyNumber(date: Date = new Date()): number {
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((today - DAILY_EPOCH) / DAY_MS) + 1;
}

/** Milliseconds until the next Daily (UTC midnight) */
export function msUntilNextDaily(date: Date = new Date()): number {
  const next = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return next - date.getTime();
}

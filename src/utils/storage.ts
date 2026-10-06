/**
 * localStorage helpers. Every access is wrapped so private windows or
 * blocked storage never break the game.
 */

import type { LevelOutcome } from '../types/items';
import { computeDailyStats, EMPTY_LIFETIME, type DailyStats, type LifetimeStats } from './progress';
import { getDailyKey } from './seededRandom';

const DAILY_PREFIX = 'pathdle-daily-';

const KEYS = {
  bests: 'pathdle-bests',
  legacyBestLevel: 'pathdle-best-level',
  daily: (date: string) => `${DAILY_PREFIX}${date}`,
  playerName: 'pathdle-player-name',
  howToPlaySeen: 'pathdle-how-to-play-seen',
  muted: 'pathdle-muted',
  lifetime: 'pathdle-lifetime',
  achievements: 'pathdle-achievements',
  codex: 'pathdle-codex',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable - ignore
  }
}

// ============================================================================
// Personal bests
// ============================================================================

export interface PersonalBests {
  endlessLevel: number;
  endlessScore: number;
}

export function getBests(): PersonalBests {
  const legacyLevel = Number(read<number>(KEYS.legacyBestLevel, 0)) || 0;
  const bests = read<Partial<PersonalBests>>(KEYS.bests, {});
  return {
    endlessLevel: Math.max(bests.endlessLevel ?? 0, legacyLevel),
    endlessScore: bests.endlessScore ?? 0,
  };
}

export function saveBests(bests: PersonalBests): void {
  write(KEYS.bests, bests);
}

// ============================================================================
// Daily results
// ============================================================================

export interface DailyResult {
  score: number;
  outcomes: LevelOutcome[];
  finished: boolean;
  lives?: number;
  streak?: number;
  /** Level that was being played when progress was saved (forfeited if abandoned) */
  inProgressLevel?: number;
  /** Whether the result was posted to the leaderboard */
  submitted?: boolean;
}

export function getDailyResult(date: string): DailyResult | null {
  return read<DailyResult | null>(KEYS.daily(date), null);
}

export function saveDailyResult(date: string, result: DailyResult): void {
  write(KEYS.daily(date), result);
}

// ============================================================================
// Preferences
// ============================================================================

export function getPlayerName(): string {
  return read<string>(KEYS.playerName, '');
}

export function savePlayerName(name: string): void {
  write(KEYS.playerName, name);
}

export function hasSeenHowToPlay(): boolean {
  return read<boolean>(KEYS.howToPlaySeen, false);
}

export function markHowToPlaySeen(): void {
  write(KEYS.howToPlaySeen, true);
}

export function getMuted(): boolean {
  return read<boolean>(KEYS.muted, false);
}

export function saveMuted(muted: boolean): void {
  write(KEYS.muted, muted);
}

/** Every saved Daily, keyed by date */
export function getAllDailyResults(): Record<string, DailyResult> {
  const results: Record<string, DailyResult> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(DAILY_PREFIX)) continue;
      const result = read<DailyResult | null>(key, null);
      if (result) results[key.slice(DAILY_PREFIX.length)] = result;
    }
  } catch {
    // Storage unavailable - no history
  }
  return results;
}

/** Wordle-style stats over every finished Daily on this device */
export function getDailyStats(): DailyStats {
  return computeDailyStats(getAllDailyResults(), getDailyKey());
}

// ============================================================================
// Progress
// ============================================================================

export function getLifetime(): LifetimeStats {
  return { ...EMPTY_LIFETIME, ...read<Partial<LifetimeStats>>(KEYS.lifetime, {}) };
}

export function saveLifetime(stats: LifetimeStats): void {
  write(KEYS.lifetime, stats);
}

export function getUnlockedAchievements(): string[] {
  return read<string[]>(KEYS.achievements, []);
}

export function saveUnlockedAchievements(ids: string[]): void {
  write(KEYS.achievements, ids);
}

/** Item IDs built perfectly at least once */
export function getCodex(): string[] {
  return read<string[]>(KEYS.codex, []);
}

export function saveCodex(ids: string[]): void {
  write(KEYS.codex, ids);
}

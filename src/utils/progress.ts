/**
 * Long-term progress: lifetime counters, achievements and Daily stats.
 * Pure functions only; persistence lives in storage.ts.
 */

import type { GameMode, LevelOutcome } from '../types/items';
import type { DailyResult } from './storage';
import { DAILY_LEVELS } from './difficultySettings';

// ============================================================================
// Lifetime stats
// ============================================================================

export interface LifetimeStats {
  levelsCleared: number;
  perfectLevels: number;
  buyAlls: number;
  goldChecksPassed: number;
  hiddenGems: number;
  bestStreak: number;
  fastClears: number;
  bestEndlessLevel: number;
  dailiesFinished: number;
  flawlessDailies: number;
  championBonusCorrect: number;
}

export const EMPTY_LIFETIME: LifetimeStats = {
  levelsCleared: 0,
  perfectLevels: 0,
  buyAlls: 0,
  goldChecksPassed: 0,
  hiddenGems: 0,
  bestStreak: 0,
  fastClears: 0,
  bestEndlessLevel: 0,
  dailiesFinished: 0,
  flawlessDailies: 0,
  championBonusCorrect: 0,
};

/** Seconds or less to count as a "fast clear" */
export const FAST_CLEAR_SECONDS = 5;

export interface LevelEvent {
  mode: GameMode;
  outcome: LevelOutcome;
  buyAll: boolean;
  goldCheckPassed: boolean;
  /** Seconds spent before the last purchase */
  secondsUsed: number;
  /** Streak after this level */
  streak: number;
  /** Finished item that no Challenger player built in the snapshot */
  hiddenGem: boolean;
}

/** Records a finished level (Practice doesn't count towards lifetime stats) */
export function applyLevel(stats: LifetimeStats, event: LevelEvent): LifetimeStats {
  if (event.mode === 'practice' || event.outcome === 'failed') return stats;

  return {
    ...stats,
    levelsCleared: stats.levelsCleared + 1,
    perfectLevels: stats.perfectLevels + (event.outcome === 'perfect' ? 1 : 0),
    buyAlls: stats.buyAlls + (event.buyAll ? 1 : 0),
    goldChecksPassed: stats.goldChecksPassed + (event.goldCheckPassed ? 1 : 0),
    hiddenGems: stats.hiddenGems + (event.hiddenGem ? 1 : 0),
    bestStreak: Math.max(stats.bestStreak, event.streak),
    fastClears: stats.fastClears + (event.secondsUsed <= FAST_CLEAR_SECONDS ? 1 : 0),
  };
}

/** Records the end of an Endless or Daily run */
export function applyRunEnd(
  stats: LifetimeStats,
  run: { mode: GameMode; level: number; outcomes: LevelOutcome[] }
): LifetimeStats {
  if (run.mode === 'endless') {
    return { ...stats, bestEndlessLevel: Math.max(stats.bestEndlessLevel, run.level) };
  }
  if (run.mode === 'daily') {
    const flawless = run.outcomes.length === DAILY_LEVELS && run.outcomes.every(o => o === 'perfect');
    return {
      ...stats,
      dailiesFinished: stats.dailiesFinished + 1,
      flawlessDailies: stats.flawlessDailies + (flawless ? 1 : 0),
    };
  }
  return stats;
}

// ============================================================================
// Achievements
// ============================================================================

export interface AchievementContext {
  stats: LifetimeStats;
  codexCount: number;
  codexTotal: number;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-blood', icon: '🩸', title: 'First Blood', description: 'Clear your first level', check: c => c.stats.levelsCleared >= 1 },
  { id: 'perfectionist', icon: '✨', title: 'Perfectionist', description: 'Clear 25 levels without a mistake', check: c => c.stats.perfectLevels >= 25 },
  { id: 'buy-all', icon: '⚡', title: 'Know-It-All', description: 'Buy All 5 times', check: c => c.stats.buyAlls >= 5 },
  { id: 'buy-all-master', icon: '🛒', title: 'One-Click Shopper', description: 'Buy All 25 times', check: c => c.stats.buyAlls >= 25 },
  { id: 'on-fire', icon: '🔥', title: 'On Fire', description: 'Reach a 5-level perfect streak', check: c => c.stats.bestStreak >= 5 },
  { id: 'inferno', icon: '🌋', title: 'Unstoppable', description: 'Reach a 10-level perfect streak', check: c => c.stats.bestStreak >= 10 },
  { id: 'gold-digger', icon: '💰', title: 'Gold Digger', description: 'Pass 20 gold checks', check: c => c.stats.goldChecksPassed >= 20 },
  { id: 'hidden-gems', icon: '💎', title: 'Gem Hunter', description: 'Build 5 items no Challenger built', check: c => c.stats.hiddenGems >= 5 },
  { id: 'speedrunner', icon: '⏱️', title: 'Speedrunner', description: `Clear a level in ${FAST_CLEAR_SECONDS}s or less`, check: c => c.stats.fastClears >= 1 },
  { id: 'marathon', icon: '🏃', title: 'Marathon', description: 'Reach level 15 in Endless', check: c => c.stats.bestEndlessLevel >= 15 },
  { id: 'legend', icon: '👑', title: 'Legendary', description: 'Reach level 25 in Endless', check: c => c.stats.bestEndlessLevel >= 25 },
  { id: 'regular', icon: '📅', title: 'Regular', description: 'Finish 3 Dailies', check: c => c.stats.dailiesFinished >= 3 },
  { id: 'flawless', icon: '🌟', title: 'Flawless Victory', description: 'Finish a Daily with 10 perfect levels', check: c => c.stats.flawlessDailies >= 1 },
  { id: 'scout', icon: '🧠', title: 'Challenger Scout', description: 'Name the top builder 10 times', check: c => c.stats.championBonusCorrect >= 10 },
  { id: 'collector', icon: '📖', title: 'Collector', description: 'Collect 25 items in the Codex', check: c => c.codexCount >= 25 },
  { id: 'completionist', icon: '🏆', title: 'Completionist', description: 'Collect every item in the Codex', check: c => c.codexTotal > 0 && c.codexCount >= c.codexTotal },
];

/** Achievements whose condition is met but that aren't unlocked yet */
export function findNewAchievements(ctx: AchievementContext, unlocked: Iterable<string>): Achievement[] {
  const have = new Set(unlocked);
  return ACHIEVEMENTS.filter(a => !have.has(a.id) && a.check(ctx));
}

// ============================================================================
// Daily stats
// ============================================================================

export interface DailyStats {
  played: number;
  currentStreak: number;
  bestStreak: number;
  averageScore: number;
  bestScore: number;
  /** Index = levels cleared (0-10), value = number of Dailies */
  histogram: number[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(dateKey: string): number {
  return Math.round(Date.parse(`${dateKey}T00:00:00Z`) / DAY_MS);
}

/**
 * Wordle-style stats from every finished Daily.
 * The current streak stays alive until a full day is missed.
 */
export function computeDailyStats(results: Record<string, DailyResult>, todayKey: string): DailyStats {
  const finished = Object.entries(results).filter(([, r]) => r.finished);
  const histogram = Array(DAILY_LEVELS + 1).fill(0);

  for (const [, result] of finished) {
    const cleared = result.outcomes.filter(o => o !== 'failed').length;
    histogram[Math.min(cleared, DAILY_LEVELS)]++;
  }

  const days = new Set(finished.map(([date]) => dayNumber(date)));
  const sortedDays = [...days].sort((a, b) => a - b);

  let bestStreak = 0;
  let run = 0;
  sortedDays.forEach((day, i) => {
    run = i > 0 && sortedDays[i - 1] === day - 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
  });

  const today = dayNumber(todayKey);
  let cursor = days.has(today) ? today : today - 1;
  let currentStreak = 0;
  while (days.has(cursor)) {
    currentStreak++;
    cursor--;
  }

  const scores = finished.map(([, r]) => r.score);
  return {
    played: finished.length,
    currentStreak,
    bestStreak,
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    bestScore: scores.length ? Math.max(...scores) : 0,
    histogram,
  };
}

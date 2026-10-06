/**
 * Scoring rules.
 *
 * Points per level = (100 + 10 per second left + 50 per correct gold answer)
 *                    x 1.5 for a correct Buy All
 *                    x streak multiplier (+0.1 per consecutive perfect level, max x2)
 *                    - 25 per hint used (never below 0)
 * Timed-out or revealed levels score 0 and reset the streak.
 * Hints don't break a perfect level: only mistakes do.
 */

import type { LevelOutcome } from '../types/items';
import { LEVEL_SECONDS } from './difficultySettings';
import { CHAMPION_BONUS_POINTS } from './championQuiz';

export const BASE_POINTS = 100;
export const POINTS_PER_SECOND = 10;
export const POINTS_PER_GOLD_ANSWER = 50;
export const BUY_ALL_MULTIPLIER = 1.5;
export const MAX_STREAK_MULTIPLIER = 2;
export const HINT_COST = 25;

/** Most gold-check answers in one level: 3 components + the item's total cost (level 10+) */
const MAX_GOLD_ANSWERS = 4;

/**
 * The most points a single level can possibly give:
 * (100 + 10 x 30s + 50 x 4 gold answers) x 1.5 Buy All x 2 max streak + 50 champion bonus = 1,850.
 *
 * The leaderboard rejects scores above level x this (supabase/schema.sql, constraint score_plausible).
 * If scoring changes, update that constraint too: a test pins this value.
 */
export const MAX_POINTS_PER_LEVEL =
  (BASE_POINTS + POINTS_PER_SECOND * LEVEL_SECONDS + POINTS_PER_GOLD_ANSWER * MAX_GOLD_ANSWERS)
    * BUY_ALL_MULTIPLIER * MAX_STREAK_MULTIPLIER
  + CHAMPION_BONUS_POINTS;

export interface LevelScoreInput {
  outcome: LevelOutcome;
  secondsLeft: number;
  goldAnswersCorrect: number;
  buyAll: boolean;
  /** Consecutive perfect levels BEFORE this one */
  previousStreak: number;
  /** Stat hints revealed this level */
  hintsUsed?: number;
}

export interface LevelScore {
  base: number;
  timeBonus: number;
  goldBonus: number;
  buyAllMultiplier: number;
  streakMultiplier: number;
  /** Points lost to hints */
  hintPenalty: number;
  total: number;
  /** Streak after this level */
  streak: number;
}

/** Streak multiplier for a given streak length (1 perfect level = x1.0) */
export function getStreakMultiplier(streak: number): number {
  if (streak <= 1) return 1;
  return Math.min(MAX_STREAK_MULTIPLIER, Math.round((1 + 0.1 * (streak - 1)) * 10) / 10);
}

export function computeLevelScore(input: LevelScoreInput): LevelScore {
  if (input.outcome === 'failed') {
    return {
      base: 0,
      timeBonus: 0,
      goldBonus: 0,
      buyAllMultiplier: 1,
      streakMultiplier: 1,
      hintPenalty: 0,
      total: 0,
      streak: 0,
    };
  }

  const streak = input.outcome === 'perfect' ? input.previousStreak + 1 : 0;
  const streakMultiplier = input.outcome === 'perfect' ? getStreakMultiplier(streak) : 1;
  const buyAllMultiplier = input.buyAll ? BUY_ALL_MULTIPLIER : 1;
  const timeBonus = Math.max(0, input.secondsLeft) * POINTS_PER_SECOND;
  const goldBonus = input.goldAnswersCorrect * POINTS_PER_GOLD_ANSWER;
  const raw = Math.round((BASE_POINTS + timeBonus + goldBonus) * buyAllMultiplier * streakMultiplier);
  const hintPenalty = Math.min(raw, (input.hintsUsed ?? 0) * HINT_COST);

  return {
    base: BASE_POINTS,
    timeBonus,
    goldBonus,
    buyAllMultiplier,
    streakMultiplier,
    hintPenalty,
    total: raw - hintPenalty,
    streak,
  };
}

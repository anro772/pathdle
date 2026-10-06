import type { DifficultySettings, GameMode } from '../types/items';

/** Number of levels in a Daily run */
export const DAILY_LEVELS = 10;

/** Number of epic (easier) levels at the start of Endless and Daily runs */
export const EPIC_LEVELS = 3;

/** Seconds per level in Endless and Daily (components are hidden, so players need time to think) */
export const LEVEL_SECONDS = 30;

/** Seconds added for each correctly bought component (capped at LEVEL_SECONDS) */
export const CORRECT_ANSWER_BONUS_SECONDS = 5;

/**
 * Returns difficulty configuration for a given level.
 *
 * Difficulty ramp (Endless and Daily):
 * - Level 1-3: Epic items (Kindlegem, Serrated Dirk...)
 * - Level 4+: Legendary items
 * - Every level: 30s
 * - Level 6-7: 1 gold check, Level 8-9: 2, Level 10+: 3 + the final item's total cost
 *
 * Practice has no timer and no gold checks.
 *
 * @param level - Current game level (1-based)
 * @param mode - Current game mode
 *
 * @example
 * getDifficultySettings(1);
 * // { pool: 'epic', timerDuration: 30, goldChecks: 0, finalGoldCheck: false }
 */
export function getDifficultySettings(level: number, mode: GameMode = 'endless'): DifficultySettings {
  const pool = level <= EPIC_LEVELS ? 'epic' : 'legendary';

  if (mode === 'practice') {
    return { pool, timerDuration: 0, goldChecks: 0, finalGoldCheck: false };
  }

  let goldChecks = 0;
  if (level >= 10) goldChecks = 3;
  else if (level >= 8) goldChecks = 2;
  else if (level >= 6) goldChecks = 1;

  return {
    pool,
    timerDuration: LEVEL_SECONDS,
    goldChecks,
    finalGoldCheck: level >= 10,
  };
}

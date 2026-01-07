import type { DifficultySettings } from '../types/items';

/**
 * Returns difficulty configuration for a given game level.
 *
 * Difficulty gates:
 * - Level 1-5: No gold input required
 * - Level 6-10: Component gold input required
 * - Level 11+: Component gold AND final gold input required
 *
 * @param level - Current game level (1-based)
 * @returns Difficulty settings for the level
 *
 * @example
 * const settings = getDifficultySettings(1);
 * // { timerDuration: 10, requiresComponentGold: false, requiresFinalGold: false, shopGridSize: 16 }
 *
 * const settings = getDifficultySettings(6);
 * // { timerDuration: 10, requiresComponentGold: true, requiresFinalGold: false, shopGridSize: 16 }
 */
export function getDifficultySettings(level: number): DifficultySettings {
  return {
    timerDuration: 10,
    requiresComponentGold: level >= 6,
    requiresFinalGold: level >= 11,
    shopGridSize: 16,
  };
}

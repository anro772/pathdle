/**
 * Shop Grid Generator - Creates item grids for the ItemShopGrid component.
 *
 * A shop grid contains:
 * - The correct items needed for the focused component (e.g., 2x Long Sword)
 * - Distractor items from the basic components pool
 *
 * Grids are sorted by gold cost (like the in-game shop) so the hotkey layout
 * reads left-to-right from cheap to expensive. Correct items appear once per
 * distinct ID; the player can click an item multiple times for duplicates.
 */

import type { ComponentNode, ItemData } from '../types/items';
import { collectAllBaseComponents, getRequiredItems } from './recipeEngine';
import { shuffle, type Rng } from './seededRandom';

/** Default grid size (4x4) */
export const SHOP_GRID_SIZE = 16;

/**
 * Builds a grid from the required items plus random distractors.
 *
 * @param requiredItems - Item IDs that must be in the grid (duplicates are collapsed)
 * @param allItems - Complete item database (for gold-cost sorting)
 * @param basicComponents - Pool of atomic items used as distractors
 * @param gridSize - Total number of tiles
 * @param rng - Random source (seeded for the Daily)
 * @returns Item IDs sorted by gold cost
 */
function buildGrid(
  requiredItems: string[],
  allItems: Record<string, ItemData>,
  basicComponents: Record<string, ItemData>,
  gridSize: number,
  rng: Rng
): string[] {
  const required = [...new Set(requiredItems)];

  if (required.length > gridSize) {
    throw new Error(
      `Cannot generate shop grid: gridSize (${gridSize}) is smaller than required items count (${required.length})`
    );
  }

  const distractorPool = Object.keys(basicComponents)
    .filter(id => !required.includes(id))
    .sort();
  const distractors = shuffle(distractorPool, rng).slice(0, gridSize - required.length);

  return [...required, ...distractors].sort((a, b) => {
    const goldDiff = (allItems[a]?.gold.total ?? 0) - (allItems[b]?.gold.total ?? 0);
    return goldDiff !== 0 ? goldDiff : (allItems[a]?.name ?? a).localeCompare(allItems[b]?.name ?? b);
  });
}

/**
 * Generates the shop grid for a focused component.
 *
 * @param focusedNode - The component node currently being built
 * @param allItems - Complete item database
 * @param basicComponents - Pool of atomic items with no recipe
 * @param gridSize - Total number of items in the grid (default: 16 for 4x4 grid)
 * @param rng - Random source (defaults to Math.random)
 *
 * @example
 * ```typescript
 * // Building Serrated Dirk (requires 2x Long Sword)
 * const grid = generateShopGrid(dirkNode, allItems, basicComponents);
 * // Returns 16 IDs sorted by cost, including "1036" (Long Sword) once
 * ```
 */
export function generateShopGrid(
  focusedNode: ComponentNode,
  allItems: Record<string, ItemData>,
  basicComponents: Record<string, ItemData>,
  gridSize: number = SHOP_GRID_SIZE,
  rng: Rng = Math.random
): string[] {
  if (Object.keys(basicComponents).length === 0) {
    throw new Error('Cannot generate shop grid: basicComponents pool is empty');
  }
  return buildGrid(getRequiredItems(focusedNode), allItems, basicComponents, gridSize, rng);
}

/**
 * Generates the shop grid for "Buy All" mode: every base component of the
 * whole target item, plus distractors.
 */
export function generateBuyAllGrid(
  targetItem: ComponentNode,
  allItems: Record<string, ItemData>,
  basicComponents: Record<string, ItemData>,
  gridSize: number = SHOP_GRID_SIZE,
  rng: Rng = Math.random
): string[] {
  return buildGrid(collectAllBaseComponents(targetItem), allItems, basicComponents, gridSize, rng);
}

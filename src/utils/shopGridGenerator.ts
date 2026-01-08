/**
 * Shop Grid Generator - Creates randomized item grids for the ItemShopGrid component.
 *
 * This utility generates a 16-item shop grid containing:
 * - The correct items needed for the focused component (e.g., 2x Long Sword)
 * - Distractor items from the basic components pool (AD/AP/Tank/Support items)
 * - Randomized positions to prevent pattern recognition
 */

import type { ComponentNode, ItemData } from '../types/items';

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 *
 * This is a standard, unbiased shuffle algorithm that ensures each permutation
 * has equal probability. Time complexity: O(n)
 *
 * @param array - The array to shuffle (modified in place)
 * @returns The shuffled array (same reference as input)
 *
 * @example
 * ```typescript
 * const arr = [1, 2, 3, 4, 5];
 * shuffleArray(arr);
 * console.log(arr); // e.g., [3, 1, 5, 2, 4]
 * ```
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generates a randomized shop grid for the ItemShopGrid component.
 *
 * The grid contains:
 * 1. All required items from the focused component's children (correct answers)
 * 2. Random distractor items from the basic components pool
 * 3. All items shuffled into random positions
 *
 * Algorithm:
 * 1. Extract required item IDs from focusedNode.children
 * 2. Calculate how many distractors are needed (gridSize - requiredItems.length)
 * 3. Select random distractors from basicComponents, avoiding duplicates of required items
 * 4. Combine required + distractors and shuffle using Fisher-Yates
 *
 * @param focusedNode - The component node currently being built (from useGameStore.targetItem)
 * @param basicComponents - Pool of atomic items with no recipe (from itemFilters.filterItems)
 * @param gridSize - Total number of items in the grid (default: 16 for 4x4 grid)
 * @returns Array of item IDs in randomized order, ready for grid rendering
 *
 * @throws Error if gridSize is smaller than the number of required items
 * @throws Error if basicComponents pool is empty (cannot generate grid)
 *
 * @example
 * ```typescript
 * // Building Serrated Dirk (requires 2x Long Sword)
 * const grid = generateShopGrid(focusedNode, basicComponents, 16);
 * // Returns: ["1036", "1029", "1036", "1052", "1027", ...] (16 items shuffled)
 * //           ^^^^^         ^^^^^  <-- Both Long Swords are in there somewhere
 * ```
 *
 * @example
 * ```typescript
 * // Atomic item (no children) - just returns random grid
 * const atomicNode = { itemId: "1036", itemName: "Long Sword", children: [], goldCost: 0, totalCost: 350 };
 * const grid = generateShopGrid(atomicNode, basicComponents, 16);
 * // Returns: 16 random basic components
 * ```
 */
export function generateShopGrid(
  focusedNode: ComponentNode,
  basicComponents: Record<string, ItemData>,
  gridSize: number = 16
): string[] {
  // ============================================================================
  // Edge Case: Empty basic components pool
  // ============================================================================

  const basicComponentIds = Object.keys(basicComponents);

  if (basicComponentIds.length === 0) {
    throw new Error('Cannot generate shop grid: basicComponents pool is empty');
  }

  // ============================================================================
  // Step 1: Extract required items from focused node's children
  // ============================================================================

  const requiredItems: string[] = focusedNode.children.map(child => child.itemId);

  // ============================================================================
  // Edge Case: Grid size too small for required items
  // ============================================================================

  if (requiredItems.length > gridSize) {
    throw new Error(
      `Cannot generate shop grid: gridSize (${gridSize}) is smaller than required items count (${requiredItems.length})`
    );
  }

  // ============================================================================
  // Edge Case: Focused node is atomic (no children) - player must find the item itself
  // ============================================================================

  if (requiredItems.length === 0) {
    // The correct answer is the item itself - player must find it in the shop
    const targetItem = focusedNode.itemId;
    const distractorsNeeded = gridSize - 1;

    // Get distractors that are NOT the target item
    const availableDistractors = basicComponentIds.filter(id => id !== targetItem);
    const shuffledDistractors = shuffleArray([...availableDistractors]);

    const distractors: string[] = [];
    for (let i = 0; i < distractorsNeeded; i++) {
      distractors.push(shuffledDistractors[i % shuffledDistractors.length]);
    }

    // Combine target item + distractors and shuffle
    return shuffleArray([targetItem, ...distractors]);
  }

  // ============================================================================
  // Step 2: Calculate how many distractors we need
  // ============================================================================

  const distractorsNeeded = gridSize - requiredItems.length;

  // ============================================================================
  // Step 3: Select random distractor items
  // ============================================================================

  // Build frequency map of required items to avoid picking them as distractors
  const requiredFrequency: Record<string, number> = {};
  for (const itemId of requiredItems) {
    requiredFrequency[itemId] = (requiredFrequency[itemId] || 0) + 1;
  }

  // Filter out items that are already required (or reduce their availability)
  const availableDistractors: string[] = [];
  for (const itemId of basicComponentIds) {
    const timesRequired = requiredFrequency[itemId] || 0;

    // If this item is required 2x, we don't want it as a distractor at all
    // If it's required 1x, we can still use it but want to avoid confusion
    // So we just exclude any item that appears in requiredItems
    if (timesRequired === 0) {
      availableDistractors.push(itemId);
    }
  }

  // ============================================================================
  // Edge Case: Not enough distractors available
  // ============================================================================

  const distractors: string[] = [];

  if (availableDistractors.length === 0) {
    // No distractors available - just use required items to fill the grid
    // This should never happen in practice, but we handle it gracefully
    for (let i = 0; i < distractorsNeeded; i++) {
      const randomIndex = Math.floor(Math.random() * basicComponentIds.length);
      distractors.push(basicComponentIds[randomIndex]);
    }
  } else {
    // Shuffle available distractors and pick unique items (no repeats)
    const shuffledDistractors = shuffleArray([...availableDistractors]);

    // Pick unique distractors; if we need more than available, cycle through again
    for (let i = 0; i < distractorsNeeded; i++) {
      // Use modulo to cycle if we need more items than available
      distractors.push(shuffledDistractors[i % shuffledDistractors.length]);
    }

    // If we have enough unique distractors, ensure they're all different
    // by only using shuffledDistractors.slice(0, distractorsNeeded) when possible
    if (availableDistractors.length >= distractorsNeeded) {
      distractors.length = 0; // Clear array
      for (let i = 0; i < distractorsNeeded; i++) {
        distractors.push(shuffledDistractors[i]);
      }
    }
  }

  // ============================================================================
  // Step 4: Combine required items + distractors and shuffle
  // ============================================================================

  const gridItems = [...requiredItems, ...distractors];

  return shuffleArray(gridItems);
}

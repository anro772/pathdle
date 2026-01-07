/**
 * Item filtering utilities for the Buildle game.
 * Separates valid Legendary items from basic components in DataDragon data.
 *
 * Filtering ensures only valid Summoner's Rift items are used, excluding:
 * - Ornn masterwork items
 * - TFT/Arena items (ID >= 7000)
 * - Mythic items from old seasons
 * - Consumables/trinkets (no build path)
 */

import type { ItemData } from '../types/items';

/**
 * Determines if an item is a valid Legendary item for the target pool.
 *
 * Valid Legendary items are the goal items that players must build.
 * They must:
 * - Be available on Summoner's Rift (map 11)
 * - Be purchasable from the shop
 * - Not be an Ornn masterwork item
 * - Not be a TFT/Arena item (ID < 7000)
 * - Have a build path (components to combine)
 *
 * @param item - The item data from DataDragon
 * @param id - The item's string ID
 * @returns True if the item is a valid Legendary for the game
 */
export function isValidLegendary(item: ItemData, id: string): boolean {
  return (
    item.maps['11'] === true &&              // Summoner's Rift only
    item.gold.purchasable === true &&        // Can be bought
    !item.description?.includes('Ornn') &&   // Exclude Ornn items
    parseInt(id) < 7000 &&                   // Exclude Arena/TFT
    item.from && item.from.length > 0        // Has components (Legendary)
  );
}

/**
 * Determines if an item is a basic component (atomic item).
 *
 * Basic components are the building blocks shown in the shop grid.
 * They are "atomic" items with no further components.
 * They must:
 * - Be available on Summoner's Rift (map 11)
 * - Be purchasable from the shop
 * - Not be an Ornn masterwork item
 * - Not be a TFT/Arena item (ID < 7000)
 * - Have NO build path (atomic/basic items only)
 *
 * @param item - The item data from DataDragon
 * @param id - The item's string ID
 * @returns True if the item is a basic component for the shop pool
 */
export function isBasicComponent(item: ItemData, id: string): boolean {
  return (
    item.maps['11'] === true &&
    item.gold.purchasable === true &&
    !item.description?.includes('Ornn') &&
    parseInt(id) < 7000 &&
    (!item.from || item.from.length === 0)   // NO build path (atomic)
  );
}

/**
 * Filters all items into separate pools for game use.
 *
 * Separates the complete DataDragon item dataset into:
 * - Legendaries: Items that can be selected as level goals
 * - Basic Components: Atomic items that appear in the shop grid
 *
 * Note: During implementation, manually verify all filtered items
 * to ensure no edge cases slip through.
 *
 * @param allItems - Complete item dataset from DataDragon
 * @returns Object containing both filtered item pools
 */
export function filterItems(allItems: Record<string, ItemData>): {
  legendaries: Record<string, ItemData>;
  basicComponents: Record<string, ItemData>;
} {
  const legendaries: Record<string, ItemData> = {};
  const basicComponents: Record<string, ItemData> = {};

  for (const [id, item] of Object.entries(allItems)) {
    if (isValidLegendary(item, id)) {
      legendaries[id] = item;
    } else if (isBasicComponent(item, id)) {
      basicComponents[id] = item;
    }
  }

  return { legendaries, basicComponents };
}

/**
 * Selects a random legendary item ID from the filtered pool.
 *
 * Used by the game store to pick a new goal item for each level.
 *
 * @param legendaries - Filtered pool of valid legendary items
 * @returns A random item ID from the legendaries pool
 * @throws Error if the legendaries pool is empty
 */
export function getRandomLegendaryId(legendaries: Record<string, ItemData>): string {
  const legendaryIds = Object.keys(legendaries);

  if (legendaryIds.length === 0) {
    throw new Error('No legendary items available in the pool');
  }

  const randomIndex = Math.floor(Math.random() * legendaryIds.length);
  return legendaryIds[randomIndex];
}

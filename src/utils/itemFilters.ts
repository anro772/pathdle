/**
 * Item filtering utilities for the Pathdle game.
 * Separates valid Legendary items from basic components in DataDragon data.
 *
 * Filtering ensures only valid Summoner's Rift items are used, excluding:
 * - Ornn masterwork items
 * - TFT/Arena items (ID >= 7000)
 * - Mythic items from old seasons
 * - Consumables/trinkets (no build path)
 * - Champion-specific items (Kalista's Spear)
 * - Support starter items and their upgrades
 * - Jungle pet items
 * - Doran's starter items
 */

import type { ItemData } from '../types/items';

// ============================================================================
// Excluded Item IDs
// ============================================================================

/**
 * Items to exclude from basic components pool (shop distractors).
 * These are special items that shouldn't appear as random shop options.
 */
const EXCLUDED_BASIC_ITEMS = new Set([
  // Champion-specific items
  '3599', // Kalista's Black Spear
  '3600', // Kalista's Black Spear (duplicate)
  '3400', // Your Cut (Pyke-specific)

  // Consumables/Potions
  '2003', // Health Potion
  '2031', // Refillable Potion
  '2033', // Corrupting Potion
  '2055', // Control Ward
  '2052', // Poro-Snax
  '2403', // Minion Dematerializer

  // Elixirs
  '2138', // Elixir of Iron
  '2139', // Elixir of Sorcery
  '2140', // Elixir of Wrath
  '2141', // Cappa Juice

  // Trinkets/Wards (0g items)
  '3340', // Stealth Ward
  '3330', // Scarecrow Effigy
  '3363', // Farsight Alteration
  '3364', // Oracle Lens

  // Special items
  '1104', // Eye of the Herald

  // Jungle pet items
  '1101', // Scorchclaw Pup
  '1102', // Gustwalker Hatchling
  '1103', // Mosstomper Seedling

  // Doran's starter items (don't build into anything)
  '1054', // Doran's Shield
  '1055', // Doran's Blade
  '1056', // Doran's Ring

  // Support starter items (Tier 1)
  '3850', // Spellthief's Edge
  '3854', // Steel Shoulderguards
  '3858', // Relic Shield
  '3862', // Spectral Sickle

  // Support items (Tier 2 - quest upgrades)
  '3851', // Frostfang
  '3855', // Runesteel Spaulders
  '3859', // Targon's Buckler
  '3863', // Harrowing Crescent

  // Support items (Tier 3 - final upgrades)
  '3853', // Shard of True Ice
  '3857', // Pauldrons of Whiterock
  '3860', // Bulwark of the Mountain
  '3864', // Black Mist Scythe

  // World Atlas support line
  '3865', // World Atlas
  '3866', // Runic Compass
  '3867', // Bounty of Worlds
]);

/**
 * Items to exclude from legendary pool (target items to build).
 * These are support items that auto-upgrade and shouldn't be game targets.
 */
const EXCLUDED_LEGENDARY_ITEMS = new Set([
  // Support items (Tier 2 - quest upgrades) - have "from" but auto-upgrade
  '3851', // Frostfang
  '3855', // Runesteel Spaulders
  '3859', // Targon's Buckler
  '3863', // Harrowing Crescent

  // Support items (Tier 3 - final upgrades)
  '3853', // Shard of True Ice
  '3857', // Pauldrons of Whiterock
  '3860', // Bulwark of the Mountain
  '3864', // Black Mist Scythe

  // World Atlas support line
  '3866', // Runic Compass
  '3867', // Bounty of Worlds
]);

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
 * - Not be in the excluded legendaries list (support items, etc.)
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
    !!(item.from && item.from.length > 0) && // Has components (Legendary)
    !EXCLUDED_LEGENDARY_ITEMS.has(id)        // Not in exclusion list
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
 * - Not be in the excluded basic items list (consumables, starter items, etc.)
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
    (!item.from || item.from.length === 0) && // NO build path (atomic)
    !EXCLUDED_BASIC_ITEMS.has(id)             // Not in exclusion list
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

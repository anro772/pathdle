/**
 * Item filtering utilities for the Pathdle game.
 * Splits DataDragon data into build targets (epics + legendaries) and basic components.
 *
 * Filtering ensures only valid Summoner's Rift items are used, excluding:
 * - Ornn masterwork items
 * - TFT/Arena items (ID >= 7000)
 * - Consumables/trinkets/starter items (they don't build into anything)
 * - Champion-specific items (Kalista's Spear)
 * - Support quest items and their upgrades
 *
 * Selection from the pools is always uniform: popularity data never changes
 * which items can appear.
 */

import type { ItemData } from '../types/items';
import type { Rng } from './seededRandom';

// ============================================================================
// Excluded Item IDs
// ============================================================================

/**
 * Items to exclude from every pool.
 * These are special items that shouldn't appear as targets or shop options.
 */
const EXCLUDED_ITEMS = new Set([
  // Champion-specific items
  '3599', // Kalista's Black Spear
  '3600', // Kalista's Black Spear (duplicate)
  '3400', // Your Cut (Pyke-specific)

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

// ============================================================================
// Predicates
// ============================================================================

function isOnRift(item: ItemData, id: string): boolean {
  return (
    item.maps['11'] === true &&              // Summoner's Rift only
    item.gold.purchasable === true &&        // Can be bought
    !item.description?.includes('Ornn') &&   // Exclude Ornn items
    parseInt(id) < 7000 &&                   // Exclude Arena/TFT
    !EXCLUDED_ITEMS.has(id)
  );
}

/**
 * Determines if an item is a valid build target (epic or legendary).
 * It must have a recipe, and none of its components may be excluded
 * (this drops the support quest upgrades like Bloodsong).
 */
export function isBuildTarget(item: ItemData, id: string): boolean {
  return (
    isOnRift(item, id) &&
    !!(item.from && item.from.length > 0) &&
    item.from.every(componentId => !EXCLUDED_ITEMS.has(componentId))
  );
}

/** Tier-3 boots (Swiftmarch, Gunmetal Greaves, ...) upgrade from a single pair of boots. */
function isBootUpgrade(item: ItemData): boolean {
  return item.tags.includes('Boots') && (item.from?.length ?? 0) === 1;
}

/**
 * Epic items are intermediate components (Kindlegem, Serrated Dirk, Tier-2 boots...).
 * Tier-3 boot upgrades count as epics too, since they are small one-step recipes.
 */
export function isEpic(item: ItemData, id: string): boolean {
  return isBuildTarget(item, id) && ((item.into?.length ?? 0) > 0 || isBootUpgrade(item));
}

/** Legendary items are finished items that don't build into anything. */
export function isValidLegendary(item: ItemData, id: string): boolean {
  return isBuildTarget(item, id) && !isEpic(item, id);
}

/**
 * Determines if an item is a basic component (atomic item) for the shop pool.
 * It must have no recipe and must build into something, which drops
 * consumables, trinkets and starter items automatically.
 */
export function isBasicComponent(item: ItemData, id: string): boolean {
  return (
    isOnRift(item, id) &&
    (!item.from || item.from.length === 0) &&
    (item.into?.length ?? 0) > 0 &&
    !item.tags.includes('Consumable') &&     // Refillable Potion "builds" into Corrupting Potion
    !item.tags.includes('Trinket')
  );
}

// ============================================================================
// Pools
// ============================================================================

export interface ItemPools {
  /** Finished items */
  legendaries: Record<string, ItemData>;
  /** Intermediate components */
  epics: Record<string, ItemData>;
  /** Atomic items shown in the shop */
  basicComponents: Record<string, ItemData>;
}

/**
 * Filters all items into separate pools for game use.
 *
 * @param allItems - Complete item dataset from DataDragon
 * @returns Object containing the filtered item pools
 */
export function filterItems(allItems: Record<string, ItemData>): ItemPools {
  const legendaries: Record<string, ItemData> = {};
  const epics: Record<string, ItemData> = {};
  const basicComponents: Record<string, ItemData> = {};

  for (const [id, item] of Object.entries(allItems)) {
    if (isEpic(item, id)) {
      epics[id] = item;
    } else if (isValidLegendary(item, id)) {
      legendaries[id] = item;
    } else if (isBasicComponent(item, id)) {
      basicComponents[id] = item;
    }
  }

  return { legendaries, epics, basicComponents };
}

/**
 * Selects a random item ID from a pool, avoiding recently used IDs when possible.
 *
 * @param pool - Pool of items to choose from
 * @param exclude - IDs to avoid (ignored if it would empty the pool)
 * @param rng - Random source (defaults to Math.random)
 * @throws Error if the pool is empty
 */
export function getRandomItemId(
  pool: Record<string, ItemData>,
  exclude: Iterable<string> = [],
  rng: Rng = Math.random
): string {
  const ids = Object.keys(pool).sort();

  if (ids.length === 0) {
    throw new Error('No items available in the pool');
  }

  const excluded = new Set(exclude);
  const candidates = ids.filter(id => !excluded.has(id));
  const source = candidates.length > 0 ? candidates : ids;

  return source[Math.floor(rng() * source.length)];
}

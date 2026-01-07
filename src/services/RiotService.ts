/**
 * RiotService.ts
 *
 * Service layer for loading League of Legends item data.
 * Uses bundled static data to avoid rate limits and provide instant loads.
 *
 * The items data is fetched once during build time and bundled as a static asset.
 * This eliminates API rate limits and provides instant, offline-capable loading.
 */

import type { ItemsResponse } from '../types/items';

// ============================================================================
// Constants
// ============================================================================

/** Path to bundled items data (fetched at build time) */
const BUNDLED_ITEMS_PATH = '/items-data.json';

/** DataDragon CDN base URL for item images */
const DDRAGON_CDN_URL = 'https://ddragon.leagueoflegends.com/cdn';

// ============================================================================
// Public API
// ============================================================================

/**
 * Loads items data from the bundled static asset.
 *
 * This function loads pre-fetched items data that was bundled at build time.
 * No API calls are made at runtime, ensuring zero rate limit issues.
 *
 * @returns Promise resolving to items response with version and data
 * @throws Error if the bundled data cannot be loaded
 *
 * @example
 * const { version, data } = await getItems();
 * console.log(`Loaded ${Object.keys(data).length} items for version ${version}`);
 */
export async function getItems(): Promise<ItemsResponse> {
  try {
    const response = await fetch(BUNDLED_ITEMS_PATH);

    if (!response.ok) {
      throw new Error(`Failed to load bundled items data: ${response.statusText}`);
    }

    const bundledData = await response.json();

    return {
      version: bundledData.version,
      data: bundledData.data
    };
  } catch (error) {
    console.error('Error loading bundled items:', error);
    throw new Error('Failed to load game data. Please refresh the page.');
  }
}

/**
 * Generates the full CDN URL for an item's image.
 *
 * Uses the DataDragon CDN to construct the image URL for a specific item.
 * Item images are served from Riot's CDN and are globally cached.
 *
 * @param itemId - The item ID (e.g., "1001")
 * @param version - DataDragon version string (e.g., "14.1.1")
 * @returns Full URL to the item's image
 *
 * @example
 * const url = getItemImageUrl("1001", "14.1.1");
 * // Returns: "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/item/1001.png"
 */
export function getItemImageUrl(itemId: string, version: string): string {
  return `${DDRAGON_CDN_URL}/${version}/img/item/${itemId}.png`;
}

/**
 * Gets metadata about the bundled items data.
 *
 * Useful for debugging and displaying version information to users.
 *
 * @returns Promise resolving to metadata object
 *
 * @example
 * const meta = await getBundledMetadata();
 * console.log(`Data version: ${meta.version}, fetched at: ${meta.fetchedAt}`);
 */
export async function getBundledMetadata(): Promise<{
  version: string;
  fetchedAt: string;
  itemCount: number;
}> {
  const response = await fetch(BUNDLED_ITEMS_PATH);
  const bundledData = await response.json();

  return {
    version: bundledData.version,
    fetchedAt: bundledData.fetchedAt,
    itemCount: Object.keys(bundledData.data).length
  };
}

/**
 * RiotService.ts
 *
 * Service layer for fetching and caching League of Legends item data
 * from Riot's DataDragon CDN. Implements smart caching to minimize
 * network requests and provide instant loads on subsequent visits.
 */

import type { ItemsResponse } from '../types/items';

// ============================================================================
// Constants
// ============================================================================

/** DataDragon API base URL */
const DDRAGON_BASE_URL = 'https://ddragon.leagueoflegends.com';

/** localStorage key for cached DataDragon version */
const CACHE_VERSION_KEY = 'buildle-version';

/**
 * Generates the localStorage key for items data of a specific version.
 * @param version - DataDragon version string
 */
function getItemsCacheKey(version: string): string {
  return `buildle-items-${version}`;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetches the latest DataDragon version string from the versions API.
 *
 * The versions endpoint returns an array of version strings, with the
 * most recent version at index 0.
 *
 * @returns Promise resolving to the latest version string (e.g., "14.1.1")
 * @throws Error if the fetch fails or response is invalid
 *
 * @example
 * const version = await getLatestVersion();
 * console.log(version); // "14.1.1"
 */
export async function getLatestVersion(): Promise<string> {
  const response = await fetch(`${DDRAGON_BASE_URL}/api/versions.json`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch DataDragon versions: ${response.status} ${response.statusText}`
    );
  }

  const versions: string[] = await response.json();

  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error('Invalid versions response: expected non-empty array');
  }

  return versions[0];
}

/**
 * Fetches all item data from DataDragon with smart caching.
 *
 * Caching strategy:
 * 1. Check localStorage for cached version and item data
 * 2. Fetch latest version from DataDragon
 * 3. If cached version matches latest, return cached data (instant load)
 * 4. If versions differ, fetch new item data and update cache
 *
 * @returns Promise resolving to the ItemsResponse containing all items
 * @throws Error if fetch fails and no cached data is available
 *
 * @example
 * const items = await getItems();
 * console.log(Object.keys(items.data).length); // Number of items
 */
export async function getItems(): Promise<ItemsResponse> {
  try {
    // Step 1: Get cached version from localStorage
    const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);

    // Step 2: Fetch latest version from DataDragon
    const latestVersion = await getLatestVersion();

    // Step 3: Check if we have valid cached data for this version
    if (cachedVersion === latestVersion) {
      const cachedItems = localStorage.getItem(getItemsCacheKey(latestVersion));

      if (cachedItems) {
        try {
          const parsed: ItemsResponse = JSON.parse(cachedItems);
          // Validate the cached data has expected structure
          if (parsed.version && parsed.data) {
            return parsed;
          }
        } catch {
          // Cache is corrupted, will fetch fresh data below
          console.error('Cached items data is corrupted, fetching fresh data');
        }
      }
    }

    // Step 4: Fetch fresh item data
    const itemsResponse = await fetchItemsFromApi(latestVersion);

    // Step 5: Update cache
    try {
      // Clean up old version caches before storing new one
      cleanupOldCaches(latestVersion);

      localStorage.setItem(CACHE_VERSION_KEY, latestVersion);
      localStorage.setItem(
        getItemsCacheKey(latestVersion),
        JSON.stringify(itemsResponse)
      );
    } catch (storageError) {
      // localStorage might be full or disabled - log but don't fail
      console.error('Failed to cache items data:', storageError);
    }

    return itemsResponse;
  } catch (error) {
    // If network fails, try to return any cached data as fallback
    const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    if (cachedVersion) {
      const cachedItems = localStorage.getItem(getItemsCacheKey(cachedVersion));
      if (cachedItems) {
        try {
          const parsed: ItemsResponse = JSON.parse(cachedItems);
          if (parsed.version && parsed.data) {
            console.error(
              'Network error, using cached data from version:',
              cachedVersion
            );
            return parsed;
          }
        } catch {
          // Cache is also corrupted
        }
      }
    }

    // No fallback available, rethrow the original error
    throw error;
  }
}

/**
 * Constructs the DataDragon CDN URL for an item's image.
 *
 * @param itemId - The item ID (e.g., "3031" for Infinity Edge)
 * @param version - DataDragon version string (e.g., "14.1.1")
 * @returns The full URL to the item's PNG image
 *
 * @example
 * const url = getItemImageUrl("3031", "14.1.1");
 * // Returns: "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/item/3031.png"
 */
export function getItemImageUrl(itemId: string, version: string): string {
  return `${DDRAGON_BASE_URL}/cdn/${version}/img/item/${itemId}.png`;
}

/**
 * Clears all Buildle-related data from localStorage.
 * Useful for debugging, testing, or forcing a fresh data fetch.
 *
 * @example
 * clearCache();
 * const items = await getItems(); // Will fetch fresh data
 */
export function clearCache(): void {
  // Get all localStorage keys
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key === CACHE_VERSION_KEY || key.startsWith('buildle-items-'))) {
      keysToRemove.push(key);
    }
  }

  // Remove all matching keys
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Fetches item data directly from the DataDragon API.
 *
 * @param version - DataDragon version to fetch
 * @returns Promise resolving to ItemsResponse
 * @throws Error if fetch fails or response is invalid
 */
async function fetchItemsFromApi(version: string): Promise<ItemsResponse> {
  const response = await fetch(
    `${DDRAGON_BASE_URL}/cdn/${version}/data/en_US/item.json`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch item data: ${response.status} ${response.statusText}`
    );
  }

  const data: ItemsResponse = await response.json();

  if (!data.version || !data.data) {
    throw new Error('Invalid items response: missing version or data');
  }

  return data;
}

/**
 * Removes old version caches from localStorage to prevent storage bloat.
 * Keeps only the cache for the current version.
 *
 * @param currentVersion - The version to keep
 */
function cleanupOldCaches(currentVersion: string): void {
  const currentCacheKey = getItemsCacheKey(currentVersion);
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('buildle-items-') && key !== currentCacheKey) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

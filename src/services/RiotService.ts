/**
 * RiotService.ts
 *
 * Service layer for loading League of Legends item data.
 *
 * Strategy ("daily snapshot"):
 * 1. Use the localStorage snapshot if it is less than 24h old
 * 2. Otherwise fetch the latest patch straight from DataDragon (no API key needed)
 * 3. If DataDragon is unreachable, fall back to the bundled items-data.json
 *    (refreshed at build time by scripts/fetch-items.js)
 */

import type { ItemsResponse } from '../types/items';

// ============================================================================
// Constants
// ============================================================================

/** Path to bundled items data (fetched at build time) */
const BUNDLED_ITEMS_PATH = '/items-data.json';

/** DataDragon base URL */
const DDRAGON_URL = 'https://ddragon.leagueoflegends.com';

/** DataDragon CDN base URL for images */
const DDRAGON_CDN_URL = `${DDRAGON_URL}/cdn`;

/** localStorage key for the daily item snapshot */
const CACHE_KEY = 'pathdle-items-snapshot';

/** How long a snapshot stays fresh */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Give up on live DataDragon after this long and use the bundle */
const LIVE_TIMEOUT_MS = 4000;

interface CachedSnapshot extends ItemsResponse {
  fetchedAt: number;
}

/** In-memory copy so we only load once per session */
let memoryCache: Promise<ItemsResponse> | null = null;

// ============================================================================
// Loaders
// ============================================================================

function readSnapshot(): CachedSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as CachedSnapshot;
    return Date.now() - snapshot.fetchedAt < CACHE_TTL_MS ? snapshot : null;
  } catch {
    return null;
  }
}

function writeSnapshot(response: ItemsResponse): void {
  try {
    const snapshot: CachedSnapshot = { ...response, fetchedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full/unavailable - the in-memory cache still works
  }
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchLiveItems(): Promise<ItemsResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);

  try {
    const versions = await fetchJson<string[]>(`${DDRAGON_URL}/api/versions.json`, controller.signal);
    const version = versions[0];
    const items = await fetchJson<{ data: ItemsResponse['data'] }>(
      `${DDRAGON_CDN_URL}/${version}/data/en_US/item.json`,
      controller.signal
    );
    return { version, data: items.data };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBundledItems(): Promise<ItemsResponse> {
  const bundled = await fetchJson<ItemsResponse>(BUNDLED_ITEMS_PATH);
  return { version: bundled.version, data: bundled.data };
}

async function loadItems(): Promise<ItemsResponse> {
  const snapshot = readSnapshot();
  if (snapshot) {
    return { version: snapshot.version, data: snapshot.data };
  }

  try {
    const live = await fetchLiveItems();
    writeSnapshot(live);
    return live;
  } catch (error) {
    console.warn('Live DataDragon unavailable, using bundled items:', error);
  }

  try {
    return await fetchBundledItems();
  } catch (error) {
    console.error('Error loading bundled items:', error);
    throw new Error('Failed to load game data. Please refresh the page.');
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Loads item data (daily snapshot -> live DataDragon -> bundled fallback).
 * Cached in memory for the rest of the session.
 *
 * @returns Promise resolving to items response with version and data
 * @throws Error if no item data can be loaded at all
 *
 * @example
 * const { version, data } = await getItems();
 * console.log(`Loaded ${Object.keys(data).length} items for version ${version}`);
 */
export function getItems(): Promise<ItemsResponse> {
  memoryCache ??= loadItems().catch(error => {
    memoryCache = null;
    throw error;
  });
  return memoryCache;
}

/**
 * Generates the full CDN URL for an item's image.
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
 * Generates the full CDN URL for a champion's square icon.
 *
 * @param championName - Champion ID as used by match-v5 (e.g., "KaiSa")
 * @param version - DataDragon version string
 */
export function getChampionIconUrl(championName: string, version: string): string {
  return `${DDRAGON_CDN_URL}/${version}/img/champion/${toDataDragonChampionId(championName)}.png`;
}

/**
 * Generates the full CDN URL for a champion's default splash art.
 *
 * @param championName - Champion ID as used by match-v5 (e.g., "KaiSa")
 */
export function getChampionSplashUrl(championName: string): string {
  return `${DDRAGON_CDN_URL}/img/champion/splash/${toDataDragonChampionId(championName)}_0.jpg`;
}

/** match-v5 and DataDragon disagree on this one champion's capitalisation */
function toDataDragonChampionId(championName: string): string {
  return championName === 'FiddleSticks' ? 'Fiddlesticks' : championName;
}

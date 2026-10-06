/**
 * MetaService.ts
 *
 * Loads the Challenger meta snapshot produced by scripts/fetch-meta.js.
 * The snapshot is optional flavour: if it's missing, the game still works.
 */

export interface MetaChampion {
  name: string;
  count: number;
}

export interface MetaItem {
  /** Number of players that finished the game with this item */
  players: number;
  /** players / all players in the sample */
  pickRate: number;
  /** Win rate of players who had this item */
  winRate: number;
  /** Most common champions building it */
  topChamps: MetaChampion[];
}

export interface MetaSnapshot {
  patch: string | null;
  platform: string;
  tier: string;
  matchCount: number;
  playerCount: number;
  generatedAt: string;
  items: Record<string, MetaItem>;
}

const META_PATH = '/meta-data.json';

let cache: Promise<MetaSnapshot | null> | null = null;

/**
 * Loads the meta snapshot once per session.
 * @returns The snapshot, or null if it isn't available
 */
export function getMeta(): Promise<MetaSnapshot | null> {
  cache ??= fetch(META_PATH)
    .then(response => (response.ok ? (response.json() as Promise<MetaSnapshot>) : null))
    .catch(() => null);
  return cache;
}

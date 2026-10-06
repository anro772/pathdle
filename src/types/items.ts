/**
 * TypeScript interfaces for the Pathdle game.
 * These define all data structures used throughout the app.
 */

// ============================================================================
// DataDragon API Types
// ============================================================================

/**
 * Raw item data from the DataDragon API.
 * Represents a single item's complete data structure as returned by Riot's CDN.
 */
export interface ItemData {
  /** Display name of the item */
  name: string;

  /** HTML-formatted description with stats and passive effects */
  description: string;

  /** Gold cost information for the item */
  gold: {
    /** Cost to combine from components (recipe cost) */
    base: number;
    /** Total gold value including all components */
    total: number;
    /** Whether the item can be purchased from the shop */
    purchasable: boolean;
    /** Gold returned when selling the item */
    sell: number;
  };

  /** Array of component item IDs required to build this item (empty/undefined for basic items) */
  from?: string[];

  /** Array of item IDs that this item builds into */
  into?: string[];

  /** Map availability - key "11" = Summoner's Rift, value indicates if available */
  maps: Record<string, boolean>;

  /** Stat bonuses provided by the item (e.g., FlatPhysicalDamageMod, FlatArmorMod) */
  stats: Record<string, number>;

  /** Category tags for the item (e.g., "Damage", "Health", "CriticalStrike") */
  tags: string[];

  /** Image asset information for rendering the item icon */
  image: {
    /** Filename of the item image (e.g., "1001.png") */
    full: string;
    /** Sprite sheet containing this item's icon */
    sprite: string;
    /** Image group category */
    group: string;
  };
}

/**
 * Response structure from the DataDragon items endpoint.
 * Contains version info and a map of all items keyed by item ID.
 */
export interface ItemsResponse {
  /** DataDragon version string (e.g., "14.1.1") */
  version: string;

  /** Map of item ID to item data */
  data: Record<string, ItemData>;
}

// ============================================================================
// Recipe Engine Types
// ============================================================================

/**
 * Recursive component tree node representing an item's build path.
 * Built from ItemData by the recipe engine for game logic.
 */
export interface ComponentNode {
  /** Item ID from DataDragon (e.g., "3031") */
  itemId: string;

  /** Display name of the item */
  itemName: string;

  /** Sub-components required to build this item (empty array for atomic/basic items) */
  children: ComponentNode[];

  /** Combine cost - the gold you ADD to components to complete the recipe */
  goldCost: number;

  /** Full item value including all components (used for Level 11+ validation) */
  totalCost: number;
}


// ============================================================================
// Game State Types
// ============================================================================

/**
 * Game modes.
 * - 'endless': Lives-based run with a difficulty ramp
 * - 'daily': The same seeded 10-item run for everyone, once per day
 * - 'practice': No timer, no lives, retry until you get it
 */
export type GameMode = 'endless' | 'daily' | 'practice';

/**
 * Possible states of the game.
 * - 'menu': Player is on the main menu/start screen
 * - 'loading': Item data is loading
 * - 'playing': Active gameplay in progress
 * - 'gameover': Game has ended, showing results
 */
export type GameStatus = 'menu' | 'loading' | 'playing' | 'gameover';

/** How a level went: perfect (no mistakes), mistake (lost a life), failed (timed out / revealed) */
export type LevelOutcome = 'perfect' | 'mistake' | 'failed';

/** Which pool a level draws its target item from */
export type TargetPool = 'epic' | 'legendary';

/**
 * Difficulty configuration for each game level.
 * Controls the target pool, timer and gold checks.
 */
export interface DifficultySettings {
  /** Pool the target item is drawn from */
  pool: TargetPool;

  /** Time limit in seconds for the level (0 = no timer) */
  timerDuration: number;

  /** Number of component gold-cost questions after the level (0 = none) */
  goldChecks: number;

  /** Whether the gold check also asks for the target item's total cost */
  finalGoldCheck: boolean;
}

/**
 * Central game state management using Zustand.
 * Manages all game state including level progression, player input, timer, and component trees.
 */

import { create } from 'zustand';
import type { ComponentNode } from '../types/items';

/**
 * Complete game state interface.
 * This defines all state properties and action methods for the Buildle game.
 */
export interface GameState {
  // ============================================================================
  // Game Status
  // ============================================================================

  /** Current state of the game (menu/playing/gameover) */
  gameStatus: 'menu' | 'playing' | 'gameover';

  /** Current level number (1-15) */
  currentLevel: number;

  /** Number of lives remaining (3, 2, 1, or 0) */
  livesRemaining: 3 | 2 | 1 | 0;

  // ============================================================================
  // Current Challenge
  // ============================================================================

  /** The target item component tree to build (null when not playing) */
  targetItem: ComponentNode | null;

  /** Path to the currently focused component slot (e.g., [0, 1] for first child's second child) */
  focusedComponentPath: number[];

  /** Set of completed component paths stored as stringified paths (e.g., "0,1") */
  unlockedComponents: Set<string>;

  // ============================================================================
  // Player Input
  // ============================================================================

  /** Array of item IDs selected from the shop for the current purchase */
  selectedItems: string[];

  /** Raw gold input string typed by the player */
  goldInput: string;

  // ============================================================================
  // Timer
  // ============================================================================

  /** Seconds remaining in the current level */
  timeRemaining: number;

  /** Whether the timer is actively counting down */
  timerActive: boolean;

  // ============================================================================
  // Progression
  // ============================================================================

  /** Highest level reached across all game sessions (persisted to localStorage) */
  bestLevelReached: number;

  // ============================================================================
  // Difficulty Gates
  // ============================================================================

  /** If true, player must match component gold costs exactly (Level 6+) */
  requiresComponentGold: boolean;

  /** If true, player must match the final item's total gold cost (Level 11+) */
  requiresFinalGold: boolean;

  // ============================================================================
  // Actions (Placeholder definitions - implemented in Task 2)
  // ============================================================================

  /**
   * Initialize a new game session.
   * Sets up the first level, resets lives, and starts the timer.
   */
  startGame: () => void;

  /**
   * Change the currently focused component slot.
   * @param path - Array representing the path to the component (e.g., [0, 1])
   */
  focusComponent: (path: number[]) => void;

  /**
   * Add an item to the current selection from the shop.
   * @param itemId - The DataDragon item ID to select
   */
  selectShopItem: (itemId: string) => void;

  /**
   * Validate and process the current purchase attempt.
   * Checks if selected items + gold match the focused component.
   */
  submitPurchase: () => void;

  /**
   * Deduct a life from the player.
   * Triggers game over if lives reach 0.
   */
  loseLife: () => void;

  /**
   * Automatically complete a component slot (e.g., for basic items or correct purchases).
   * @param path - Path to the component to mark as complete
   */
  autoCompleteComponent: (path: number[]) => void;

  /**
   * Move to the next level.
   * Generates a new target item and applies difficulty scaling.
   */
  advanceLevel: () => void;

  /**
   * Reset the entire game state to initial values.
   * Used for returning to menu or starting over.
   */
  resetGame: () => void;
}

/**
 * Zustand store hook for game state management.
 * Use this hook in React components to access and modify game state.
 *
 * @example
 * const { gameStatus, currentLevel, startGame } = useGameStore();
 */
export const useGameStore = create<GameState>((set) => ({
  // ============================================================================
  // Initial State Values
  // ============================================================================

  // Game Status
  gameStatus: 'menu',
  currentLevel: 1,
  livesRemaining: 3,

  // Current Challenge
  targetItem: null,
  focusedComponentPath: [],
  unlockedComponents: new Set<string>(),

  // Player Input
  selectedItems: [],
  goldInput: '',

  // Timer
  timeRemaining: 10,
  timerActive: false,

  // Progression
  bestLevelReached: 0,

  // Difficulty Gates
  requiresComponentGold: false,
  requiresFinalGold: false,

  // ============================================================================
  // Action Placeholders (Implementation in Task 2)
  // ============================================================================

  startGame: () => {
    // TODO: Implement in Task 2
  },

  focusComponent: (path: number[]) => {
    // TODO: Implement in Task 2
  },

  selectShopItem: (itemId: string) => {
    // TODO: Implement in Task 2
  },

  submitPurchase: () => {
    // TODO: Implement in Task 2
  },

  loseLife: () => {
    // TODO: Implement in Task 2
  },

  autoCompleteComponent: (path: number[]) => {
    // TODO: Implement in Task 2
  },

  advanceLevel: () => {
    // TODO: Implement in Task 2
  },

  resetGame: () => {
    // TODO: Implement in Task 2
  },
}));

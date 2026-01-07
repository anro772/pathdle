/**
 * Central game state management using Zustand.
 * Manages all game state including level progression, player input, timer, and component trees.
 */

import { create } from 'zustand';
import type { ComponentNode } from '../types/items';
import { getItems } from '../services/RiotService';
import { filterItems, getRandomLegendaryId } from '../utils/itemFilters';
import { buildComponentTree } from '../utils/recipeEngine';

// ============================================================================
// Constants
// ============================================================================

/** localStorage key for persisting best level reached */
const STORAGE_KEY_BEST_LEVEL = 'buildle-best-level';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Traverses a component tree by following a path array.
 * @param root - The root node of the tree
 * @param path - Array of indices to follow (e.g., [0, 1] = first child's second child)
 * @returns The node at the specified path, or null if path is invalid
 */
function getNodeAtPath(root: ComponentNode | null, path: number[]): ComponentNode | null {
  if (!root) return null;
  if (path.length === 0) return root;

  let current = root;
  for (const index of path) {
    if (index >= current.children.length) return null;
    current = current.children[index];
  }
  return current;
}

/**
 * Compares two arrays of item IDs accounting for duplicates.
 * Order doesn't matter, but quantities must match exactly.
 * @param arr1 - First array of item IDs
 * @param arr2 - Second array of item IDs
 * @returns True if arrays contain same items with same quantities
 */
function arraysEqualWithDuplicates(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) return false;

  const freq1 = arr1.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const freq2 = arr2.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Compare frequency maps
  return Object.keys(freq1).length === Object.keys(freq2).length &&
         Object.keys(freq1).every(key => freq1[key] === freq2[key]);
}

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
  // Level Transition State
  // ============================================================================

  /** If true, awaiting final gold input for Level 11+ after all components unlocked */
  awaitingFinalGold: boolean;

  /** If true, currently transitioning between levels (disables interactions) */
  isTransitioning: boolean;

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
   * Submit and validate final gold cost for Level 11+ completion.
   * Called after all components are unlocked to validate total item cost.
   */
  submitFinalGold: () => void;

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

  /**
   * Decrement the timer by one second.
   * Called every second by the Timer component.
   */
  decrementTimer: () => void;

  /**
   * Handle timer expiration.
   * Loses a life, auto-completes remaining components, and advances level or ends game.
   */
  handleTimerExpire: () => void;
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
  bestLevelReached: parseInt(localStorage.getItem(STORAGE_KEY_BEST_LEVEL) || '0'),

  // Difficulty Gates
  requiresComponentGold: false,
  requiresFinalGold: false,

  // Level Transition State
  awaitingFinalGold: false,
  isTransitioning: false,

  // ============================================================================
  // Action Implementations
  // ============================================================================

  /**
   * Initialize a new game session.
   * Fetches item data, selects a random legendary, and sets up level 1.
   */
  startGame: async () => {
    try {
      // Fetch and filter item data
      const itemsResponse = await getItems();
      const { legendaries } = filterItems(itemsResponse.data);
      const legendaryId = getRandomLegendaryId(legendaries);
      const tree = buildComponentTree(legendaryId, itemsResponse.data);

      // Initialize game state
      set({
        gameStatus: 'playing',
        currentLevel: 1,
        livesRemaining: 3,
        targetItem: tree,
        focusedComponentPath: [],
        unlockedComponents: new Set<string>(),
        selectedItems: [],
        goldInput: '',
        timeRemaining: 10,
        timerActive: true,
        // Difficulty gates for level 1
        requiresComponentGold: false,
        requiresFinalGold: false,
        // Reset transition flags
        awaitingFinalGold: false,
        isTransitioning: false,
      });
    } catch (error) {
      console.error('Failed to start game:', error);
      // Stay in menu state on error
      return;
    }
  },

  /**
   * Change the currently focused component slot.
   * Clears any previous selections.
   */
  focusComponent: (path: number[]) => {
    set({
      focusedComponentPath: path,
      selectedItems: [],
      goldInput: '',
    });
  },

  /**
   * Add an item from the shop to the selection cart.
   * Allows duplicates.
   */
  selectShopItem: (itemId: string) => {
    set((state) => ({
      selectedItems: [...state.selectedItems, itemId],
    }));
  },

  /**
   * Validate and process the current purchase attempt.
   * Checks if selected items and gold match the focused component.
   */
  submitPurchase: () => {
    set((state) => {
      // Guard against interactions during level transitions
      if (state.isTransitioning) return state;

      // Get the focused component node
      const focusedNode = getNodeAtPath(state.targetItem, state.focusedComponentPath);

      if (!focusedNode) {
        console.error('No focused component found');
        return state;
      }

      // Extract required item IDs from children
      const requiredItems = focusedNode.children.map(child => child.itemId);

      // Validate item selection
      const itemsCorrect = arraysEqualWithDuplicates(state.selectedItems, requiredItems);

      // Validate gold input (if required by difficulty)
      let goldCorrect = true;
      if (state.requiresComponentGold) {
        const inputGold = parseInt(state.goldInput.trim());
        goldCorrect = !isNaN(inputGold) && inputGold === focusedNode.goldCost;
      }

      // Check if answer is correct
      const isCorrect = itemsCorrect && goldCorrect;

      if (isCorrect) {
        // CORRECT: Unlock the component
        const pathStr = state.focusedComponentPath.join(',');
        const newUnlockedSet = new Set([...state.unlockedComponents, pathStr]);

        // Check if all direct children of root are unlocked
        const allChildrenUnlocked = state.targetItem?.children.every((_, index) =>
          newUnlockedSet.has([index].join(','))
        );

        if (allChildrenUnlocked) {
          // Level complete! Check if final gold is required (Level 11+)
          if (state.currentLevel >= 11 && state.requiresFinalGold) {
            // For Level 11+, enter final gold validation phase
            return {
              unlockedComponents: newUnlockedSet,
              focusedComponentPath: [],
              selectedItems: [],
              goldInput: '',
              awaitingFinalGold: true,
              timerActive: false,
            };
          } else {
            // For levels < 11, advance after a short delay
            // Set transition flag IMMEDIATELY before setTimeout
            useGameStore.setState({ isTransitioning: true });

            setTimeout(async () => {
              try {
                await useGameStore.getState().advanceLevel();
              } catch (error) {
                console.error('Failed to advance level:', error);
                useGameStore.setState({ isTransitioning: false });
              }
            }, 500);

            return {
              unlockedComponents: newUnlockedSet,
              focusedComponentPath: [],
              selectedItems: [],
              goldInput: '',
              // Don't set isTransitioning here - already set above
            };
          }
        }

        return {
          unlockedComponents: newUnlockedSet,
          focusedComponentPath: [],
          selectedItems: [],
          goldInput: '',
        };
      } else {
        // WRONG: Lose life and auto-complete component
        const pathStr = state.focusedComponentPath.join(',');
        const newUnlockedSet = new Set([...state.unlockedComponents, pathStr]);

        // Lose a life (this will handle game over if needed)
        const newLives = Math.max(0, state.livesRemaining - 1) as 3 | 2 | 1 | 0;
        const isGameOver = newLives === 0;

        if (isGameOver) {
          const newBest = Math.max(state.bestLevelReached, state.currentLevel);
          // Persist to localStorage
          localStorage.setItem(STORAGE_KEY_BEST_LEVEL, newBest.toString());

          return {
            livesRemaining: 0,
            gameStatus: 'gameover' as const,
            timerActive: false,
            bestLevelReached: newBest,
            unlockedComponents: newUnlockedSet,
            focusedComponentPath: [],
            selectedItems: [],
            goldInput: '',
          };
        }

        return {
          livesRemaining: newLives,
          unlockedComponents: newUnlockedSet,
          focusedComponentPath: [],
          selectedItems: [],
          goldInput: '',
        };
      }
    });
  },

  /**
   * Submit and validate final gold cost for Level 11+ completion.
   * Called after all components are unlocked to validate total item cost.
   */
  submitFinalGold: () => {
    set((state) => {
      // Only valid when awaiting final gold
      if (!state.awaitingFinalGold || !state.targetItem) {
        return state;
      }

      // Guard against interactions during transitions
      if (state.isTransitioning) return state;

      // Parse and validate gold input
      const inputGold = parseInt(state.goldInput.trim());
      const isCorrect = !isNaN(inputGold) && inputGold === state.targetItem.totalCost;

      if (isCorrect) {
        // Correct! Advance to next level after delay
        // Set transition flag IMMEDIATELY before setTimeout
        useGameStore.setState({ isTransitioning: true });

        setTimeout(async () => {
          try {
            await useGameStore.getState().advanceLevel();
          } catch (error) {
            console.error('Failed to advance level:', error);
            useGameStore.setState({ isTransitioning: false });
          }
        }, 500);

        return {
          goldInput: '',
          awaitingFinalGold: false,
          // Don't set isTransitioning here - already set above
        };
      } else {
        // Wrong! Lose a life
        const newLives = Math.max(0, state.livesRemaining - 1) as 3 | 2 | 1 | 0;
        const isGameOver = newLives === 0;

        if (isGameOver) {
          const newBest = Math.max(state.bestLevelReached, state.currentLevel);
          // Persist to localStorage
          localStorage.setItem(STORAGE_KEY_BEST_LEVEL, newBest.toString());

          return {
            livesRemaining: 0,
            gameStatus: 'gameover' as const,
            timerActive: false,
            bestLevelReached: newBest,
            goldInput: '',
            awaitingFinalGold: false,
          };
        }

        // Clear input and remain in final gold state
        return {
          livesRemaining: newLives,
          goldInput: '',
        };
      }
    });
  },

  /**
   * Deduct a life from the player.
   * Triggers game over if lives reach 0.
   */
  loseLife: () => {
    set((state) => {
      const newLives = Math.max(0, state.livesRemaining - 1) as 3 | 2 | 1 | 0;

      if (newLives === 0) {
        // Game over - update best level if needed
        const newBest = Math.max(state.bestLevelReached, state.currentLevel);
        // Persist to localStorage
        localStorage.setItem(STORAGE_KEY_BEST_LEVEL, newBest.toString());

        return {
          livesRemaining: 0,
          gameStatus: 'gameover' as const,
          timerActive: false,
          bestLevelReached: newBest,
        };
      }

      return {
        livesRemaining: newLives,
      };
    });
  },

  /**
   * Automatically complete a component slot.
   * Used when player gets an answer wrong or timer expires.
   */
  autoCompleteComponent: (path: number[]) => {
    set((state) => ({
      unlockedComponents: new Set([...state.unlockedComponents, path.join(',')]),
    }));
  },

  /**
   * Move to the next level.
   * Generates a new target item and applies difficulty scaling.
   */
  advanceLevel: async () => {
    const currentState = useGameStore.getState();
    const newLevel = currentState.currentLevel + 1;

    try {
      // Fetch and filter item data
      const itemsResponse = await getItems();
      const { legendaries } = filterItems(itemsResponse.data);
      const legendaryId = getRandomLegendaryId(legendaries);
      const tree = buildComponentTree(legendaryId, itemsResponse.data);

      // Update best level reached if this is a new record
      const currentBest = useGameStore.getState().bestLevelReached;
      const newBest = Math.max(currentBest, newLevel);
      if (newBest > currentBest) {
        localStorage.setItem(STORAGE_KEY_BEST_LEVEL, newBest.toString());
      }

      // Reset level-specific state, preserve lives
      set({
        currentLevel: newLevel,
        targetItem: tree,
        focusedComponentPath: [],
        unlockedComponents: new Set<string>(),
        selectedItems: [],
        goldInput: '',
        timeRemaining: 10,
        timerActive: true,
        // Update difficulty gates based on new level
        requiresComponentGold: newLevel >= 6,
        requiresFinalGold: newLevel >= 11,
        // Reset transition flags
        awaitingFinalGold: false,
        isTransitioning: false,
        // Update best level
        bestLevelReached: newBest,
        // livesRemaining stays the same!
      });
    } catch (error) {
      console.error('Failed to advance level:', error);
      // Reset transition flag on error to prevent stuck state
      set({ isTransitioning: false });
      return;
    }
  },

  /**
   * Reset the entire game state to initial values.
   * Used for the Play Again button.
   */
  resetGame: () => {
    set((state) => ({
      gameStatus: 'menu',
      currentLevel: 1,
      livesRemaining: 3,
      targetItem: null,
      focusedComponentPath: [],
      unlockedComponents: new Set<string>(),
      selectedItems: [],
      goldInput: '',
      timeRemaining: 10,
      timerActive: false,
      requiresComponentGold: false,
      requiresFinalGold: false,
      // Reset transition flags
      awaitingFinalGold: false,
      isTransitioning: false,
      // bestLevelReached stays the same (persisted)
      bestLevelReached: state.bestLevelReached,
    }));
  },

  /**
   * Decrement the timer by one second.
   * Called every second by the Timer component.
   */
  decrementTimer: () => {
    set((state) => {
      if (!state.timerActive || state.timeRemaining <= 0) return state;

      const newTime = state.timeRemaining - 1;

      if (newTime <= 0) {
        // Timer expired - stop timer but don't handle expiration here
        // The Timer component will call handleTimerExpire()
        return { timeRemaining: 0, timerActive: false };
      }

      return { timeRemaining: newTime };
    });
  },

  /**
   * Handle timer expiration.
   * Loses a life, auto-completes remaining components, and advances level or ends game.
   */
  handleTimerExpire: () => {
    set((state) => {
      // Lose a life
      const newLives = Math.max(0, state.livesRemaining - 1) as 3 | 2 | 1 | 0;

      // Auto-complete all remaining locked components
      const allPaths: string[] = [];
      state.targetItem?.children.forEach((_, index) => {
        const pathStr = [index].join(',');
        if (!state.unlockedComponents.has(pathStr)) {
          allPaths.push(pathStr);
        }
      });

      const newUnlockedSet = new Set([...state.unlockedComponents, ...allPaths]);

      if (newLives === 0) {
        // Game over
        const newBest = Math.max(state.bestLevelReached, state.currentLevel);
        // Persist to localStorage
        localStorage.setItem(STORAGE_KEY_BEST_LEVEL, newBest.toString());

        return {
          livesRemaining: 0,
          gameStatus: 'gameover' as const,
          timerActive: false,
          bestLevelReached: newBest,
          unlockedComponents: newUnlockedSet,
        };
      } else {
        // Advance to next level after showing auto-completed components
        // Set transition flag IMMEDIATELY before setTimeout
        useGameStore.setState({ isTransitioning: true });

        setTimeout(async () => {
          try {
            await useGameStore.getState().advanceLevel();
          } catch (error) {
            console.error('Failed to advance level:', error);
            useGameStore.setState({ isTransitioning: false });
          }
        }, 1500);

        return {
          livesRemaining: newLives,
          timerActive: false,
          unlockedComponents: newUnlockedSet,
          // Don't set isTransitioning here - already set above
        };
      }
    });
  },
}));

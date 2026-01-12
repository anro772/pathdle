/**
 * Central game state management using Zustand.
 * Manages all game state including level progression, player input, timer, and component trees.
 */

import { create } from 'zustand';
import type { ComponentNode, ItemData } from '../types/items';
import { getItems } from '../services/RiotService';
import { filterItems, getRandomLegendaryId } from '../utils/itemFilters';
import { buildComponentTree } from '../utils/recipeEngine';

// ============================================================================
// Constants
// ============================================================================

/** localStorage key for persisting best level reached */
const STORAGE_KEY_BEST_LEVEL = 'pathdle-best-level';

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
 * Collects all base (leaf) component item IDs from a component tree.
 * Used for "Buy All" mode where player selects all base components at once.
 *
 * @param node - The component node to traverse
 * @returns Array of all base component item IDs (may contain duplicates)
 */
function collectAllBaseComponents(node: ComponentNode): string[] {
  // Base case: this is a leaf node (no children) - it's a base component
  if (node.children.length === 0) {
    return [node.itemId];
  }

  // Recursive case: collect from all children
  const baseComponents: string[] = [];
  for (const child of node.children) {
    baseComponents.push(...collectAllBaseComponents(child));
  }
  return baseComponents;
}

/**
 * Generates hint reveals for a component tree.
 * Rules:
 * - For Row 2 components with 2+ sub-components: reveal 1 random sub-component
 * - For Row 2 components with 1 sub-component: never reveal (too easy)
 * - Maximum 2 hints total across all Row 2 components
 *
 * @param tree - The target item component tree
 * @returns Map of Row 2 index to sub-component index to reveal
 */
function generateRevealedHints(tree: ComponentNode): Map<number, number> {
  const hints = new Map<number, number>();

  // Find all Row 2 components with 2+ sub-components (eligible for hints)
  const eligibleIndices: number[] = [];
  tree.children.forEach((child, index) => {
    if (child.children.length >= 2) {
      eligibleIndices.push(index);
    }
  });

  // Shuffle eligible indices to randomize which get hints
  const shuffled = [...eligibleIndices].sort(() => Math.random() - 0.5);

  // Take at most 2 for hints
  const toReveal = shuffled.slice(0, 2);

  // For each selected Row 2 component, pick a random sub-component to reveal
  for (const row2Index of toReveal) {
    const numSubs = tree.children[row2Index].children.length;
    const randomSubIndex = Math.floor(Math.random() * numSubs);
    hints.set(row2Index, randomSubIndex);
  }

  return hints;
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

// ============================================================================
// Gold Check Types
// ============================================================================

/**
 * Represents a single gold check item in the modal.
 * Each item corresponds to a Row 2 component with non-zero goldCost.
 */
export interface GoldCheckItem {
  /** Index in Row 2 (targetItem.children) */
  componentIndex: number;
  /** DataDragon item ID */
  itemId: string;
  /** Display name of the item */
  itemName: string;
  /** Correct gold cost (ComponentNode.goldCost) */
  correctGold: number;
  /** Two options: [correct, wrong] shuffled */
  options: [number, number];
  /** Player's selected answer (null if not answered) */
  selectedAnswer: number | null;
}

/**
 * State for the gold check modal that appears after purchasing all components.
 * Active at Level 6+ after completing all Row 2 components.
 */
export interface GoldCheckState {
  /** Whether the gold check modal is currently active */
  isActive: boolean;
  /** Array of gold check items (Row 2 components) */
  items: GoldCheckItem[];
  /** Final item gold check for Level 10+ (uses totalCost) */
  finalItemCheck: {
    correctGold: number;
    options: [number, number];
    selectedAnswer: number | null;
  } | null;
  /** Seconds remaining (starts at 10) */
  timeRemaining: number;
  /** Whether the modal timer is actively counting down */
  timerActive: boolean;
}

/**
 * Complete game state interface.
 * This defines all state properties and action methods for the Pathdle game.
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

  /** Set of component paths that were answered incorrectly (for showing red X) */
  failedComponents: Set<string>;

  /**
   * Map of Row 2 component index to revealed sub-component index.
   * Used to show hints in Row 3 for components with 2+ sub-components.
   * Key: Row 2 index (e.g., "0", "1"), Value: sub-component index to reveal
   */
  revealedHints: Map<number, number>;

  /**
   * Array of item IDs that are pre-filled and locked in the cart.
   * These are hint items that cannot be removed by the player.
   */
  lockedCartItems: string[];

  /**
   * Whether the player is in "Buy All" mode (clicked the target item).
   * In this mode, player must select ALL base components at once.
   */
  isBuyAllMode: boolean;

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

  /** If true, level is complete and waiting for player to click "Next Level" */
  levelComplete: boolean;

  // ============================================================================
  // Gold Check Modal State
  // ============================================================================

  /** State for the gold check modal (Level 6+) */
  goldCheckState: GoldCheckState;

  // ============================================================================
  // Data pools for UI components
  // ============================================================================

  /** Complete item database for lookups and tree building (null before game starts) */
  allItems: Record<string, ItemData> | null;

  /** Filtered basic items for shop grid generation (null before game starts) */
  basicComponents: Record<string, ItemData> | null;

  /** DataDragon version for constructing image URLs (null before game starts) */
  dataVersion: string | null;

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
   * Loses a life, auto-completes remaining components, and sets level complete.
   */
  handleTimerExpire: () => void;

  /**
   * Proceed to the next level after player clicks "Next Level".
   * Called when levelComplete is true and player wants to continue.
   */
  proceedToNextLevel: () => void;

  // ============================================================================
  // Gold Check Modal Actions
  // ============================================================================

  /**
   * Initialize the gold check modal after all components are purchased.
   * Called at Level 6+ when all Row 2 components are unlocked.
   */
  initiateGoldCheck: () => void;

  /**
   * Select a gold answer for a component in the gold check modal.
   * @param componentIndex - The Row 2 component index
   * @param selectedGold - The gold value selected by the player
   */
  selectGoldCheckAnswer: (componentIndex: number, selectedGold: number) => void;

  /**
   * Select a gold answer for the final item (Level 10+).
   * @param selectedGold - The gold value selected by the player
   */
  selectFinalGoldAnswer: (selectedGold: number) => void;

  /**
   * Submit all gold check answers and validate.
   * Loses 1 life if any answer is wrong.
   */
  submitGoldCheck: () => void;

  /**
   * Decrement the gold check modal timer by one second.
   */
  decrementGoldCheckTimer: () => void;

  /**
   * Handle gold check timer expiration.
   * Auto-submits answers (unanswered count as wrong).
   */
  handleGoldCheckTimerExpire: () => void;
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
  failedComponents: new Set<string>(),
  revealedHints: new Map<number, number>(),
  lockedCartItems: [],
  isBuyAllMode: false,

  // Player Input
  selectedItems: [],
  goldInput: '',

  // Timer
  timeRemaining: 20,
  timerActive: false,

  // Progression
  bestLevelReached: parseInt(localStorage.getItem(STORAGE_KEY_BEST_LEVEL) || '0'),

  // Difficulty Gates
  requiresComponentGold: false,
  requiresFinalGold: false,

  // Level Transition State
  awaitingFinalGold: false,
  isTransitioning: false,
  levelComplete: false,

  // Gold Check Modal State
  goldCheckState: {
    isActive: false,
    items: [],
    finalItemCheck: null,
    timeRemaining: 10,
    timerActive: false,
  },

  // Data pools for UI components
  allItems: null,
  basicComponents: null,
  dataVersion: null,

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
      const { legendaries, basicComponents } = filterItems(itemsResponse.data);
      const legendaryId = getRandomLegendaryId(legendaries);
      const tree = buildComponentTree(legendaryId, itemsResponse.data);

      // Generate hints for this level
      const hints = generateRevealedHints(tree);

      // Initialize game state
      // TEMP: Start at level 6 for testing
      const testStartLevel = 6;
      set({
        gameStatus: 'playing',
        currentLevel: testStartLevel,
        livesRemaining: 3,
        targetItem: tree,
        focusedComponentPath: [],
        unlockedComponents: new Set<string>(),
        failedComponents: new Set<string>(),
        revealedHints: hints,
        lockedCartItems: [],
        isBuyAllMode: false,
        selectedItems: [],
        goldInput: '',
        timeRemaining: 20,
        timerActive: true,
        // Difficulty gates (adjusted for test start level)
        requiresComponentGold: testStartLevel >= 6,
        requiresFinalGold: testStartLevel >= 11,
        // Reset transition flags
        awaitingFinalGold: false,
        isTransitioning: false,
        levelComplete: false,
        // Reset gold check modal state
        goldCheckState: {
          isActive: false,
          items: [],
          finalItemCheck: null,
          timeRemaining: 10,
          timerActive: false,
        },
        // Expose filtered data for UI components
        allItems: itemsResponse.data,
        basicComponents: basicComponents,
        dataVersion: itemsResponse.version,
      });
    } catch (error) {
      console.error('Failed to start game:', error);
      // Stay in menu state on error
      return;
    }
  },

  /**
   * Change the currently focused component slot.
   * Clears any previous selections and pre-fills locked hint items if applicable.
   * Pass empty path [] to enter "Buy All" mode (target item clicked).
   */
  focusComponent: (path: number[]) => {
    set((state) => {
      // "Buy All" mode: path is empty (target item clicked)
      if (path.length === 0) {
        return {
          focusedComponentPath: [],
          selectedItems: [],
          lockedCartItems: [],
          goldInput: '',
          isBuyAllMode: true,
        };
      }

      // Check if this is a Row 2 component (path length 1) with a hint
      if (path.length === 1) {
        const row2Index = path[0];
        const hintSubIndex = state.revealedHints.get(row2Index);

        if (hintSubIndex !== undefined && state.targetItem) {
          // Get the hint item ID from the sub-component
          const row2Component = state.targetItem.children[row2Index];
          if (row2Component && row2Component.children[hintSubIndex]) {
            const hintItemId = row2Component.children[hintSubIndex].itemId;

            return {
              focusedComponentPath: path,
              selectedItems: [hintItemId], // Pre-fill with hint item
              lockedCartItems: [hintItemId], // Lock it in the cart
              goldInput: '',
              isBuyAllMode: false,
            };
          }
        }
      }

      // Default: no hints, clear everything
      return {
        focusedComponentPath: path,
        selectedItems: [],
        lockedCartItems: [],
        goldInput: '',
        isBuyAllMode: false,
      };
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
   * Handles three modes:
   * 1. Buy All mode: Player selected all base components for entire item
   * 2. Basic item mode: Smart assignment - correct item fills any matching slot
   * 3. Complex item mode: Must match the specific focused slot
   *
   * At Level 6+, successful completion triggers gold check modal instead of levelComplete.
   */
  submitPurchase: () => {
    const state = useGameStore.getState();

    // Guard against interactions during level transitions
    if (state.isTransitioning || !state.targetItem) return;

    // ========================================================================
    // MODE 1: Buy All mode - validate all base components at once
    // ========================================================================
    if (state.isBuyAllMode) {
      const allBaseComponents = collectAllBaseComponents(state.targetItem);
      const itemsCorrect = arraysEqualWithDuplicates(state.selectedItems, allBaseComponents);

      if (itemsCorrect) {
        // CORRECT: Unlock ALL components at once
        const newUnlockedSet = new Set(state.unlockedComponents);
        state.targetItem.children.forEach((_, index) => {
          newUnlockedSet.add([index].join(','));
        });

        // At Level 6+, trigger gold check modal instead of levelComplete
        if (state.currentLevel >= 6) {
          set({
            unlockedComponents: newUnlockedSet,
            focusedComponentPath: [],
            selectedItems: [],
            goldInput: '',
            timerActive: false,
            isBuyAllMode: false,
          });
          // Trigger gold check modal
          useGameStore.getState().initiateGoldCheck();
          return;
        }

        // Level 1-5: Just complete the level
        set({
          unlockedComponents: newUnlockedSet,
          focusedComponentPath: [],
          selectedItems: [],
          goldInput: '',
          timerActive: false,
          levelComplete: true,
          isBuyAllMode: false,
        });
        return;
      } else {
        // WRONG in Buy All mode: Lose life, unlock all as failed
        const newUnlockedSet = new Set(state.unlockedComponents);
        const newFailedSet = new Set(state.failedComponents);
        state.targetItem.children.forEach((_, index) => {
          const pathStr = [index].join(',');
          newUnlockedSet.add(pathStr);
          newFailedSet.add(pathStr);
        });

        const newLives = Math.max(0, state.livesRemaining - 1) as 3 | 2 | 1 | 0;
        const isGameOver = newLives === 0;

        if (isGameOver) {
          const newBest = Math.max(state.bestLevelReached, state.currentLevel);
          localStorage.setItem(STORAGE_KEY_BEST_LEVEL, newBest.toString());
          set({
            livesRemaining: 0,
            gameStatus: 'gameover' as const,
            timerActive: false,
            bestLevelReached: newBest,
            unlockedComponents: newUnlockedSet,
            failedComponents: newFailedSet,
            focusedComponentPath: [],
            selectedItems: [],
            goldInput: '',
            isBuyAllMode: false,
          });
          return;
        }

        set({
          livesRemaining: newLives,
          unlockedComponents: newUnlockedSet,
          failedComponents: newFailedSet,
          focusedComponentPath: [],
          selectedItems: [],
          goldInput: '',
          timerActive: false,
          levelComplete: true,
          isBuyAllMode: false,
        });
        return;
      }
    }

    // ========================================================================
    // MODE 2 & 3: Normal mode (focused on a specific slot)
    // ========================================================================
    const focusedNode = getNodeAtPath(state.targetItem, state.focusedComponentPath);

    if (!focusedNode) {
      console.error('No focused component found');
      return;
    }

    const isBasicItem = focusedNode.children.length === 0;
    const requiredItems = isBasicItem
      ? [focusedNode.itemId]
      : focusedNode.children.map(child => child.itemId);

    // Validate item selection
    let itemsCorrect = arraysEqualWithDuplicates(state.selectedItems, requiredItems);

    // ========================================================================
    // Smart slot assignment for basic items:
    // If focused slot is basic AND selected item is wrong for this slot,
    // check if it matches ANY other unfilled basic slot
    // ========================================================================
    let smartAssignPath: number[] | null = null;

    if (!itemsCorrect && isBasicItem && state.selectedItems.length === 1) {
      const selectedItem = state.selectedItems[0];

      // Look for another unfilled basic slot that needs this item
      for (let i = 0; i < state.targetItem.children.length; i++) {
        const pathStr = [i].join(',');
        if (state.unlockedComponents.has(pathStr)) continue; // Already unlocked

        const child = state.targetItem.children[i];
        // Check if this is a basic item slot that needs the selected item
        if (child.children.length === 0 && child.itemId === selectedItem) {
          // Found a matching slot!
          smartAssignPath = [i];
          itemsCorrect = true;
          break;
        }
      }
    }

    // Gold validation moved to GoldCheckModal (Level 6+)
    // Items just need to be correct here
    const isCorrect = itemsCorrect;

    if (isCorrect) {
      // CORRECT: Unlock the component (use smart-assigned path if applicable)
      const pathToUnlock = smartAssignPath || state.focusedComponentPath;
      const pathStr = pathToUnlock.join(',');
      const newUnlockedSet = new Set([...state.unlockedComponents, pathStr]);

      // Check if all direct children of root are unlocked
      const allChildrenUnlocked = state.targetItem.children.every((_, index) =>
        newUnlockedSet.has([index].join(','))
      );

      if (allChildrenUnlocked) {
        // At Level 6+, trigger gold check modal instead of levelComplete
        if (state.currentLevel >= 6) {
          set({
            unlockedComponents: newUnlockedSet,
            focusedComponentPath: [],
            selectedItems: [],
            goldInput: '',
            timerActive: false,
          });
          // Trigger gold check modal
          useGameStore.getState().initiateGoldCheck();
          return;
        }

        // Level 1-5: Just complete the level
        set({
          unlockedComponents: newUnlockedSet,
          focusedComponentPath: [],
          selectedItems: [],
          goldInput: '',
          timerActive: false,
          levelComplete: true,
        });
        return;
      }

      // Not all children unlocked yet, just update state
      set({
        unlockedComponents: newUnlockedSet,
        focusedComponentPath: [],
        selectedItems: [],
        goldInput: '',
      });
      return;
    } else {
      // WRONG: Lose life and auto-complete component
      const pathStr = state.focusedComponentPath.join(',');
      const newUnlockedSet = new Set([...state.unlockedComponents, pathStr]);
      const newFailedSet = new Set([...state.failedComponents, pathStr]);

      const newLives = Math.max(0, state.livesRemaining - 1) as 3 | 2 | 1 | 0;
      const isGameOver = newLives === 0;

      if (isGameOver) {
        const newBest = Math.max(state.bestLevelReached, state.currentLevel);
        localStorage.setItem(STORAGE_KEY_BEST_LEVEL, newBest.toString());

        set({
          livesRemaining: 0,
          gameStatus: 'gameover' as const,
          timerActive: false,
          bestLevelReached: newBest,
          unlockedComponents: newUnlockedSet,
          failedComponents: newFailedSet,
          focusedComponentPath: [],
          selectedItems: [],
          goldInput: '',
        });
        return;
      }

      const allChildrenUnlocked = state.targetItem.children.every((_, index) =>
        newUnlockedSet.has([index].join(','))
      );

      if (allChildrenUnlocked) {
        set({
          livesRemaining: newLives,
          unlockedComponents: newUnlockedSet,
          failedComponents: newFailedSet,
          focusedComponentPath: [],
          selectedItems: [],
          goldInput: '',
          timerActive: false,
          levelComplete: true,
        });
        return;
      }

      set({
        livesRemaining: newLives,
        unlockedComponents: newUnlockedSet,
        failedComponents: newFailedSet,
        focusedComponentPath: [],
        selectedItems: [],
        goldInput: '',
      });
    }
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
      const { legendaries, basicComponents } = filterItems(itemsResponse.data);
      const legendaryId = getRandomLegendaryId(legendaries);
      const tree = buildComponentTree(legendaryId, itemsResponse.data);

      // Generate hints for this level
      const hints = generateRevealedHints(tree);

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
        failedComponents: new Set<string>(),
        revealedHints: hints,
        lockedCartItems: [],
        isBuyAllMode: false,
        selectedItems: [],
        goldInput: '',
        timeRemaining: 20,
        timerActive: true,
        // Update difficulty gates based on new level
        requiresComponentGold: newLevel >= 6,
        requiresFinalGold: newLevel >= 11,
        // Reset transition flags
        awaitingFinalGold: false,
        isTransitioning: false,
        levelComplete: false,
        // Reset gold check modal state
        goldCheckState: {
          isActive: false,
          items: [],
          finalItemCheck: null,
          timeRemaining: 10,
          timerActive: false,
        },
        // Update best level
        bestLevelReached: newBest,
        // Update data pools (in case patch changed)
        allItems: itemsResponse.data,
        basicComponents: basicComponents,
        dataVersion: itemsResponse.version,
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
      failedComponents: new Set<string>(),
      revealedHints: new Map<number, number>(),
      lockedCartItems: [],
      isBuyAllMode: false,
      selectedItems: [],
      goldInput: '',
      timeRemaining: 20,
      timerActive: false,
      requiresComponentGold: false,
      requiresFinalGold: false,
      // Reset transition flags
      awaitingFinalGold: false,
      isTransitioning: false,
      levelComplete: false,
      // Reset gold check modal state
      goldCheckState: {
        isActive: false,
        items: [],
        finalItemCheck: null,
        timeRemaining: 10,
        timerActive: false,
      },
      // Reset data pools (will be refetched on next startGame)
      allItems: null,
      basicComponents: null,
      dataVersion: null,
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

      // Just decrement - don't stop timer here
      // App.tsx will check timeRemaining and call handleTimerExpire when it hits 0
      return { timeRemaining: newTime };
    });
  },

  /**
   * Handle timer expiration.
   * Loses a life, auto-completes remaining components, and sets level complete.
   */
  handleTimerExpire: () => {
    set((state) => {
      // Guard: Only handle if timer is still active (prevents double-calling)
      if (!state.timerActive) return state;

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
        // Set level complete - player must click "Next Level" to continue
        return {
          livesRemaining: newLives,
          timerActive: false,
          unlockedComponents: newUnlockedSet,
          levelComplete: true,
        };
      }
    });
  },

  /**
   * Proceed to the next level after player clicks "Next Level".
   */
  proceedToNextLevel: async () => {
    useGameStore.setState({ isTransitioning: true, levelComplete: false });
    try {
      await useGameStore.getState().advanceLevel();
    } catch (error) {
      console.error('Failed to advance level:', error);
      useGameStore.setState({ isTransitioning: false });
    }
  },

  // ============================================================================
  // Gold Check Modal Action Implementations
  // ============================================================================

  /**
   * Initialize the gold check modal after all components are purchased.
   * Selects random Row 2 components based on level difficulty.
   */
  initiateGoldCheck: () => {
    set((state) => {
      if (!state.targetItem) return state;

      // Determine how many gold checks based on level
      // Level 6-7: 1 check, Level 8-9: 2 checks, Level 10+: 3 checks + final item
      let numChecks: number;
      if (state.currentLevel <= 7) {
        numChecks = 1;
      } else if (state.currentLevel <= 9) {
        numChecks = 2;
      } else {
        numChecks = 3;
      }

      // Find eligible Row 2 components (non-zero goldCost)
      const eligibleComponents: Array<{ index: number; node: ComponentNode }> = [];
      state.targetItem.children.forEach((child, index) => {
        if (child.goldCost > 0) {
          eligibleComponents.push({ index, node: child });
        }
      });

      // If no eligible components, skip gold check entirely
      if (eligibleComponents.length === 0) {
        return {
          timerActive: false,
          levelComplete: true,
        };
      }

      // Cap numChecks at available components
      numChecks = Math.min(numChecks, eligibleComponents.length);

      // Shuffle and select components
      const shuffled = [...eligibleComponents].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, numChecks);

      // Build GoldCheckItems
      const items: GoldCheckItem[] = selected.map(({ index, node }) => {
        const correctGold = node.goldCost;
        // Generate one wrong value (random offset between 50-300)
        const offsets = [50, 100, 150, 200, 250, 300];
        const offset = offsets[Math.floor(Math.random() * offsets.length)];
        const wrongGold = Math.random() > 0.5
          ? correctGold + offset
          : Math.max(50, correctGold - offset); // Ensure positive

        // Shuffle the two options
        const options: [number, number] = Math.random() > 0.5
          ? [correctGold, wrongGold]
          : [wrongGold, correctGold];

        return {
          componentIndex: index,
          itemId: node.itemId,
          itemName: node.itemName,
          correctGold,
          options,
          selectedAnswer: null,
        };
      });

      // Final item check for Level 10+
      let finalItemCheck: GoldCheckState['finalItemCheck'] = null;
      if (state.currentLevel >= 10) {
        const correctGold = state.targetItem.totalCost;
        const offsets = [100, 200, 300, 400, 500];
        const offset = offsets[Math.floor(Math.random() * offsets.length)];
        const wrongGold = Math.random() > 0.5
          ? correctGold + offset
          : Math.max(100, correctGold - offset);

        const options: [number, number] = Math.random() > 0.5
          ? [correctGold, wrongGold]
          : [wrongGold, correctGold];

        finalItemCheck = {
          correctGold,
          options,
          selectedAnswer: null,
        };
      }

      return {
        timerActive: false, // Freeze main timer
        goldCheckState: {
          isActive: true,
          items,
          finalItemCheck,
          timeRemaining: 10,
          timerActive: true,
        },
      };
    });
  },

  /**
   * Select a gold answer for a component in the gold check modal.
   */
  selectGoldCheckAnswer: (componentIndex: number, selectedGold: number) => {
    set((state) => {
      const newItems = state.goldCheckState.items.map((item) =>
        item.componentIndex === componentIndex
          ? { ...item, selectedAnswer: selectedGold }
          : item
      );

      return {
        goldCheckState: {
          ...state.goldCheckState,
          items: newItems,
        },
      };
    });
  },

  /**
   * Select a gold answer for the final item (Level 10+).
   */
  selectFinalGoldAnswer: (selectedGold: number) => {
    set((state) => {
      if (!state.goldCheckState.finalItemCheck) return state;

      return {
        goldCheckState: {
          ...state.goldCheckState,
          finalItemCheck: {
            ...state.goldCheckState.finalItemCheck,
            selectedAnswer: selectedGold,
          },
        },
      };
    });
  },

  /**
   * Submit all gold check answers and validate.
   * Loses 1 life if any answer is wrong or unanswered.
   */
  submitGoldCheck: () => {
    set((state) => {
      if (!state.goldCheckState.isActive) return state;

      // Check all component answers
      let anyWrong = false;
      for (const item of state.goldCheckState.items) {
        if (item.selectedAnswer === null || item.selectedAnswer !== item.correctGold) {
          anyWrong = true;
          break;
        }
      }

      // Check final item answer if applicable
      if (!anyWrong && state.goldCheckState.finalItemCheck) {
        const final = state.goldCheckState.finalItemCheck;
        if (final.selectedAnswer === null || final.selectedAnswer !== final.correctGold) {
          anyWrong = true;
        }
      }

      // Reset gold check state
      const resetGoldCheckState: GoldCheckState = {
        isActive: false,
        items: [],
        finalItemCheck: null,
        timeRemaining: 10,
        timerActive: false,
      };

      if (anyWrong) {
        // Lose 1 life
        const newLives = Math.max(0, state.livesRemaining - 1) as 3 | 2 | 1 | 0;

        if (newLives === 0) {
          // Game over
          const newBest = Math.max(state.bestLevelReached, state.currentLevel);
          localStorage.setItem(STORAGE_KEY_BEST_LEVEL, newBest.toString());

          return {
            livesRemaining: 0,
            gameStatus: 'gameover' as const,
            bestLevelReached: newBest,
            goldCheckState: resetGoldCheckState,
          };
        }

        // Continue but lost a life
        return {
          livesRemaining: newLives,
          levelComplete: true,
          goldCheckState: resetGoldCheckState,
        };
      }

      // All correct!
      return {
        levelComplete: true,
        goldCheckState: resetGoldCheckState,
      };
    });
  },

  /**
   * Decrement the gold check modal timer by one second.
   */
  decrementGoldCheckTimer: () => {
    set((state) => {
      if (!state.goldCheckState.timerActive || state.goldCheckState.timeRemaining <= 0) {
        return state;
      }

      return {
        goldCheckState: {
          ...state.goldCheckState,
          timeRemaining: state.goldCheckState.timeRemaining - 1,
        },
      };
    });
  },

  /**
   * Handle gold check timer expiration.
   * Auto-submits answers (unanswered count as wrong).
   */
  handleGoldCheckTimerExpire: () => {
    // Just call submitGoldCheck - it handles unanswered as wrong
    useGameStore.getState().submitGoldCheck();
  },
}));

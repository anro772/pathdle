/**
 * Central game state management using Zustand.
 * Manages all game state including modes, level progression, player input,
 * timer, scoring and component trees.
 */

import { create } from 'zustand';
import type {
  ComponentNode,
  DifficultySettings,
  GameMode,
  GameStatus,
  ItemData,
  LevelOutcome,
} from '../types/items';
import { getItems } from '../services/RiotService';
import { getMeta, type MetaSnapshot } from '../services/MetaService';
import { filterItems, getRandomItemId, type ItemPools } from '../utils/itemFilters';
import {
  buildComponentTree,
  collectAllBaseComponents,
  getNodeAtPath,
  getRequiredItems,
  sameItems,
} from '../utils/recipeEngine';
import { generateBuyAllGrid, generateShopGrid } from '../utils/shopGridGenerator';
import { DAILY_LEVELS, EPIC_LEVELS, getDifficultySettings } from '../utils/difficultySettings';
import { computeLevelScore, type LevelScore } from '../utils/scoring';
import { getDailyKey, seededRng, shuffle, type Rng } from '../utils/seededRandom';
import {
  getBests,
  getDailyResult,
  saveBests,
  saveDailyResult,
  type PersonalBests,
  getCodex,
  getLifetime,
  getUnlockedAchievements,
  saveCodex,
  saveLifetime,
  saveUnlockedAchievements,
} from '../utils/storage';
import {
  applyLevel,
  applyRunEnd,
  findNewAchievements,
  type LifetimeStats,
} from '../utils/progress';
import { CHAMPION_BONUS_POINTS } from '../utils/championQuiz';
import { parseItemDescription } from '../utils/itemText';

// ============================================================================
// Constants
// ============================================================================

export const MAX_LIVES = 3;

/** Seconds to answer the gold check: a base plus some per question */
const GOLD_CHECK_BASE_SECONDS = 6;
const GOLD_CHECK_SECONDS_PER_QUESTION = 3;
const GOLD_CHECK_SECONDS = GOLD_CHECK_BASE_SECONDS + GOLD_CHECK_SECONDS_PER_QUESTION;

/** Gold check time for a number of questions (9s for 1, 18s for 4) */
export function goldCheckSeconds(questions: number): number {
  return GOLD_CHECK_BASE_SECONDS + GOLD_CHECK_SECONDS_PER_QUESTION * Math.max(1, questions);
}

/** Practice pool filters: all targets, one pool, or a DataDragon tag */
export type PracticeFilter = 'all' | 'epic' | 'legendary' | string;

// ============================================================================
// Gold Check Types
// ============================================================================

/**
 * Represents a single gold check item in the modal.
 * Each item corresponds to a Row 2 component.
 */
export interface GoldCheckItem {
  /** Index in Row 2 (targetItem.children) */
  componentIndex: number;
  /** DataDragon item ID */
  itemId: string;
  /** Display name of the item */
  itemName: string;
  /** Correct total cost of the item (ComponentNode.totalCost) */
  correctGold: number;
  /** Two options: [correct, wrong] shuffled */
  options: [number, number];
  /** Player's selected answer (null if not answered) */
  selectedAnswer: number | null;
}

/**
 * State for the gold check modal that appears after purchasing all components.
 */
export interface GoldCheckState {
  /** Whether the gold check modal is currently active */
  isActive: boolean;
  /** Array of gold check items (Row 2 components) */
  items: GoldCheckItem[];
  /** Final item gold check (uses totalCost) */
  finalItemCheck: {
    correctGold: number;
    options: [number, number];
    selectedAnswer: number | null;
  } | null;
  /** Seconds remaining */
  timeRemaining: number;
  /** Whether the modal timer is actively counting down */
  timerActive: boolean;
}

/** Result of a finished level, shown on the level-complete card */
export interface LevelResult {
  outcome: LevelOutcome;
  score: LevelScore;
  timedOut: boolean;
  revealed: boolean;
  goldCheck: 'passed' | 'failed' | null;
  buyAll: boolean;
  /** True on the last level of a Daily run */
  isFinalLevel: boolean;
  /** First perfect build of this item (added to the Codex) */
  newCodexEntry: boolean;
  /** Finished item that no Challenger player built in the snapshot */
  hiddenGem: boolean;
}

/** One finished level of the current run (for the game-over recap) */
export interface RunEntry {
  tree: ComponentNode;
  outcome: LevelOutcome;
}

/** Peeks (reveal a hidden component's identity) per Endless or Daily run */
export const PEEKS_PER_RUN = 1;

/** Short-lived message for the toast (wrong answer, smart assignment...) */
export interface Feedback {
  id: number;
  kind: 'wrong' | 'correct' | 'info';
  message: string;
  /** Items to show in the toast (e.g. the correct recipe) */
  itemIds?: string[];
}

const EMPTY_GOLD_CHECK: GoldCheckState = {
  isActive: false,
  items: [],
  finalItemCheck: null,
  timeRemaining: GOLD_CHECK_SECONDS,
  timerActive: false,
};

/**
 * Complete game state interface.
 */
export interface GameState {
  // Game status
  mode: GameMode;
  gameStatus: GameStatus;
  loadError: string | null;
  currentLevel: number;
  livesRemaining: number;
  settings: DifficultySettings;

  // Current challenge
  targetItem: ComponentNode | null;
  /** Path to the focused Row 2 slot ([] when nothing is focused) */
  focusedComponentPath: number[];
  /** Completed component paths stored as stringified paths (e.g., "0") */
  unlockedComponents: Set<string>;
  /** Component paths that were answered incorrectly (red X) */
  failedComponents: Set<string>;
  /** Row 2 index -> number of stat lines revealed by hints */
  hintsShown: Map<number, number>;
  /** Hints used this level (each costs points) */
  hintsUsed: number;
  /** Row 2 indices whose identity was revealed by Peek */
  revealedComponents: Set<number>;
  /** Whether the player is buying every base component at once */
  isBuyAllMode: boolean;
  /** Item IDs shown in the shop for the current focus */
  shopGrid: string[];

  // Player input
  selectedItems: string[];

  // Timer
  timeRemaining: number;
  timerActive: boolean;

  // Level progress
  lostLifeThisLevel: boolean;
  usedBuyAll: boolean;
  secondsLeftAtFinish: number;
  levelComplete: boolean;
  levelResult: LevelResult | null;
  goldCheckState: GoldCheckState;

  // Run progress
  score: number;
  streak: number;
  outcomes: LevelOutcome[];
  usedTargets: string[];
  dailyKey: string | null;
  dailyTargets: string[] | null;
  practiceFilter: PracticeFilter;

  // Records
  bests: PersonalBests;
  /** Bests when the run started (to detect new records) */
  bestsAtStart: PersonalBests;

  feedback: Feedback | null;

  // Extras
  /** Finished levels of this run */
  runHistory: RunEntry[];
  /** Peeks left this run (reveal a hidden component's identity) */
  peeksLeft: number;
  /** Whether the "Who builds this?" bonus was answered this level */
  bonusClaimed: boolean;
  /** Practice: specific item to play next (from the Codex) */
  practiceTarget: string | null;
  /** Item IDs built perfectly at least once */
  codex: string[];
  lifetime: LifetimeStats;
  unlockedAchievements: string[];
  /** Newly unlocked achievement IDs waiting to be shown */
  achievementQueue: string[];

  // Data pools
  allItems: Record<string, ItemData> | null;
  pools: ItemPools | null;
  /** Alias of pools.basicComponents (shop distractors) */
  basicComponents: Record<string, ItemData> | null;
  dataVersion: string | null;
  meta: MetaSnapshot | null;

  // Actions
  startGame: (mode: GameMode, options?: { practiceTarget?: string }) => Promise<void>;
  focusComponent: (path: number[]) => void;
  toggleBuyAll: () => void;
  cycleFocus: (direction: 1 | -1) => void;
  selectShopItem: (itemId: string) => void;
  removeCartItem: (slotIndex: number) => void;
  removeLastCartItem: () => void;
  submitPurchase: () => void;
  tick: () => void;
  selectGoldCheckAnswer: (componentIndex: number, selectedGold: number) => void;
  selectFinalGoldAnswer: (selectedGold: number) => void;
  submitGoldCheck: () => void;
  proceedToNextLevel: () => void;
  revealAnswer: () => void;
  skipLevel: () => void;
  setPracticeFilter: (filter: PracticeFilter) => void;
  quitToMenu: () => void;
  dismissFeedback: () => void;
  /** Answer the "Who builds this?" bonus (+50 when correct) */
  claimChampionBonus: (correct: boolean) => void;
  /** Reveal the identity of the focused hidden component */
  peek: () => void;
  /** Reveal one more stat line of the focused hidden component */
  hint: () => void;
  dismissAchievement: () => void;
  /** Loads item data + meta into the store without starting a game (for the Codex) */
  loadData: () => Promise<void>;
}

// ============================================================================
// Helper Functions
// ============================================================================

let feedbackId = 0;

function makeFeedback(kind: Feedback['kind'], message: string, itemIds?: string[]): Feedback {
  return { id: ++feedbackId, kind, message, itemIds };
}

/** Random source: seeded for the Daily (identical for everyone), Math.random otherwise */
function rngFor(state: Pick<GameState, 'mode' | 'dailyKey'>, ...parts: Array<string | number>): Rng {
  return state.mode === 'daily' && state.dailyKey ? seededRng(state.dailyKey, ...parts) : Math.random;
}

/** A plausible wrong gold value near the correct one */
function wrongGoldOption(correct: number, offsets: number[], rng: Rng): number {
  const offset = offsets[Math.floor(rng() * offsets.length)];
  const lower = correct - offset;
  return rng() > 0.5 || lower <= 0 ? correct + offset : lower;
}

function shuffledPair(correct: number, wrong: number, rng: Rng): [number, number] {
  return rng() > 0.5 ? [correct, wrong] : [wrong, correct];
}

/** The pool of targets for a practice filter */
function practicePool(pools: ItemPools, filter: PracticeFilter): Record<string, ItemData> {
  if (filter === 'epic') return pools.epics;
  if (filter === 'legendary') return pools.legendaries;

  const all = { ...pools.epics, ...pools.legendaries };
  if (filter === 'all') return all;

  const tagged = Object.fromEntries(Object.entries(all).filter(([, item]) => item.tags.includes(filter)));
  return Object.keys(tagged).length > 0 ? tagged : all;
}

/** Picks the 10 Daily targets: 3 epics then 7 legendaries, same for everyone on that day */
export function pickDailyTargets(pools: ItemPools, dailyKey: string): string[] {
  const rng = seededRng(dailyKey, 'targets');
  const epics = shuffle(Object.keys(pools.epics).sort(), rng).slice(0, EPIC_LEVELS);
  const legendaries = shuffle(Object.keys(pools.legendaries).sort(), rng).slice(0, DAILY_LEVELS - EPIC_LEVELS);
  return [...epics, ...legendaries];
}

function pickTarget(state: GameState, level: number, settings: DifficultySettings): string {
  const pools = state.pools!;
  if (state.mode === 'daily' && state.dailyTargets) {
    return state.dailyTargets[level - 1];
  }
  if (state.mode === 'practice') {
    if (state.practiceTarget && state.allItems?.[state.practiceTarget]) return state.practiceTarget;
    return getRandomItemId(practicePool(pools, state.practiceFilter), state.usedTargets.slice(-30));
  }
  const pool = settings.pool === 'epic' ? pools.epics : pools.legendaries;
  return getRandomItemId(pool, state.usedTargets);
}

/** Index of the next locked Row 2 slot, searching forward from `from` (wrapping) */
function nextLockedIndex(target: ComponentNode, unlocked: Set<string>, from: number, direction: 1 | -1 = 1): number | null {
  const n = target.children.length;
  for (let step = 0; step < n; step++) {
    const index = (((from + step * direction) % n) + n) % n;
    if (!unlocked.has(String(index))) return index;
  }
  return null;
}

/** State changes for focusing a Row 2 slot (clears the cart, builds the shop) */
function focusPartial(state: GameState, path: number[]): Partial<GameState> {
  const target = state.targetItem!;
  const node = getNodeAtPath(target, path);
  if (!node || path.length === 0) {
    return { focusedComponentPath: [], selectedItems: [], isBuyAllMode: false, shopGrid: [] };
  }

  return {
    focusedComponentPath: path,
    selectedItems: [],
    isBuyAllMode: false,
    shopGrid: generateShopGrid(
      node,
      state.allItems!,
      state.basicComponents!,
      undefined,
      rngFor(state, state.currentLevel, 'shop', path.join(','))
    ),
  };
}

/** Saves Daily progress so a refresh can resume (or end) the run */
function persistDaily(state: GameState, extra: { finished: boolean; inProgressLevel?: number }): void {
  if (state.mode !== 'daily' || !state.dailyKey) return;
  const previous = getDailyResult(state.dailyKey);
  saveDailyResult(state.dailyKey, {
    score: state.score,
    outcomes: state.outcomes,
    lives: state.livesRemaining,
    streak: state.streak,
    finished: extra.finished,
    inProgressLevel: extra.inProgressLevel,
    submitted: previous?.submitted,
  });
}

// ============================================================================
// Store
// ============================================================================

const initialBests = getBests();

/**
 * Zustand store hook for game state management.
 *
 * @example
 * const { gameStatus, currentLevel, startGame } = useGameStore();
 */
export const useGameStore = create<GameState>((set, get) => {
  /** Sets up a level: picks the target, builds the tree and auto-focuses the first slot */
  function startLevel(level: number, overrides: Partial<GameState> = {}): void {
    const state = { ...get(), ...overrides, currentLevel: level };
    const settings = getDifficultySettings(level, state.mode);
    const targetId = pickTarget(state, level, settings);
    const tree = buildComponentTree(targetId, state.allItems!);

    const levelState: GameState = {
      ...state,
      settings,
      targetItem: tree,
      unlockedComponents: new Set<string>(),
      failedComponents: new Set<string>(),
    };

    set({
      ...overrides,
      gameStatus: 'playing',
      currentLevel: level,
      settings,
      targetItem: tree,
      hintsShown: new Map<number, number>(),
      hintsUsed: 0,
      revealedComponents: new Set<number>(),
      unlockedComponents: new Set<string>(),
      failedComponents: new Set<string>(),
      usedTargets: [...state.usedTargets, targetId],
      timeRemaining: settings.timerDuration,
      timerActive: settings.timerDuration > 0,
      lostLifeThisLevel: false,
      usedBuyAll: false,
      secondsLeftAtFinish: 0,
      levelComplete: false,
      levelResult: null,
      goldCheckState: EMPTY_GOLD_CHECK,
      feedback: null,
      bonusClaimed: false,
      practiceTarget: null,
      ...focusPartial(levelState, [0]),
    });

    persistDaily(get(), { finished: false, inProgressLevel: level });
  }

  /** Saves lifetime stats / codex and queues any newly unlocked achievements */
  function recordProgress(lifetime: LifetimeStats, codex: string[] = get().codex): void {
    const state = get();
    const codexTotal = state.pools
      ? Object.keys(state.pools.epics).length + Object.keys(state.pools.legendaries).length
      : 0;
    const unlocked = findNewAchievements(
      { stats: lifetime, codexCount: codex.length, codexTotal },
      state.unlockedAchievements
    ).map(a => a.id);

    saveLifetime(lifetime);
    saveCodex(codex);
    if (unlocked.length > 0) saveUnlockedAchievements([...state.unlockedAchievements, ...unlocked]);

    set({
      lifetime,
      codex,
      unlockedAchievements: [...state.unlockedAchievements, ...unlocked],
      achievementQueue: [...state.achievementQueue, ...unlocked],
    });
  }

  /** Ends the run: saves records and shows the game-over screen */
  function endRun(partial: Partial<GameState> = {}): void {
    set(partial);
    const state = get();

    if (state.mode !== 'practice') {
      recordProgress(applyRunEnd(state.lifetime, { mode: state.mode, level: state.currentLevel, outcomes: state.outcomes }));
    }

    if (state.mode === 'endless') {
      const bests: PersonalBests = {
        endlessLevel: Math.max(state.bests.endlessLevel, state.currentLevel),
        endlessScore: Math.max(state.bests.endlessScore, state.score),
      };
      saveBests(bests);
      set({ bests });
    }

    persistDaily(state, { finished: true });

    set({
      gameStatus: 'gameover',
      timerActive: false,
      goldCheckState: EMPTY_GOLD_CHECK,
      levelComplete: false,
    });
  }

  /** Records a finished level and shows the level-complete card */
  function finishLevel(opts: { timedOut?: boolean; revealed?: boolean; goldCheck?: 'passed' | 'failed' | null; goldAnswersCorrect?: number }): void {
    const state = get();
    const outcome: LevelOutcome = opts.timedOut || opts.revealed
      ? 'failed'
      : state.lostLifeThisLevel ? 'mistake' : 'perfect';

    const score = computeLevelScore({
      outcome,
      secondsLeft: opts.timedOut ? 0 : state.secondsLeftAtFinish,
      goldAnswersCorrect: opts.goldAnswersCorrect ?? 0,
      buyAll: state.usedBuyAll,
      previousStreak: state.streak,
      hintsUsed: state.mode === 'practice' ? 0 : state.hintsUsed,
    });

    const isPractice = state.mode === 'practice';
    const target = state.targetItem!;
    const isLegendary = !!state.pools?.legendaries[target.itemId];
    const hiddenGem = outcome !== 'failed' && isLegendary && !!state.meta && !state.meta.items[target.itemId];
    const newCodexEntry = outcome === 'perfect' && !state.codex.includes(target.itemId);

    set({
      timerActive: false,
      focusedComponentPath: [],
      isBuyAllMode: false,
      selectedItems: [],
      goldCheckState: EMPTY_GOLD_CHECK,
      levelComplete: true,
      score: isPractice ? state.score : state.score + score.total,
      streak: isPractice ? state.streak : score.streak,
      outcomes: [...state.outcomes, outcome],
      levelResult: {
        outcome,
        score,
        timedOut: !!opts.timedOut,
        revealed: !!opts.revealed,
        goldCheck: opts.goldCheck ?? null,
        buyAll: state.usedBuyAll,
        isFinalLevel: state.mode === 'daily' && state.currentLevel >= DAILY_LEVELS,
        newCodexEntry,
        hiddenGem,
      },
      runHistory: [...state.runHistory, { tree: target, outcome }],
    });

    persistDaily(get(), { finished: false });

    recordProgress(
      applyLevel(state.lifetime, {
        mode: state.mode,
        outcome,
        buyAll: state.usedBuyAll,
        goldCheckPassed: opts.goldCheck === 'passed',
        secondsUsed: state.settings.timerDuration - state.secondsLeftAtFinish,
        streak: score.streak,
        hiddenGem,
      }),
      newCodexEntry ? [...state.codex, target.itemId] : state.codex
    );
  }

  /**
   * Deducts a life. Returns true if that ended the run (the caller must stop).
   * The current level is recorded as failed when the run ends.
   */
  function loseLife(partial: Partial<GameState> = {}): boolean {
    const state = get();
    const lives = Math.max(0, state.livesRemaining - 1);

    if (lives === 0) {
      endRun({
        ...partial,
        livesRemaining: 0,
        lostLifeThisLevel: true,
        outcomes: [...state.outcomes, 'failed'],
        runHistory: state.targetItem
          ? [...state.runHistory, { tree: state.targetItem, outcome: 'failed' }]
          : state.runHistory,
      });
      return true;
    }

    set({ ...partial, livesRemaining: lives, lostLifeThisLevel: true });
    return false;
  }

  /** Called when every Row 2 slot is unlocked: gold check or finish */
  function onAllUnlocked(): void {
    const state = get();
    set({
      timerActive: false,
      secondsLeftAtFinish: state.timeRemaining,
      focusedComponentPath: [],
      isBuyAllMode: false,
      selectedItems: [],
      shopGrid: [],
    });

    if (state.settings.goldChecks > 0) {
      initiateGoldCheck();
    } else {
      finishLevel({});
    }
  }

  /** Builds the gold check questions for the current level */
  function initiateGoldCheck(): void {
    const state = get();
    const target = state.targetItem!;
    const rng = rngFor(state, state.currentLevel, 'gold');

    // Prefer components with a recipe: basic item prices are printed in the shop
    const withCost = target.children
      .map((node, index) => ({ node, index }))
      .filter(({ node }) => node.totalCost > 0);
    const withRecipe = withCost.filter(({ node }) => node.children.length > 0);
    const eligible = withRecipe.length > 0 ? withRecipe : withCost;

    if (eligible.length === 0 && !state.settings.finalGoldCheck) {
      finishLevel({});
      return;
    }

    const selected = shuffle([...eligible], rng).slice(0, state.settings.goldChecks);

    const items: GoldCheckItem[] = selected
      .sort((a, b) => a.index - b.index)
      .map(({ index, node }) => {
        const correctGold = node.totalCost;
        const wrongGold = wrongGoldOption(correctGold, [50, 100, 150, 200, 250, 300], rng);
        return {
          componentIndex: index,
          itemId: node.itemId,
          itemName: node.itemName,
          correctGold,
          options: shuffledPair(correctGold, wrongGold, rng),
          selectedAnswer: null,
        };
      });

    let finalItemCheck: GoldCheckState['finalItemCheck'] = null;
    if (state.settings.finalGoldCheck) {
      const correctGold = target.totalCost;
      const wrongGold = wrongGoldOption(correctGold, [100, 200, 300, 400, 500], rng);
      finalItemCheck = { correctGold, options: shuffledPair(correctGold, wrongGold, rng), selectedAnswer: null };
    }

    set({
      timerActive: false,
      goldCheckState: {
        isActive: true,
        items,
        finalItemCheck,
        timeRemaining: goldCheckSeconds(items.length + (finalItemCheck ? 1 : 0)),
        timerActive: true,
      },
    });
  }

  /** Timer ran out: lose a life, reveal the rest, level failed */
  function handleTimeout(): void {
    const state = get();
    const target = state.targetItem;
    if (!target) return;

    const unlocked = new Set(state.unlockedComponents);
    const failed = new Set(state.failedComponents);
    target.children.forEach((_, index) => {
      const key = String(index);
      if (!unlocked.has(key)) {
        unlocked.add(key);
        failed.add(key);
      }
    });

    const partial: Partial<GameState> = {
      timerActive: false,
      timeRemaining: 0,
      unlockedComponents: unlocked,
      failedComponents: failed,
      feedback: makeFeedback('wrong', "Time's up!"),
    };

    if (loseLife(partial)) return;
    finishLevel({ timedOut: true });
  }

  return {
    // ==========================================================================
    // Initial State Values
    // ==========================================================================

    mode: 'endless',
    gameStatus: 'menu',
    loadError: null,
    currentLevel: 1,
    livesRemaining: MAX_LIVES,
    settings: getDifficultySettings(1),

    targetItem: null,
    focusedComponentPath: [],
    unlockedComponents: new Set<string>(),
    failedComponents: new Set<string>(),
    hintsShown: new Map<number, number>(),
    hintsUsed: 0,
    revealedComponents: new Set<number>(),
    isBuyAllMode: false,
    shopGrid: [],

    selectedItems: [],

    timeRemaining: 0,
    timerActive: false,

    lostLifeThisLevel: false,
    usedBuyAll: false,
    secondsLeftAtFinish: 0,
    levelComplete: false,
    levelResult: null,
    goldCheckState: EMPTY_GOLD_CHECK,

    score: 0,
    streak: 0,
    outcomes: [],
    usedTargets: [],
    dailyKey: null,
    dailyTargets: null,
    practiceFilter: 'all',

    bests: initialBests,
    bestsAtStart: initialBests,

    feedback: null,

    runHistory: [],
    peeksLeft: 0,
    bonusClaimed: false,
    practiceTarget: null,
    codex: getCodex(),
    lifetime: getLifetime(),
    unlockedAchievements: getUnlockedAchievements(),
    achievementQueue: [],

    allItems: null,
    pools: null,
    basicComponents: null,
    dataVersion: null,
    meta: null,

    // ==========================================================================
    // Action Implementations
    // ==========================================================================

    /**
     * Start a new run in the given mode.
     * Daily runs resume where they left off (a level abandoned mid-way counts as failed).
     */
    startGame: async (mode: GameMode, options: { practiceTarget?: string } = {}) => {
      set({ gameStatus: 'loading', loadError: null });

      try {
        const [itemsResponse, meta] = await Promise.all([getItems(), getMeta()]);
        const pools = filterItems(itemsResponse.data);
        const dailyKey = mode === 'daily' ? getDailyKey() : null;

        const base: Partial<GameState> = {
          mode,
          livesRemaining: MAX_LIVES,
          score: 0,
          streak: 0,
          outcomes: [],
          usedTargets: [],
          runHistory: [],
          peeksLeft: mode === 'practice' ? Infinity : PEEKS_PER_RUN,
          practiceTarget: options.practiceTarget ?? null,
          dailyKey,
          dailyTargets: dailyKey ? pickDailyTargets(pools, dailyKey) : null,
          bestsAtStart: get().bests,
          allItems: itemsResponse.data,
          pools,
          basicComponents: pools.basicComponents,
          dataVersion: itemsResponse.version,
          meta,
        };

        if (dailyKey) {
          const saved = getDailyResult(dailyKey);
          if (saved?.finished) {
            set({ ...base, gameStatus: 'menu' });
            return;
          }
          if (saved) {
            const outcomes = [...saved.outcomes];
            let lives = saved.lives ?? MAX_LIVES;
            // Leaving mid-level forfeits that level
            if (saved.inProgressLevel && saved.inProgressLevel > outcomes.length) {
              outcomes.push('failed');
              lives -= 1;
            }
            Object.assign(base, {
              outcomes,
              livesRemaining: lives,
              score: saved.score,
              streak: lives < (saved.lives ?? MAX_LIVES) ? 0 : saved.streak ?? 0,
            });
            if (lives <= 0 || outcomes.length >= DAILY_LEVELS) {
              set({ ...base, currentLevel: outcomes.length });
              endRun({ livesRemaining: Math.max(0, lives) });
              return;
            }
            startLevel(outcomes.length + 1, base);
            return;
          }
        }

        startLevel(1, base);
      } catch (error) {
        console.error('Failed to start game:', error);
        set({
          gameStatus: 'menu',
          loadError: error instanceof Error ? error.message : 'Failed to load game data',
        });
      }
    },

    /**
     * Focus a Row 2 slot (clears the cart and pre-fills hint items).
     */
    focusComponent: (path: number[]) => {
      const state = get();
      if (!state.targetItem || state.levelComplete || state.goldCheckState.isActive) return;
      if (path.length > 0 && state.unlockedComponents.has(path.join(','))) return;
      set(focusPartial(state, path));
    },

    /**
     * Toggle "Buy All" mode: buy every base component of the target at once.
     */
    toggleBuyAll: () => {
      const state = get();
      if (!state.targetItem || state.levelComplete || state.goldCheckState.isActive) return;

      if (state.isBuyAllMode) {
        const next = nextLockedIndex(state.targetItem, state.unlockedComponents, 0);
        set(focusPartial(state, next === null ? [] : [next]));
        return;
      }

      // Buy All only makes sense before anything is bought
      if (state.unlockedComponents.size > 0) {
        set({ feedback: makeFeedback('info', 'Buy All is only available before your first purchase') });
        return;
      }

      set({
        isBuyAllMode: true,
        focusedComponentPath: [],
        selectedItems: [],
        shopGrid: generateBuyAllGrid(
          state.targetItem,
          state.allItems!,
          state.basicComponents!,
          undefined,
          rngFor(state, state.currentLevel, 'shop', 'all')
        ),
      });
    },

    /**
     * Move focus to the next/previous locked Row 2 slot.
     */
    cycleFocus: (direction: 1 | -1) => {
      const state = get();
      if (!state.targetItem || state.levelComplete) return;
      const current = state.focusedComponentPath[0] ?? -direction;
      const next = nextLockedIndex(state.targetItem, state.unlockedComponents, current + direction, direction);
      if (next !== null) set(focusPartial(state, [next]));
    },

    /**
     * Add an item from the shop to the cart (allows duplicates, capped at cart size).
     */
    selectShopItem: (itemId: string) => {
      const state = get();
      const cartSize = getCartSize(state);
      if (cartSize === 0 || state.selectedItems.length >= cartSize) return;
      set({ selectedItems: [...state.selectedItems, itemId] });
    },

    /**
     * Remove a cart item.
     */
    removeCartItem: (slotIndex: number) => {
      const state = get();
      if (slotIndex < 0 || slotIndex >= state.selectedItems.length) return;
      const selectedItems = [...state.selectedItems];
      selectedItems.splice(slotIndex, 1);
      set({ selectedItems });
    },

    removeLastCartItem: () => {
      const state = get();
      get().removeCartItem(state.selectedItems.length - 1);
    },

    /**
     * Validate and process the current purchase attempt.
     * Handles three cases:
     * 1. Buy All mode: player selected all base components for the entire item
     * 2. Correct items for the focused slot
     * 3. Smart assignment: the items match another locked slot instead
     */
    submitPurchase: () => {
      const state = get();
      const target = state.targetItem;
      if (!target || state.levelComplete || state.goldCheckState.isActive) return;
      if (state.selectedItems.length !== getCartSize(state)) return;

      const isPractice = state.mode === 'practice';

      // ======================================================================
      // Buy All mode
      // ======================================================================
      if (state.isBuyAllMode) {
        const required = collectAllBaseComponents(target);

        if (sameItems(state.selectedItems, required)) {
          set({
            unlockedComponents: new Set(target.children.map((_, i) => String(i))),
            usedBuyAll: true,
            feedback: makeFeedback('correct', 'Bought it all in one go!'),
          });
          onAllUnlocked();
          return;
        }

        if (isPractice) {
          set({
            selectedItems: [],
            feedback: makeFeedback('wrong', 'Not quite. Try again, or build it piece by piece.'),
          });
          return;
        }

        const all = new Set(target.children.map((_, i) => String(i)));
        const partial: Partial<GameState> = {
          unlockedComponents: all,
          failedComponents: new Set(all),
          feedback: makeFeedback('wrong', `${target.itemName} needs:`, required),
        };
        if (loseLife(partial)) return;
        onAllUnlocked();
        return;
      }

      // ======================================================================
      // Single slot
      // ======================================================================
      const focusedPath = state.focusedComponentPath;
      const focusedNode = getNodeAtPath(target, focusedPath);
      if (!focusedNode || focusedPath.length === 0) return;

      let unlockPath: number[] | null = sameItems(state.selectedItems, getRequiredItems(focusedNode))
        ? focusedPath
        : null;

      // Smart assignment: the cart matches another locked slot
      if (!unlockPath) {
        const otherIndex = target.children.findIndex((child, i) =>
          i !== focusedPath[0] &&
          !state.unlockedComponents.has(String(i)) &&
          sameItems(state.selectedItems, getRequiredItems(child))
        );
        if (otherIndex >= 0) unlockPath = [otherIndex];
      }

      if (unlockPath) {
        const unlocked = new Set(state.unlockedComponents);
        unlocked.add(unlockPath.join(','));
        set({
          unlockedComponents: unlocked,
          feedback: unlockPath !== focusedPath
            ? makeFeedback('correct', `That's ${target.children[unlockPath[0]].itemName}. Nice!`)
            : makeFeedback('correct', focusedNode.itemName),
        });
      } else if (isPractice) {
        set({
          selectedItems: [],
          feedback: makeFeedback('wrong', 'Not quite. Try again, or use a 💡 Hint!'),
        });
        return;
      } else {
        const key = focusedPath.join(',');
        const partial: Partial<GameState> = {
          unlockedComponents: new Set([...state.unlockedComponents, key]),
          failedComponents: new Set([...state.failedComponents, key]),
          feedback: focusedNode.children.length === 0
            ? makeFeedback('wrong', `You needed ${focusedNode.itemName}`, [focusedNode.itemId])
            : makeFeedback('wrong', `${focusedNode.itemName} is built from`, getRequiredItems(focusedNode)),
        };
        if (loseLife(partial)) return;
      }

      // Continue: next slot or level end
      const after = get();
      const next = nextLockedIndex(target, after.unlockedComponents, focusedPath[0] + 1);
      if (next === null) {
        onAllUnlocked();
      } else {
        set(focusPartial(after, [next]));
      }
    },

    /**
     * One-second timer tick (main timer or gold check timer).
     */
    tick: () => {
      const state = get();

      if (state.goldCheckState.timerActive) {
        const remaining = state.goldCheckState.timeRemaining - 1;
        set({ goldCheckState: { ...state.goldCheckState, timeRemaining: Math.max(0, remaining) } });
        if (remaining <= 0) get().submitGoldCheck();
        return;
      }

      if (!state.timerActive || state.levelComplete) return;

      const remaining = state.timeRemaining - 1;
      set({ timeRemaining: Math.max(0, remaining) });
      if (remaining <= 0) handleTimeout();
    },

    selectGoldCheckAnswer: (componentIndex: number, selectedGold: number) => {
      const { goldCheckState } = get();
      set({
        goldCheckState: {
          ...goldCheckState,
          items: goldCheckState.items.map(item =>
            item.componentIndex === componentIndex ? { ...item, selectedAnswer: selectedGold } : item
          ),
        },
      });
    },

    selectFinalGoldAnswer: (selectedGold: number) => {
      const { goldCheckState } = get();
      if (!goldCheckState.finalItemCheck) return;
      set({
        goldCheckState: {
          ...goldCheckState,
          finalItemCheck: { ...goldCheckState.finalItemCheck, selectedAnswer: selectedGold },
        },
      });
    },

    /**
     * Submit all gold check answers. Any wrong/unanswered question costs 1 life.
     */
    submitGoldCheck: () => {
      const { goldCheckState } = get();
      if (!goldCheckState.isActive) return;

      const answers = [
        ...goldCheckState.items.map(item => item.selectedAnswer === item.correctGold),
        ...(goldCheckState.finalItemCheck
          ? [goldCheckState.finalItemCheck.selectedAnswer === goldCheckState.finalItemCheck.correctGold]
          : []),
      ];
      const correct = answers.filter(Boolean).length;
      const passed = correct === answers.length;

      if (!passed) {
        const partial: Partial<GameState> = {
          goldCheckState: { ...goldCheckState, isActive: false, timerActive: false },
        };
        if (loseLife(partial)) return;
      }

      finishLevel({ goldCheck: passed ? 'passed' : 'failed', goldAnswersCorrect: correct });
    },

    /**
     * Continue after the level-complete card.
     */
    proceedToNextLevel: () => {
      const state = get();
      if (!state.levelComplete) return;

      if (state.levelResult?.isFinalLevel) {
        endRun();
        return;
      }
      startLevel(state.currentLevel + 1);
    },

    /**
     * Practice: show the full recipe and end the level.
     */
    revealAnswer: () => {
      const state = get();
      const target = state.targetItem;
      if (state.mode !== 'practice' || !target || state.levelComplete) return;

      const unlocked = new Set(state.unlockedComponents);
      const failed = new Set(state.failedComponents);
      target.children.forEach((_, i) => {
        const key = String(i);
        if (!unlocked.has(key)) {
          unlocked.add(key);
          failed.add(key);
        }
      });
      set({ unlockedComponents: unlocked, failedComponents: failed });
      finishLevel({ revealed: true });
    },

    /**
     * Practice: jump to another item.
     */
    skipLevel: () => {
      const state = get();
      if (state.mode !== 'practice') return;
      startLevel(state.currentLevel + 1);
    },

    /**
     * Practice: change the pool filter (takes effect immediately with a new item).
     */
    setPracticeFilter: (filter: PracticeFilter) => {
      set({ practiceFilter: filter });
      const state = get();
      if (state.mode === 'practice' && state.gameStatus === 'playing') {
        startLevel(state.currentLevel + 1);
      }
    },

    /**
     * Return to the menu. Daily progress is kept (the current level is forfeited).
     */
    quitToMenu: () => {
      set({
        gameStatus: 'menu',
        timerActive: false,
        levelComplete: false,
        levelResult: null,
        goldCheckState: EMPTY_GOLD_CHECK,
        targetItem: null,
        focusedComponentPath: [],
        selectedItems: [],
        shopGrid: [],
        feedback: null,
      });
    },

    dismissFeedback: () => set({ feedback: null }),

    claimChampionBonus: (correct: boolean) => {
      const state = get();
      if (!state.levelComplete || state.bonusClaimed || state.mode === 'practice') return;

      set({
        bonusClaimed: true,
        score: correct ? state.score + CHAMPION_BONUS_POINTS : state.score,
      });
      persistDaily(get(), { finished: false });
      if (correct) {
        recordProgress({ ...state.lifetime, championBonusCorrect: state.lifetime.championBonusCorrect + 1 });
      }
    },

    peek: () => {
      const state = get();
      const row2Index = state.focusedComponentPath[0];
      if (!state.targetItem || state.isBuyAllMode || row2Index === undefined || state.levelComplete) return;
      if (state.peeksLeft <= 0 || state.revealedComponents.has(row2Index)) return;

      const node = state.targetItem.children[row2Index];
      set({
        peeksLeft: state.peeksLeft - 1,
        revealedComponents: new Set([...state.revealedComponents, row2Index]),
        feedback: makeFeedback('info', `Peek: it's ${node.itemName}`, [node.itemId]),
      });
    },

    hint: () => {
      const state = get();
      const row2Index = state.focusedComponentPath[0];
      if (!state.targetItem || !state.allItems || state.isBuyAllMode || row2Index === undefined || state.levelComplete) return;

      const node = state.targetItem.children[row2Index];
      const shown = state.hintsShown.get(row2Index) ?? 0;
      if (shown >= getComponentStats(state.allItems, node.itemId).length) return;

      set({
        hintsShown: new Map(state.hintsShown).set(row2Index, shown + 1),
        hintsUsed: state.hintsUsed + 1,
      });
    },

    dismissAchievement: () => set(state => ({ achievementQueue: state.achievementQueue.slice(1) })),

    loadData: async () => {
      if (get().allItems) return;
      const [itemsResponse, meta] = await Promise.all([getItems(), getMeta()]);
      const pools = filterItems(itemsResponse.data);
      set({
        allItems: itemsResponse.data,
        pools,
        basicComponents: pools.basicComponents,
        dataVersion: itemsResponse.version,
        meta,
      });
    },
  };
});

/** Stat lines of an item, used as hints for hidden components (DataDragon order) */
export function getComponentStats(allItems: Record<string, ItemData>, itemId: string): string[] {
  const item = allItems[itemId];
  return item ? parseItemDescription(item.description).stats : [];
}

/**
 * How many items the player must select for the current focus.
 * Buy All: every base component. Atomic slot: the item itself. Otherwise: its direct children.
 */
export function getCartSize(state: Pick<GameState, 'targetItem' | 'isBuyAllMode' | 'focusedComponentPath'>): number {
  if (!state.targetItem) return 0;
  if (state.isBuyAllMode) return collectAllBaseComponents(state.targetItem).length;
  if (state.focusedComponentPath.length === 0) return 0;
  const node = getNodeAtPath(state.targetItem, state.focusedComponentPath);
  return node ? getRequiredItems(node).length : 0;
}

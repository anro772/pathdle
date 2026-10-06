import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadItems } from './helpers';
import { useGameStore, getCartSize, getComponentStats, goldCheckSeconds } from '../stores/useGameStore';
import { getNodeAtPath, getRequiredItems, collectAllBaseComponents } from '../utils/recipeEngine';

vi.mock('../services/RiotService', async () => {
  const { loadItems: load } = await import('./helpers');
  return {
    getItems: async () => load(),
    getItemImageUrl: () => '',
    getChampionIconUrl: () => '',
  };
});
vi.mock('../services/MetaService', () => ({ getMeta: async () => null }));

// Silence "unused" lint for the helper used inside the mock factory
void loadItems;

/** Buys the focused slot correctly */
function buyFocusedCorrectly() {
  const state = useGameStore.getState();
  const node = getNodeAtPath(state.targetItem, state.focusedComponentPath)!;
  getRequiredItems(node).forEach(id => useGameStore.getState().selectShopItem(id));
  useGameStore.getState().submitPurchase();
}

function clearLevel() {
  while (!useGameStore.getState().levelComplete && !useGameStore.getState().goldCheckState.isActive) {
    buyFocusedCorrectly();
  }
}

/** Answers an active gold check correctly */
function passGoldCheck() {
  const gold = useGameStore.getState().goldCheckState;
  if (!gold.isActive) return;
  gold.items.forEach(item => useGameStore.getState().selectGoldCheckAnswer(item.componentIndex, item.correctGold));
  if (gold.finalItemCheck) useGameStore.getState().selectFinalGoldAnswer(gold.finalItemCheck.correctGold);
  useGameStore.getState().submitGoldCheck();
}

function buyWrong() {
  const state = useGameStore.getState();
  // Avoid any item that is (part of) a slot's recipe: smart assignment would accept it
  const anyRequired = state.targetItem!.children.flatMap(child => getRequiredItems(child));
  const wrong = state.shopGrid.find(id => !anyRequired.includes(id))!;
  for (let i = state.selectedItems.length; i < getCartSize(state); i++) useGameStore.getState().selectShopItem(wrong);
  useGameStore.getState().submitPurchase();
}

beforeEach(() => {
  useGameStore.getState().quitToMenu();
});

describe('game store', () => {
  it('plays a perfect endless level with auto-focus and scoring', async () => {
    await useGameStore.getState().startGame('endless');
    let state = useGameStore.getState();
    expect(state.gameStatus).toBe('playing');
    expect(state.focusedComponentPath).toEqual([0]);
    expect(state.shopGrid).toHaveLength(16);
    expect(state.pools!.epics[state.targetItem!.itemId]).toBeDefined();

    clearLevel();
    state = useGameStore.getState();
    expect(state.levelResult?.outcome).toBe('perfect');
    expect(state.score).toBe(100 + 10 * state.settings.timerDuration);
    expect(state.outcomes).toEqual(['perfect']);

    state.proceedToNextLevel();
    expect(useGameStore.getState().currentLevel).toBe(2);
  });

  it('loses a life on a wrong purchase and reveals the slot', async () => {
    await useGameStore.getState().startGame('endless');
    buyWrong();

    const after = useGameStore.getState();
    expect(after.livesRemaining).toBe(2);
    expect(after.failedComponents.has('0')).toBe(true);
    expect(after.feedback?.kind).toBe('wrong');
  });

  it('ends the run after three timeouts', async () => {
    await useGameStore.getState().startGame('endless');
    for (let level = 0; level < 3; level++) {
      const duration = useGameStore.getState().settings.timerDuration;
      for (let i = 0; i < duration; i++) useGameStore.getState().tick();
      if (useGameStore.getState().gameStatus === 'playing') {
        expect(useGameStore.getState().levelResult?.timedOut).toBe(true);
        useGameStore.getState().proceedToNextLevel();
      }
    }
    const state = useGameStore.getState();
    expect(state.gameStatus).toBe('gameover');
    expect(state.outcomes).toEqual(['failed', 'failed', 'failed']);
    expect(state.score).toBe(0);
  });

  it('buy all unlocks everything with a bonus', async () => {
    await useGameStore.getState().startGame('endless');
    useGameStore.getState().toggleBuyAll();
    const state = useGameStore.getState();
    collectAllBaseComponents(state.targetItem!).forEach(id => useGameStore.getState().selectShopItem(id));
    useGameStore.getState().submitPurchase();
    const after = useGameStore.getState();
    expect(after.levelResult?.buyAll).toBe(true);
    expect(after.score).toBe(Math.round((100 + 10 * after.settings.timerDuration) * 1.5));
  });

  it('runs gold checks from level 6', async () => {
    await useGameStore.getState().startGame('endless');
    for (let level = 1; level < 6; level++) {
      clearLevel();
      useGameStore.getState().proceedToNextLevel();
    }
    expect(useGameStore.getState().currentLevel).toBe(6);
    clearLevel();
    const gold = useGameStore.getState().goldCheckState;
    expect(gold.isActive).toBe(true);
    expect(gold.items).toHaveLength(1);
    passGoldCheck();
    const state = useGameStore.getState();
    expect(state.levelResult).toMatchObject({ outcome: 'perfect', goldCheck: 'passed' });
    expect(state.levelResult?.score.goldBonus).toBe(50);
  });

  it('gives the gold check 3 seconds per question (18s for 4 questions at level 10)', async () => {
    await useGameStore.getState().startGame('endless');
    for (let level = 1; level < 6; level++) {
      clearLevel();
      useGameStore.getState().proceedToNextLevel();
    }
    clearLevel();
    expect(useGameStore.getState().goldCheckState.timeRemaining).toBe(goldCheckSeconds(1));
    expect(goldCheckSeconds(1)).toBe(9);

    passGoldCheck();
    for (let level = 7; level < 10; level++) {
      useGameStore.getState().proceedToNextLevel();
      clearLevel();
      passGoldCheck();
    }
    useGameStore.getState().proceedToNextLevel();
    expect(useGameStore.getState().currentLevel).toBe(10);
    clearLevel();
    const gold = useGameStore.getState().goldCheckState;
    const questions = gold.items.length + (gold.finalItemCheck ? 1 : 0);
    expect(gold.finalItemCheck).not.toBeNull();
    expect(gold.timeRemaining).toBe(6 + 3 * questions);
    expect(goldCheckSeconds(4)).toBe(18);
  });

  it('adds 5 seconds for a correct component, capped at the level time', async () => {
    await useGameStore.getState().startGame('endless');
    useGameStore.setState({ timeRemaining: 10 });
    buyFocusedCorrectly();
    expect(useGameStore.getState().timeRemaining).toBe(15);

    // Never above the full 30s (keeps the leaderboard score cap valid)
    await useGameStore.getState().startGame('endless');
    useGameStore.setState({ timeRemaining: 28 });
    buyFocusedCorrectly();
    expect(useGameStore.getState().timeRemaining).toBe(30);

    // Wrong answers give nothing
    await useGameStore.getState().startGame('endless');
    useGameStore.setState({ timeRemaining: 10 });
    buyWrong();
    expect(useGameStore.getState().timeRemaining).toBe(10);
  });

  it('gives no time bonus in practice (no timer)', async () => {
    await useGameStore.getState().startGame('practice');
    buyFocusedCorrectly();
    expect(useGameStore.getState().timeRemaining).toBe(0);
  });

  it('a failed gold check costs a life but clears the level', async () => {
    await useGameStore.getState().startGame('endless');
    for (let level = 1; level < 6; level++) {
      clearLevel();
      useGameStore.getState().proceedToNextLevel();
    }
    clearLevel();
    useGameStore.getState().submitGoldCheck(); // nothing answered
    const state = useGameStore.getState();
    expect(state.livesRemaining).toBe(2);
    expect(state.levelResult).toMatchObject({ outcome: 'mistake', goldCheck: 'failed' });
  });

  it('gives everyone the same daily, ending after 10 levels', async () => {
    await useGameStore.getState().startGame('daily');
    const first = useGameStore.getState();
    const targets = first.dailyTargets!;
    const grid = first.shopGrid;
    const key = first.dailyKey;
    useGameStore.getState().quitToMenu();
    // Fresh attempt (no localStorage in node, so nothing is resumed)
    await useGameStore.getState().startGame('daily');
    expect(useGameStore.getState().dailyKey).toBe(key);
    expect(useGameStore.getState().dailyTargets).toEqual(targets);
    expect(useGameStore.getState().shopGrid).toEqual(grid);

    for (let level = 1; level <= 10; level++) {
      expect(useGameStore.getState().targetItem!.itemId).toBe(targets[level - 1]);
      clearLevel();
      passGoldCheck();
      useGameStore.getState().proceedToNextLevel();
    }
    const state = useGameStore.getState();
    expect(state.gameStatus).toBe('gameover');
    expect(state.outcomes).toHaveLength(10);
    expect(state.outcomes.every(o => o === 'perfect')).toBe(true);
  });

  it('lets practice retry wrong answers without losing lives', async () => {
    useGameStore.getState().setPracticeFilter('legendary');
    await useGameStore.getState().startGame('practice');
    const state = useGameStore.getState();
    expect(state.timerActive).toBe(false);
    expect(state.pools!.legendaries[state.targetItem!.itemId]).toBeDefined();

    buyWrong();

    const after = useGameStore.getState();
    expect(after.livesRemaining).toBe(3);
    expect(after.unlockedComponents.size).toBe(0);
    expect(after.selectedItems).toEqual([]);

    after.revealAnswer();
    expect(useGameStore.getState().levelResult?.revealed).toBe(true);
  });
});

describe('extras', () => {
  it('records run history and adds perfect builds to the codex', async () => {
    await useGameStore.getState().startGame('endless');
    const id = useGameStore.getState().targetItem!.itemId;
    clearLevel();
    const state = useGameStore.getState();
    expect(state.runHistory.map(r => r.tree.itemId)).toEqual([id]);
    expect(state.codex).toContain(id);
    expect(state.lifetime.levelsCleared).toBeGreaterThan(0);
    expect(state.unlockedAchievements).toContain('first-blood');
  });

  it('starts every slot hidden with an empty cart', async () => {
    await useGameStore.getState().startGame('endless');
    const state = useGameStore.getState();
    expect(state.selectedItems).toEqual([]);
    expect(state.revealedComponents.size).toBe(0);
    expect(state.hintsShown.size).toBe(0);
  });

  it('hint reveals stat lines in order, costs 25 and keeps the level perfect', async () => {
    await useGameStore.getState().startGame('endless');
    const state = useGameStore.getState();
    const node = state.targetItem!.children[0];
    const stats = getComponentStats(state.allItems!, node.itemId);
    expect(stats.length).toBeGreaterThan(0);

    for (let i = 0; i < stats.length + 2; i++) useGameStore.getState().hint();
    const after = useGameStore.getState();
    expect(after.hintsShown.get(0)).toBe(stats.length);
    expect(after.hintsUsed).toBe(stats.length);

    clearLevel();
    const done = useGameStore.getState();
    expect(done.levelResult?.outcome).toBe('perfect');
    expect(done.levelResult?.score.hintPenalty).toBe(25 * stats.length);
    expect(done.score).toBe(100 + 10 * done.settings.timerDuration - 25 * stats.length);
  });

  it('peek reveals the focused component once per Endless run', async () => {
    await useGameStore.getState().startGame('endless');
    expect(useGameStore.getState().peeksLeft).toBe(1);
    useGameStore.getState().peek();
    let state = useGameStore.getState();
    expect(state.peeksLeft).toBe(0);
    expect(state.revealedComponents.has(0)).toBe(true);
    expect(state.feedback?.itemIds).toEqual([state.targetItem!.children[0].itemId]);

    // No peeks left: another slot stays hidden
    if (state.targetItem!.children.length > 1) {
      useGameStore.getState().focusComponent([1]);
      useGameStore.getState().peek();
      state = useGameStore.getState();
      expect(state.revealedComponents.has(1)).toBe(false);
    }
  });

  it('daily gets one peek and practice unlimited', async () => {
    await useGameStore.getState().startGame('daily');
    expect(useGameStore.getState().peeksLeft).toBe(1);
    useGameStore.getState().quitToMenu();
    await useGameStore.getState().startGame('practice');
    expect(useGameStore.getState().peeksLeft).toBe(Infinity);
  });

  it('champion bonus adds points once per level', async () => {
    await useGameStore.getState().startGame('endless');
    clearLevel();
    const score = useGameStore.getState().score;
    useGameStore.getState().claimChampionBonus(true);
    useGameStore.getState().claimChampionBonus(true);
    expect(useGameStore.getState().score).toBe(score + 50);
  });

  it('practice can target a specific item (from the codex)', async () => {
    await useGameStore.getState().startGame('practice', { practiceTarget: '3031' });
    expect(useGameStore.getState().targetItem!.itemName).toBe('Infinity Edge');
    useGameStore.getState().skipLevel();
    expect(useGameStore.getState().practiceTarget).toBeNull();
  });
});

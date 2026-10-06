/**
 * Global keyboard controls while playing.
 *
 * Shop:         1 2 3 4 / Q W E R / A S D F / Z X C V  (same layout as the 4x4 grid)
 * Cart:         Enter = purchase, Backspace = remove last item
 * Build path:   Tab / Arrow keys = next/previous slot, B = Buy All, Esc = leave Buy All, H = Hint, P = Peek
 * Gold check:   1/2, 3/4, 5/6, 7/8 = pick an option per question, Enter = confirm
 * Level card:   Enter / Space = continue
 */

import { useEffect } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { playSound } from '../utils/sound';

/** Hotkeys for the 16 shop tiles, in grid order */
export const SHOP_HOTKEYS = ['1', '2', '3', '4', 'Q', 'W', 'E', 'R', 'A', 'S', 'D', 'F', 'Z', 'X', 'C', 'V'];

/** Hotkey pairs for gold check questions, in display order (components first, then the final item) */
export const GOLD_CHECK_HOTKEYS: Array<[string, string]> = [['1', '2'], ['3', '4'], ['5', '6'], ['7', '8']];

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export function useHotkeys(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;

      const state = useGameStore.getState();
      if (state.gameStatus !== 'playing') return;

      const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;

      // Level-complete card
      if (state.levelComplete) {
        if (key === 'Enter' || key === ' ') {
          event.preventDefault();
          state.proceedToNextLevel();
        }
        return;
      }

      // Gold check modal
      const gold = state.goldCheckState;
      if (gold.isActive) {
        const questions = [
          ...gold.items.map(item => ({ options: item.options, pick: (g: number) => state.selectGoldCheckAnswer(item.componentIndex, g) })),
          ...(gold.finalItemCheck ? [{ options: gold.finalItemCheck.options, pick: state.selectFinalGoldAnswer }] : []),
        ];
        questions.forEach((question, qi) => {
          const pair = GOLD_CHECK_HOTKEYS[qi];
          if (!pair) return;
          const optionIndex = pair.indexOf(key);
          if (optionIndex >= 0) {
            event.preventDefault();
            playSound('select');
            question.pick(question.options[optionIndex]);
          }
        });
        if (key === 'Enter') {
          event.preventDefault();
          const allAnswered =
            gold.items.every(item => item.selectedAnswer !== null) &&
            (!gold.finalItemCheck || gold.finalItemCheck.selectedAnswer !== null);
          if (allAnswered) state.submitGoldCheck();
        }
        return;
      }

      // Shop tiles
      const tileIndex = SHOP_HOTKEYS.indexOf(key);
      if (tileIndex >= 0 && tileIndex < state.shopGrid.length) {
        event.preventDefault();
        const before = state.selectedItems.length;
        state.selectShopItem(state.shopGrid[tileIndex]);
        if (useGameStore.getState().selectedItems.length > before) playSound('select');
        return;
      }

      switch (key) {
        case 'Enter':
          event.preventDefault();
          state.submitPurchase();
          break;
        case 'Backspace':
          event.preventDefault();
          if (state.selectedItems.length > 0) playSound('remove');
          state.removeLastCartItem();
          break;
        case 'Tab':
          event.preventDefault();
          state.cycleFocus(event.shiftKey ? -1 : 1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          state.cycleFocus(1);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          state.cycleFocus(-1);
          break;
        case 'B':
          event.preventDefault();
          state.toggleBuyAll();
          break;
        case 'P':
          event.preventDefault();
          state.peek();
          break;
        case 'H':
          event.preventDefault();
          state.hint();
          break;
        case 'Escape':
          if (state.isBuyAllMode) state.toggleBuyAll();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

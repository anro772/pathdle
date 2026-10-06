/**
 * Item tooltip state: hover (desktop) or long-press (touch) any item to see
 * its stats and passives. Rendered by <ItemTooltipLayer />.
 *
 * Usage: <img {...tooltipProps(itemId)} />
 */

import type React from 'react';
import { create } from 'zustand';

const HOVER_DELAY_MS = 350;
const LONG_PRESS_MS = 450;

interface TooltipState {
  itemId: string | null;
  rect: DOMRect | null;
  show: (itemId: string, rect: DOMRect) => void;
  hide: () => void;
}

export const useTooltipStore = create<TooltipState>(set => ({
  itemId: null,
  rect: null,
  show: (itemId, rect) => set({ itemId, rect }),
  hide: () => set({ itemId: null, rect: null }),
}));

// Only one tooltip can be pending at a time, so module-level state is enough
let timer: ReturnType<typeof setTimeout> | undefined;
let longPressed = false;

function close(): void {
  clearTimeout(timer);
  useTooltipStore.getState().hide();
}

/** Event handlers that show the tooltip for `itemId` on hover or long-press */
export function tooltipProps(itemId: string) {
  const open = (el: HTMLElement) => useTooltipStore.getState().show(itemId, el.getBoundingClientRect());

  return {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget;
      clearTimeout(timer);
      timer = setTimeout(() => open(el), HOVER_DELAY_MS);
    },
    onMouseLeave: close,
    onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
      const el = e.currentTarget;
      longPressed = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        longPressed = true;
        open(el);
      }, LONG_PRESS_MS);
    },
    onTouchMove: close,
    onTouchEnd: (e: React.TouchEvent<HTMLElement>) => {
      // A long-press only shows the tooltip: don't also click/buy the item
      if (longPressed) e.preventDefault();
      close();
    },
    onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
      if (longPressed) e.preventDefault();
    },
  };
}

/** Hide any open tooltip (e.g. when the item it points at goes away) */
export function hideTooltip(): void {
  close();
}

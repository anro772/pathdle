/**
 * ItemShopGrid Component
 *
 * League of Legends-style item shop grid where players select items to build components.
 * Features authentic LoL shop aesthetic with item frames, gold display, hotkeys and cart system.
 */

import { useGameStore, getCartSize, getComponentStats } from '../stores/useGameStore';
import { getItemImageUrl } from '../services/RiotService';
import { getNodeAtPath } from '../utils/recipeEngine';
import { playSound } from '../utils/sound';
import { SHOP_HOTKEYS } from '../hooks/useHotkeys';
import { motion, AnimatePresence } from 'framer-motion';
import { tooltipProps } from '../utils/tooltip';
import { Gold } from './Gold';

/**
 * ItemShopGrid Component
 */
export function ItemShopGrid() {
  const state = useGameStore();
  const {
    focusedComponentPath,
    selectedItems,
    isBuyAllMode,
    allItems,
    dataVersion,
    targetItem,
    shopGrid,
    feedback,
    levelComplete,
    goldCheckState,
    selectShopItem,
    removeCartItem,
    submitPurchase,
    peek,
    peeksLeft,
    hint,
    hintsShown,
    revealedComponents,
    mode,
    toggleBuyAll,
  } = state;

  const activeNode = isBuyAllMode ? targetItem : getNodeAtPath(targetItem, focusedComponentPath);

  if (!activeNode || focusedComponentPath.length === 0 && !isBuyAllMode || !allItems || !dataVersion) {
    const placeholder = goldCheckState.isActive
      ? { icon: '💰', title: 'GOLD CHECK', text: 'Every component is in place. Now, what does it all cost?' }
      : levelComplete
        ? { icon: '✓', title: 'LEVEL OVER', text: 'Check the full build path on the left.' }
        : { icon: '?', title: 'SELECT A COMPONENT', text: 'Click a "?" slot in the build path, or click the target item to buy it all at once.' };

    return (
      <div className="h-full min-h-48 flex flex-col items-center justify-center text-center p-6">
        <div className="w-14 h-14 mb-3 rounded-lg bg-lol-dark border-2 border-lol-border flex items-center justify-center">
          <span className="font-display text-2xl text-lol-muted">{placeholder.icon}</span>
        </div>
        <h3 className="font-display text-base text-hextech-gold mb-1.5">{placeholder.title}</h3>
        <p className="font-ui text-sm text-hextech-gold-light/70 max-w-xs">{placeholder.text}</p>
      </div>
    );
  }

  const cartSize = getCartSize(state);
  const isCartFull = selectedItems.length >= cartSize;
  const isBasicSlot = !isBuyAllMode && activeNode.children.length === 0;

  const cartSlots: Array<string | null> = [...selectedItems];
  while (cartSlots.length < cartSize) cartSlots.push(null);

  // Hidden component: identity only shows after Peek; stats only after Hints
  const slotIndex = focusedComponentPath[0];
  const isRevealed = isBuyAllMode || revealedComponents.has(slotIndex);
  const allStats = isBuyAllMode ? [] : getComponentStats(allItems, activeNode.itemId);
  const hintsRevealed = isBuyAllMode ? [] : allStats.slice(0, hintsShown.get(slotIndex) ?? 0);
  const canHint = !isBuyAllMode && hintsRevealed.length < allStats.length;
  const canPeek = !isBuyAllMode && !isRevealed && peeksLeft > 0;
  const isPractice = mode === 'practice';

  const handleSelectItem = (itemId: string) => {
    if (isCartFull) return;
    playSound('select');
    selectShopItem(itemId);
  };

  const handleRemoveItem = (index: number) => {
    playSound('remove');
    removeCartItem(index);
  };

  const prompt = isBuyAllMode
    ? 'Buy every base component of'
    : `Component ${slotIndex + 1} of ${targetItem!.children.length} · ${isBasicSlot ? 'a basic item: find it' : `pick its ${activeNode.children.length} part${activeNode.children.length > 1 ? 's' : ''}`}`;

  // Shake the shop when the player gets something wrong
  const shakeKey = feedback?.kind === 'wrong' ? feedback.id : 0;

  return (
    <motion.div
      key={shakeKey}
      animate={shakeKey ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : {}}
      transition={{ duration: 0.45 }}
      className="h-full flex flex-col"
    >
      {/* Header - What we're building (hidden until Peek), one compact row */}
      <div className="mb-2.5 pb-2 border-b border-lol-border">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <div className={`item-slot p-1 shrink-0 ${isBuyAllMode ? '!border-hextech-blue' : '!border-hextech-gold'}`}>
            {isRevealed ? (
              <img
                {...tooltipProps(activeNode.itemId)}
                src={getItemImageUrl(activeNode.itemId, dataVersion)}
                alt={activeNode.itemName}
                className="w-9 h-9"
              />
            ) : (
              <div className="w-9 h-9 flex items-center justify-center font-display text-xl text-hextech-gold">?</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-ui text-[0.75rem] text-hextech-gold-light/70 uppercase tracking-wider truncate">{prompt}</p>
            <p className="font-display text-sm sm:text-base text-hextech-gold truncate">
              {isRevealed ? activeNode.itemName : 'Hidden component'}
            </p>
          </div>
          {!isBuyAllMode && !isBasicSlot && activeNode.goldCost > 0 && (
            <div className="text-right shrink-0">
              <p className="font-ui text-[0.75rem] text-hextech-gold-light/65 uppercase tracking-wider">Combine</p>
              <p className="font-ui text-sm"><Gold amount={activeNode.goldCost} prefix="+" /></p>
            </div>
          )}
          {isBuyAllMode ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-ui text-sm font-bold text-hextech-blue bg-hextech-blue/10 border border-hextech-blue/40 rounded px-2 py-0.5" title="×1.5 points if every component is right">
                ⚡ ×1.5
              </span>
              <button
                onClick={toggleBuyAll}
                className="font-ui text-sm font-bold px-2.5 py-1 rounded border border-hextech-gold-light/40 text-hextech-gold-light hover:border-error-red hover:text-error-red transition-colors"
              >
                ✕ Cancel <kbd className="kbd hidden sm:inline-block">Esc</kbd>
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={hint}
                disabled={!canHint}
                className="font-ui text-xs px-2 py-1 rounded border border-warning-yellow/50 text-warning-yellow hover:bg-warning-yellow/10 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                title={canHint ? 'Reveal one stat of this component (H)' : 'No more stats to reveal'}
              >
                💡 Hint {isPractice ? 'free' : '−25'} <kbd className="kbd hidden sm:inline-block">H</kbd>
              </button>
              {canPeek && (
                <button
                  onClick={peek}
                  className="font-ui text-xs px-2 py-1 rounded border border-hextech-blue/50 text-hextech-blue hover:bg-hextech-blue/10 transition-colors"
                  title="Reveal which component this is (P)"
                >
                  🔍 Peek{Number.isFinite(peeksLeft) ? ` (${peeksLeft})` : ''} <kbd className="kbd hidden sm:inline-block">P</kbd>
                </button>
              )}
            </div>
          )}
        </div>

        {hintsRevealed.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {hintsRevealed.map(line => (
              <span key={line} className="font-ui text-xs text-hextech-blue bg-hextech-blue/10 border border-hextech-blue/30 rounded px-1.5 py-0.5">
                💡 {line}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 4x4 Item Grid */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-2.5">
        {shopGrid.map((itemId, index) => {
          const item = allItems[itemId];
          if (!item) return null;

          const count = selectedItems.filter(id => id === itemId).length;
          const isSelected = count > 0;
          const isDisabled = isCartFull && !isSelected;

          return (
            <motion.button
              key={`${itemId}-${index}`}
              onClick={() => handleSelectItem(itemId)}
              aria-disabled={isCartFull}
              whileTap={!isCartFull ? { scale: 0.92 } : {}}
              className={`
                item-slot relative flex flex-col items-center p-1.5 sm:p-2 lg:py-1.5
                ${isSelected ? '!border-hextech-blue shadow-hextech' : ''}
                ${isDisabled ? 'opacity-40' : ''}
                ${isCartFull ? 'cursor-default' : 'cursor-pointer'}
              `}
              {...tooltipProps(itemId)}
            >
              <span className="kbd absolute top-0.5 left-0.5 hidden sm:inline-block">{SHOP_HOTKEYS[index]}</span>
              {count > 1 && (
                <span className="absolute top-0.5 right-0.5 bg-hextech-blue text-lol-black font-ui font-bold text-[0.75rem] rounded px-1">
                  ×{count}
                </span>
              )}
              <img
                src={getItemImageUrl(itemId, dataVersion)}
                alt={item.name}
                className="w-10 h-10 sm:w-12 sm:h-12 lg:w-11 lg:h-11 mb-1"
              />
              <span className="font-ui text-[0.75rem] text-hextech-gold-light/80 text-center leading-tight line-clamp-2 min-h-6 lg:line-clamp-1 lg:min-h-0 w-full hide-when-very-short">
                {item.name}
              </span>
              <span className="font-ui text-[0.8rem] text-hextech-gold font-semibold">
                <Gold amount={item.gold.total} />
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Cart Section (sticky at the bottom of the screen on phones) */}
      <div className="mt-auto sticky bottom-0 z-10 -mx-3 px-3 pt-2 pb-3 bg-lol-dark/95 border-t border-lol-border lg:static lg:mx-0 lg:px-0 lg:pt-0 lg:pb-0 lg:bg-transparent lg:border-0">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-display text-[0.75rem] text-hextech-gold tracking-wider">CART</h3>
          <span className="font-ui text-[0.75rem] text-hextech-gold-light/70">
            {selectedItems.length} / {cartSize} · <kbd className="kbd">⌫</kbd> remove
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 lg:gap-4">
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          <AnimatePresence mode="popLayout">
            {cartSlots.map((slot, index) => (
              <motion.div
                key={slot ? `${slot}-${index}` : `empty-${index}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-14 max-w-24"
              >
                {slot ? (
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="item-slot relative flex flex-col items-center p-1.5 h-16 lg:h-14 w-full group cursor-pointer hover:!border-error-red"
                    title="Click to remove"
                  >
                    <img
                      {...tooltipProps(slot)}
                      src={getItemImageUrl(slot, dataVersion)}
                      alt={allItems[slot]?.name || ''}
                      className="w-9 h-9 lg:w-10 lg:h-10 lg:my-auto"
                    />
                    <span className="font-ui text-[0.7rem] text-center leading-tight mt-0.5 line-clamp-1 w-full text-hextech-gold-light/80 lg:hidden">
                      {allItems[slot]?.name || ''}
                    </span>
                    <div className="absolute inset-0 bg-error-red/20 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-error-red text-lg font-bold">×</span>
                    </div>
                  </button>
                ) : (
                  <div className="h-16 lg:h-14 bg-lol-dark border-2 border-dashed border-lol-border rounded flex items-center justify-center">
                    <span className="font-display text-xl text-lol-muted">+</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button
          onClick={submitPurchase}
          disabled={!isCartFull}
          className={`btn-hextech w-full lg:w-auto lg:min-w-52 lg:self-center py-2.5 lg:py-3.5 text-sm ${!isCartFull ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isCartFull ? <>PURCHASE <kbd className="kbd kbd-dark ml-1">Enter</kbd></> : `SELECT ${cartSize - selectedItems.length} MORE`}
        </button>
        </div>
      </div>
    </motion.div>
  );
}

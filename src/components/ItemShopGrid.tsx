/**
 * ItemShopGrid Component
 *
 * League of Legends-style item shop grid where players select items to build components.
 * Features authentic LoL shop aesthetic with item frames, gold display, and cart system.
 */

import { useMemo } from 'react';
import { useGameStore } from '../stores/useGameStore';
import type { ComponentNode } from '../types/items';
import { getItemImageUrl } from '../services/RiotService';
import { formatItemName, formatGold } from '../utils/formatting';
import { generateShopGrid } from '../utils/shopGridGenerator';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Gold coin SVG icon
 */
function GoldIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <circle cx="8" cy="8" r="7" fill="#C8AA6E" stroke="#785A28" strokeWidth="1" />
      <circle cx="8" cy="8" r="4" fill="#F0E6D2" opacity="0.3" />
      <text x="8" y="11" textAnchor="middle" fill="#785A28" fontSize="8" fontWeight="bold">G</text>
    </svg>
  );
}

/**
 * Traverses a component tree by following a path array.
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
 */
function collectAllBaseComponents(node: ComponentNode): string[] {
  if (node.children.length === 0) {
    return [node.itemId];
  }
  const baseComponents: string[] = [];
  for (const child of node.children) {
    baseComponents.push(...collectAllBaseComponents(child));
  }
  return baseComponents;
}

/**
 * ItemShopGrid Component
 */
export function ItemShopGrid() {
  const {
    focusedComponentPath,
    selectedItems,
    lockedCartItems,
    isBuyAllMode,
    goldInput,
    requiresComponentGold,
    basicComponents,
    allItems,
    dataVersion,
    targetItem,
    selectShopItem,
    submitPurchase,
  } = useGameStore();

  // Get the focused component node
  const focusedNode = getNodeAtPath(targetItem, focusedComponentPath);

  // Memoize the shop grid to prevent regeneration on every render (timer updates)
  // Sort by gold cost for easier readability
  // In Buy All mode: generate grid with ONLY base components (leaf nodes)
  const shopGridItems = useMemo(() => {
    if (!basicComponents || !allItems || !targetItem) return [];

    if (isBuyAllMode) {
      // Buy All mode: need to show only base components (no tier 2 items)
      // Get all required base components
      const requiredBaseItems = collectAllBaseComponents(targetItem);
      const basicComponentIds = Object.keys(basicComponents);

      // Build frequency map of required items
      const requiredFrequency: Record<string, number> = {};
      for (const itemId of requiredBaseItems) {
        requiredFrequency[itemId] = (requiredFrequency[itemId] || 0) + 1;
      }

      // Get distractors from basic components only (exclude required items)
      const availableDistractors = basicComponentIds.filter(id => !requiredFrequency[id]);
      const shuffledDistractors = [...availableDistractors].sort(() => Math.random() - 0.5);

      const distractorsNeeded = 16 - requiredBaseItems.length;
      const distractors: string[] = [];
      for (let i = 0; i < distractorsNeeded; i++) {
        distractors.push(shuffledDistractors[i % shuffledDistractors.length]);
      }

      // Combine and shuffle
      const gridItems = [...requiredBaseItems, ...distractors].sort(() => Math.random() - 0.5);

      // Sort by gold cost (ascending)
      return gridItems.sort((a, b) => {
        const goldA = allItems[a]?.gold.total ?? 0;
        const goldB = allItems[b]?.gold.total ?? 0;
        return goldA - goldB;
      });
    }

    // Normal mode: use the standard grid generator
    if (!focusedNode) return [];
    const gridItems = generateShopGrid(focusedNode, basicComponents, 16);

    // Sort by gold cost (ascending)
    return gridItems.sort((a, b) => {
      const goldA = allItems[a]?.gold.total ?? 0;
      const goldB = allItems[b]?.gold.total ?? 0;
      return goldA - goldB;
    });
  }, [focusedComponentPath.join(','), focusedNode?.itemId, isBuyAllMode, targetItem?.itemId, basicComponents, allItems]);

  // Generate gold options (1 correct + 2 wrong) - memoized to stay stable
  const goldOptions = useMemo(() => {
    if (!focusedNode || focusedNode.goldCost === 0) return [];
    const correctGold = focusedNode.goldCost;

    // Generate two wrong values that are plausible
    const variations = [50, 100, 150, 200, 250, 300];
    const wrongValues: number[] = [];

    // Pick random offsets for wrong answers
    const shuffled = [...variations].sort(() => Math.random() - 0.5);
    for (const offset of shuffled) {
      const wrong1 = correctGold + offset;
      const wrong2 = correctGold - offset;
      if (wrong2 > 0 && !wrongValues.includes(wrong2) && wrong2 !== correctGold) {
        wrongValues.push(wrong2);
      }
      if (!wrongValues.includes(wrong1) && wrong1 !== correctGold) {
        wrongValues.push(wrong1);
      }
      if (wrongValues.length >= 2) break;
    }

    // Combine correct with wrong and shuffle
    const options = [correctGold, ...wrongValues.slice(0, 2)];
    return options.sort(() => Math.random() - 0.5);
  }, [focusedComponentPath.join(','), focusedNode?.goldCost]);

  // Don't render when no component is focused AND not in Buy All mode - show placeholder
  if (focusedComponentPath.length === 0 && !isBuyAllMode) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 mb-4 rounded-lg bg-lol-dark border-2 border-lol-border flex items-center justify-center">
          <span className="font-display text-3xl text-lol-muted">?</span>
        </div>
        <h3 className="font-display text-base text-hextech-gold mb-1.5">SELECT A COMPONENT</h3>
        <p className="font-ui text-sm text-hextech-gold-light/60 max-w-xs">
          Click on a component slot in the build path, or click the target item to buy all at once
        </p>
      </div>
    );
  }

  if (!basicComponents || !allItems || !dataVersion || !targetItem) {
    return null;
  }

  // In Buy All mode, focusedNode is the target item itself
  const activeNode = isBuyAllMode ? targetItem : focusedNode;
  if (!activeNode) {
    return null;
  }

  // Build cart display with individual slots (no quantity badges)
  // cartSize is how many items need to be selected
  // In Buy All mode: need ALL base components for the entire item
  // For basic items (no children): the player must find the item itself (1 item)
  // For complex items: need all direct children
  let cartSize: number;
  if (isBuyAllMode) {
    cartSize = collectAllBaseComponents(targetItem).length;
  } else {
    const isBasicItem = activeNode.children.length === 0;
    cartSize = isBasicItem ? 1 : activeNode.children.length;
  }

  // Each selected item gets its own slot (duplicates show separately)
  // cartSlots is an array of { itemId, isLocked } or null for empty slots
  const cartSlots: Array<{ itemId: string; isLocked: boolean } | null> = selectedItems.map((itemId, idx) => ({
    itemId,
    isLocked: idx < lockedCartItems.length && lockedCartItems[idx] === itemId,
  }));

  // Fill remaining slots with null (empty)
  while (cartSlots.length < cartSize) {
    cartSlots.push(null);
  }

  // Check if cart is full
  const isCartFull = selectedItems.length >= cartSize;

  // Handle adding item to selection (with limit)
  const handleSelectItem = (itemId: string) => {
    if (!isCartFull) {
      selectShopItem(itemId);
    }
  };

  // Handle removing item from cart (only non-locked items)
  const handleRemoveItem = (slotIndex: number) => {
    const currentItems = useGameStore.getState().selectedItems;
    const lockedItems = useGameStore.getState().lockedCartItems;

    // Don't allow removing locked items
    if (slotIndex < lockedItems.length) {
      return;
    }

    // Remove the item at this specific index
    if (slotIndex < currentItems.length) {
      const newItems = [...currentItems];
      newItems.splice(slotIndex, 1);
      useGameStore.setState({ selectedItems: newItems });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - What we're building */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-lol-border">
        <div className="item-slot p-1">
          <img
            src={getItemImageUrl(activeNode.itemId, dataVersion)}
            alt={activeNode.itemName}
            className="w-7 h-7"
          />
        </div>
        <div>
          <p className="font-ui text-[9px] text-hextech-gold-light/60 uppercase tracking-wider">
            {isBuyAllMode ? 'Buy all components for' : (activeNode.children.length === 0 ? 'Find this item' : 'Building')}
          </p>
          <p className="font-display text-sm text-hextech-gold">{activeNode.itemName}</p>
        </div>
      </div>

      {/* 4x4 Item Grid */}
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {shopGridItems.map((itemId, index) => {
          const item = allItems[itemId];
          if (!item) return null;

          const isSelected = selectedItems.includes(itemId);
          const isDisabled = isCartFull && !isSelected;

          return (
            <motion.button
              key={`${itemId}-${index}`}
              onClick={() => handleSelectItem(itemId)}
              disabled={isDisabled}
              whileHover={!isDisabled ? { scale: 1.05 } : {}}
              whileTap={!isDisabled ? { scale: 0.95 } : {}}
              className={`
                item-slot flex flex-col items-center p-2
                transition-all duration-150
                ${isSelected ? 'border-hextech-blue shadow-hextech' : ''}
                ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <img
                src={getItemImageUrl(itemId, dataVersion)}
                alt={item.name}
                className="w-12 h-12 mb-1"
              />
              <span className="font-ui text-[10px] text-hextech-gold-light/80 text-center leading-tight line-clamp-2 min-h-6 w-full">
                {item.name}
              </span>
              <span className="font-ui text-[11px] text-hextech-gold font-semibold">
                {formatGold(item.gold.total)}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Cart Section */}
      <div className="mt-auto">
        {/* Cart Header */}
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-display text-[10px] text-hextech-gold tracking-wider">SELECTED</h3>
          <span className="font-ui text-[9px] text-hextech-gold-light/60">
            {selectedItems.length} / {cartSize} items
          </span>
        </div>

        {/* Cart Items - Individual slots, locked items show lock icon */}
        <div className="flex gap-2 mb-3">
          <AnimatePresence mode="popLayout">
            {cartSlots.map((slot, index) => (
              <motion.div
                key={slot ? `${slot.itemId}-${index}` : `empty-${index}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1"
              >
                {slot ? (
                  <button
                    onClick={() => !slot.isLocked && handleRemoveItem(index)}
                    disabled={slot.isLocked}
                    className={`
                      item-slot relative flex flex-col items-center p-2 h-20 w-full transition-colors group
                      ${slot.isLocked
                        ? 'cursor-default border-yellow-500/50'
                        : 'cursor-pointer hover:border-error-red'
                      }
                    `}
                    title={slot.isLocked ? 'Hint item (locked)' : 'Click to remove'}
                  >
                    <img
                      src={getItemImageUrl(slot.itemId, dataVersion)}
                      alt={allItems[slot.itemId]?.name || ''}
                      className="w-10 h-10"
                    />
                    <span className={`font-ui text-[10px] text-center leading-tight mt-1 line-clamp-1 w-full ${slot.isLocked ? 'text-yellow-400/80' : 'text-hextech-gold-light/80'}`}>
                      {allItems[slot.itemId]?.name || ''}
                    </span>
                    {/* Lock indicator for hint items */}
                    {slot.isLocked && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-lol-dark border-2 border-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-yellow-400 text-[10px]">🔒</span>
                      </div>
                    )}
                    {/* Remove indicator on hover (only for non-locked) */}
                    {!slot.isLocked && (
                      <div className="absolute inset-0 bg-error-red/20 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-error-red text-lg font-bold">×</span>
                      </div>
                    )}
                  </button>
                ) : (
                  <div className="h-20 bg-lol-dark border-2 border-dashed border-lol-border rounded flex items-center justify-center">
                    <span className="font-display text-xl text-lol-muted">+</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Gold Selection Buttons (conditional) - hidden in Buy All mode */}
        {!isBuyAllMode && requiresComponentGold && goldOptions.length > 0 && (
          <div className="mb-2">
            <label className="font-display text-[10px] text-hextech-gold tracking-wider block mb-1.5">
              COMBINE COST
            </label>
            <div className="flex gap-2">
              {goldOptions.map((gold) => (
                <button
                  key={gold}
                  onClick={() => useGameStore.setState({ goldInput: gold.toString() })}
                  className={`
                    flex-1 py-2.5 px-3 rounded border-2 font-ui text-base font-bold
                    transition-all duration-150
                    ${goldInput === gold.toString()
                      ? 'bg-yellow-500/30 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                      : 'bg-lol-black/60 border-lol-border text-hextech-gold-light/60 hover:border-yellow-500/50 hover:bg-lol-dark hover:text-yellow-400'
                    }
                  `}
                >
                  {formatGold(gold)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BUY Button */}
        <button
          onClick={submitPurchase}
          disabled={selectedItems.length !== cartSize}
          className={`
            btn-hextech w-full py-2.5 text-sm
            ${selectedItems.length !== cartSize ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {selectedItems.length === cartSize ? 'PURCHASE' : `SELECT ${cartSize - selectedItems.length} MORE`}
        </button>
      </div>
    </div>
  );
}

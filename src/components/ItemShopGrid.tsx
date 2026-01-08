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
 * ItemShopGrid Component
 */
export function ItemShopGrid() {
  const {
    focusedComponentPath,
    selectedItems,
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
  const shopGridItems = useMemo(() => {
    if (!focusedNode || !basicComponents || !allItems) return [];
    const gridItems = generateShopGrid(focusedNode, basicComponents, 16);
    // Sort by gold cost (ascending)
    return gridItems.sort((a, b) => {
      const goldA = allItems[a]?.gold.total ?? 0;
      const goldB = allItems[b]?.gold.total ?? 0;
      return goldA - goldB;
    });
  }, [focusedComponentPath.join(','), focusedNode?.itemId, basicComponents, allItems]);

  // Don't render when no component is focused - show placeholder
  if (focusedComponentPath.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 mb-4 rounded-lg bg-lol-dark border-2 border-lol-border flex items-center justify-center">
          <span className="font-display text-3xl text-lol-muted">?</span>
        </div>
        <h3 className="font-display text-base text-hextech-gold mb-1.5">SELECT A COMPONENT</h3>
        <p className="font-ui text-sm text-hextech-gold-light/60 max-w-xs">
          Click on a component slot in the build path to see which items you need
        </p>
      </div>
    );
  }

  if (!focusedNode || !basicComponents || !allItems || !dataVersion) {
    return null;
  }

  // Build cart display with quantities
  // cartSize is how many items need to be selected
  // For basic items (no children), the player must find the item itself (1 item)
  const isBasicItem = focusedNode.children.length === 0;
  const cartSize = isBasicItem ? 1 : focusedNode.children.length;

  const itemCounts: Record<string, number> = {};
  for (const itemId of selectedItems) {
    itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
  }

  const cartItems: Array<{ itemId: string; count: number } | null> = [];
  const processedItems = new Set<string>();
  for (const itemId of selectedItems) {
    if (!processedItems.has(itemId)) {
      cartItems.push({ itemId, count: itemCounts[itemId] });
      processedItems.add(itemId);
    }
  }
  while (cartItems.length < cartSize) {
    cartItems.push(null);
  }

  // Check if cart is full
  const isCartFull = selectedItems.length >= cartSize;

  // Handle adding item to selection (with limit)
  const handleSelectItem = (itemId: string) => {
    if (!isCartFull) {
      selectShopItem(itemId);
    }
  };

  // Handle removing item from cart
  const handleRemoveItem = (itemId: string) => {
    const currentItems = useGameStore.getState().selectedItems;
    const lastIndex = currentItems.lastIndexOf(itemId);
    if (lastIndex !== -1) {
      const newItems = [...currentItems];
      newItems.splice(lastIndex, 1);
      useGameStore.setState({ selectedItems: newItems });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - What we're building */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-lol-border">
        <div className="item-slot p-1">
          <img
            src={getItemImageUrl(focusedNode.itemId, dataVersion)}
            alt={focusedNode.itemName}
            className="w-7 h-7"
          />
        </div>
        <div>
          <p className="font-ui text-[9px] text-hextech-gold-light/60 uppercase tracking-wider">
            {isBasicItem ? 'Find this item' : 'Building'}
          </p>
          <p className="font-display text-sm text-hextech-gold">{focusedNode.itemName}</p>
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
              <span className="font-ui text-[10px] text-hextech-gold-light/80 text-center leading-tight line-clamp-2 min-h-[24px] w-full">
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

        {/* Cart Items - Clickable to remove */}
        <div className="flex gap-1 mb-2">
          <AnimatePresence mode="popLayout">
            {cartItems.map((cartItem, index) => (
              <motion.div
                key={cartItem ? `${cartItem.itemId}-${index}` : `empty-${index}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1"
              >
                {cartItem ? (
                  <button
                    onClick={() => handleRemoveItem(cartItem.itemId)}
                    className="item-slot relative flex flex-col items-center p-1 h-14 w-full cursor-pointer hover:border-error-red transition-colors group"
                    title="Click to remove"
                  >
                    <img
                      src={getItemImageUrl(cartItem.itemId, dataVersion)}
                      alt={allItems[cartItem.itemId]?.name || ''}
                      className="w-7 h-7"
                    />
                    <span className="font-ui text-[7px] text-hextech-gold-light/70 text-center leading-tight">
                      {formatItemName(allItems[cartItem.itemId]?.name || '', 8)}
                    </span>
                    {cartItem.count > 1 && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-hextech-blue rounded-full flex items-center justify-center">
                        <span className="font-ui text-[9px] font-bold text-lol-black">
                          {cartItem.count}
                        </span>
                      </div>
                    )}
                    {/* Remove indicator on hover */}
                    <div className="absolute inset-0 bg-error-red/20 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-error-red text-sm font-bold">×</span>
                    </div>
                  </button>
                ) : (
                  <div className="h-14 bg-lol-dark border-2 border-dashed border-lol-border rounded flex items-center justify-center">
                    <span className="font-display text-base text-lol-muted">+</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Gold Input (conditional) */}
        {requiresComponentGold && (
          <div className="mb-2">
            <label className="font-display text-[10px] text-hextech-gold tracking-wider block mb-1">
              COMBINE COST
            </label>
            <div className="relative">
              <input
                type="text"
                value={goldInput}
                onChange={(e) => useGameStore.setState({ goldInput: e.target.value })}
                className="input-hextech w-full pl-7 py-1.5 text-sm"
                placeholder="Enter gold..."
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2">
                <GoldIcon className="w-3.5 h-3.5" />
              </div>
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

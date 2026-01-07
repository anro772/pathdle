/**
 * ItemShopGrid Component
 *
 * League of Legends-style item shop grid where players select items to build components.
 * Displays a 4x4 grid of items, a cart showing selected items with quantities, and conditional
 * gold input field based on difficulty level.
 */

import { useGameStore } from '../stores/useGameStore';
import type { ComponentNode } from '../types/items';
import { getItemImageUrl } from '../services/RiotService';
import { formatItemName, formatGold } from '../utils/formatting';
import { generateShopGrid } from '../utils/shopGridGenerator';
import { motion } from 'framer-motion';

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
 * ItemShopGrid Component
 *
 * Displays the item shop interface with:
 * - Header showing what component is being built
 * - 4x4 grid of item cards
 * - Cart display showing selected items with quantities
 * - Optional gold input field (when requiresComponentGold is true)
 * - BUY button to submit purchase
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

  // Don't render when no component is focused
  if (focusedComponentPath.length === 0) {
    return null;
  }

  // Get the focused component node
  const focusedNode = getNodeAtPath(targetItem, focusedComponentPath);

  if (!focusedNode || !basicComponents || !allItems || !dataVersion) {
    return null;
  }

  // Generate the shop grid
  const shopGridItems = generateShopGrid(focusedNode, basicComponents, 16);

  // Build cart display with quantities
  const cartSize = focusedNode.children.length;

  // Count occurrences of each item in selectedItems
  const itemCounts: Record<string, number> = {};
  for (const itemId of selectedItems) {
    itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
  }

  // Build cart entries with quantities
  const cartItems: Array<{ itemId: string; count: number } | null> = [];
  const processedItems = new Set<string>();
  for (const itemId of selectedItems) {
    if (!processedItems.has(itemId)) {
      const count = itemCounts[itemId];
      cartItems.push({ itemId, count });
      processedItems.add(itemId);
    }
  }

  // Fill remaining slots with null
  while (cartItems.length < cartSize) {
    cartItems.push(null);
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 text-xl font-bold text-hextech-gold">
        <span>BUILDING:</span>
        <img
          src={getItemImageUrl(focusedNode.itemId, dataVersion)}
          alt={focusedNode.itemName}
          className="w-8 h-8"
        />
        <span>{focusedNode.itemName}</span>
      </div>

      {/* 4x4 Item Grid */}
      <div className="grid grid-cols-4 gap-4">
        {shopGridItems.map((itemId, index) => {
          const item = allItems[itemId];
          if (!item) return null;

          return (
            <motion.button
              key={`${itemId}-${index}`}
              onClick={() => selectShopItem(itemId)}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-2 p-3 bg-hextech-dark border-2 border-hextech-gold rounded-lg hover:scale-105 transition-transform cursor-pointer"
            >
              <img
                src={getItemImageUrl(itemId, dataVersion)}
                alt={item.name}
                className="w-16 h-16"
              />
              <span className="text-sm text-center text-white">
                {formatItemName(item.name, 15)}
              </span>
              <span className="text-sm text-hextech-gold">
                {formatGold(item.gold.total)}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Cart Display */}
      <div className="bg-hextech-dark border-2 border-hextech-gold rounded-lg p-4">
        <h3 className="text-lg font-bold text-hextech-gold mb-3">SELECTED ITEMS:</h3>
        <div className="grid grid-cols-3 gap-3">
          {cartItems.map((cartItem, index) => (
            <div key={index} className="relative">
              {cartItem ? (
                <div className="relative flex flex-col items-center gap-1 p-2 bg-slate-medium border border-hextech-gold rounded">
                  <img
                    src={getItemImageUrl(cartItem.itemId, dataVersion)}
                    alt={allItems[cartItem.itemId]?.name || ''}
                    className="w-12 h-12"
                  />
                  <span className="text-xs text-white text-center">
                    {formatItemName(allItems[cartItem.itemId]?.name || '', 12)}
                  </span>
                  {cartItem.count > 1 && (
                    <span className="absolute top-1 right-1 bg-hextech-dark border border-hextech-gold rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-hextech-gold">
                      x{cartItem.count}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center p-2 bg-slate-dark border border-slate-light rounded h-full min-h-[80px]">
                  <span className="text-slate-light">-</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gold Input (conditional) */}
      {requiresComponentGold && (
        <div className="bg-hextech-dark border-2 border-hextech-gold rounded-lg p-4">
          <label className="block text-lg font-bold text-hextech-gold mb-2">
            COMPONENT GOLD COST:
          </label>
          <input
            type="text"
            value={goldInput}
            onChange={(e) => useGameStore.setState({ goldInput: e.target.value })}
            className="w-full px-4 py-2 bg-hextech-darker text-white border-2 border-hextech-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-hextech-gold"
            placeholder="Enter gold amount..."
          />
        </div>
      )}

      {/* BUY Button */}
      <button
        onClick={submitPurchase}
        className="w-full py-4 bg-hextech-gold text-hextech-dark font-bold text-xl rounded-lg hover:bg-yellow-500 active:scale-95 transition-all"
      >
        BUY
      </button>
    </div>
  );
}

/**
 * Recipe Engine - Core algorithm for building component trees
 *
 * This module transforms DataDragon item data into recursive ComponentNode trees
 * that represent the crafting recipes for League of Legends items.
 */

import type { ItemData, ComponentNode } from '../types/items';

/**
 * Recursively builds a component tree from DataDragon item data.
 *
 * This is the core algorithm that powers the Buildle game. It traverses the
 * item's `from` array to construct a nested tree structure, calculating gold
 * costs at each level.
 *
 * @param itemId - The DataDragon item ID to build a tree for (e.g., "3142")
 * @param allItems - Complete item database keyed by item ID
 * @returns A ComponentNode representing the item and all its sub-components
 *
 * @example
 * ```typescript
 * const tree = buildComponentTree("3142", itemsData);
 * console.log(tree.itemName); // "Youmuu's Ghostblade"
 * console.log(tree.goldCost); // 675 (combine cost)
 * console.log(tree.children.length); // 2 (Serrated Dirk + Caulfield's Warhammer)
 * ```
 */
export function buildComponentTree(
  itemId: string,
  allItems: Record<string, ItemData>
): ComponentNode {
  const item = allItems[itemId];

  if (!item.from || item.from.length === 0) {
    // Base case: atomic component (Longsword, Ruby Crystal, etc.)
    return {
      itemId,
      itemName: item.name,
      children: [],
      goldCost: 0,
      totalCost: item.gold.total
    };
  }

  // Recursive case: has sub-components
  const children = item.from.map(subId => buildComponentTree(subId, allItems));

  // Calculate combine cost (total - sum of component costs)
  const componentsCost = children.reduce((sum, child) => sum + child.totalCost, 0);

  return {
    itemId,
    itemName: item.name,
    children,
    goldCost: item.gold.total - componentsCost,
    totalCost: item.gold.total
  };
}

/**
 * Calculates the maximum depth of a component tree.
 *
 * Depth is measured from the root node. A single atomic item has depth 1.
 * An item with one level of components has depth 2, and so on.
 *
 * @param node - The root node of the component tree
 * @returns The maximum depth of the tree
 *
 * @example
 * ```typescript
 * const tree = buildComponentTree("1036", items); // Long Sword (atomic)
 * getTreeDepth(tree); // Returns 1
 *
 * const complexTree = buildComponentTree("3142", items); // Youmuu's (3 levels)
 * getTreeDepth(complexTree); // Returns 3
 * ```
 */
export function getTreeDepth(node: ComponentNode): number {
  if (node.children.length === 0) {
    return 1;
  }

  const childDepths = node.children.map(child => getTreeDepth(child));
  return 1 + Math.max(...childDepths);
}

/**
 * Flattens a component tree into a list of all item IDs.
 *
 * Performs a depth-first traversal and collects all item IDs encountered.
 * Duplicates are preserved (e.g., if an item requires 2 Long Swords, both appear).
 *
 * @param node - The root node of the component tree
 * @returns Array of all item IDs in the tree, including duplicates
 *
 * @example
 * ```typescript
 * const tree = buildComponentTree("3134", items); // Serrated Dirk
 * getAllItemIds(tree);
 * // Returns ["3134", "1036", "1036"] - Dirk + 2 Long Swords
 * ```
 */
export function getAllItemIds(node: ComponentNode): string[] {
  const ids: string[] = [node.itemId];

  for (const child of node.children) {
    ids.push(...getAllItemIds(child));
  }

  return ids;
}

/**
 * Extracts all atomic (leaf) components from a tree.
 *
 * Returns only the base items that have no sub-components. These are the
 * fundamental building blocks that players start with in the shop.
 *
 * @param node - The root node of the component tree
 * @returns Array of ComponentNodes that are leaf nodes (no children)
 *
 * @example
 * ```typescript
 * const tree = buildComponentTree("3142", items); // Youmuu's Ghostblade
 * const atomics = getAtomicComponents(tree);
 * // Returns nodes for: [Long Sword, Long Sword, Long Sword, Long Sword]
 * // (2 from Serrated Dirk + 2 from Caulfield's)
 * ```
 */
export function getAtomicComponents(node: ComponentNode): ComponentNode[] {
  if (node.children.length === 0) {
    // This is a leaf node - an atomic component
    return [node];
  }

  // Recursively collect atomic components from all children
  const atomics: ComponentNode[] = [];
  for (const child of node.children) {
    atomics.push(...getAtomicComponents(child));
  }

  return atomics;
}

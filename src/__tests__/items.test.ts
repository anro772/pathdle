import { describe, expect, it } from 'vitest';
import { loadItems } from './helpers';
import { filterItems, getRandomItemId } from '../utils/itemFilters';
import { buildComponentTree, collectAllBaseComponents, getRequiredItems } from '../utils/recipeEngine';
import { generateBuyAllGrid, generateShopGrid, SHOP_GRID_SIZE } from '../utils/shopGridGenerator';
import { seededRng } from '../utils/seededRandom';

const { data } = loadItems();
const pools = filterItems(data);
const targets = { ...pools.epics, ...pools.legendaries };

describe('item pools', () => {
  it('splits targets into epics and legendaries', () => {
    expect(Object.keys(pools.epics).length).toBeGreaterThan(30);
    expect(Object.keys(pools.legendaries).length).toBeGreaterThan(80);
    expect(pools.epics['3134']?.name).toBe('Serrated Dirk');
    expect(pools.legendaries['3031']?.name).toBe('Infinity Edge');
  });

  it('excludes support quest upgrades and starter items', () => {
    expect(pools.legendaries['3877']).toBeUndefined(); // Bloodsong
    expect(pools.basicComponents['1055']).toBeUndefined(); // Doran's Blade
    expect(pools.basicComponents['1086']).toBeUndefined(); // Doran's Bow
    expect(pools.basicComponents['2003']).toBeUndefined(); // Health Potion
    expect(pools.basicComponents['2031']).toBeUndefined(); // Refillable Potion
    expect(pools.basicComponents['1036']?.name).toBe('Long Sword');
  });

  it('every target has a buildable tree', () => {
    for (const id of Object.keys(targets)) {
      const tree = buildComponentTree(id, data);
      expect(tree.children.length).toBeGreaterThan(0);
      for (const leaf of collectAllBaseComponents(tree)) {
        expect(data[leaf]).toBeDefined();
      }
    }
  });

  it('avoids excluded ids when picking', () => {
    const ids = Object.keys(pools.epics).sort();
    expect(getRandomItemId(pools.epics, ids.slice(1))).toBe(ids[0]);
    // Falls back to the whole pool when everything is excluded
    expect(ids).toContain(getRandomItemId(pools.epics, ids));
  });
});

describe('shop grid', () => {
  it('always contains the required items for every slot', () => {
    for (const id of Object.keys(targets)) {
      const tree = buildComponentTree(id, data);
      for (const child of tree.children) {
        const grid = generateShopGrid(child, data, pools.basicComponents);
        expect(grid).toHaveLength(SHOP_GRID_SIZE);
        expect(new Set(grid).size).toBe(grid.length);
        for (const required of getRequiredItems(child)) {
          expect(grid).toContain(required);
        }
      }
    }
  });

  it('buy-all grid contains every base component', () => {
    for (const id of Object.keys(targets)) {
      const tree = buildComponentTree(id, data);
      const grid = generateBuyAllGrid(tree, data, pools.basicComponents);
      for (const leaf of collectAllBaseComponents(tree)) {
        expect(grid).toContain(leaf);
      }
    }
  });

  it('is sorted by gold and deterministic with a seed', () => {
    const tree = buildComponentTree('3031', data);
    const a = generateShopGrid(tree.children[0], data, pools.basicComponents, 16, seededRng('x'));
    const b = generateShopGrid(tree.children[0], data, pools.basicComponents, 16, seededRng('x'));
    expect(a).toEqual(b);
    const golds = a.map(id => data[id].gold.total);
    expect(golds).toEqual([...golds].sort((x, y) => x - y));
  });
});

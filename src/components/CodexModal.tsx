/**
 * CodexModal Component
 *
 * "Collect them all": every epic and legendary item, greyed out until you've
 * built it perfectly once. Collected items show their recipe and Challenger stats;
 * any item can be practiced directly.
 */

import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { getItemImageUrl } from '../services/RiotService';
import { buildComponentTree } from '../utils/recipeEngine';
import { tooltipProps } from '../utils/tooltip';
import { Modal } from './Modal';
import { RecipeTree } from './RecipeTree';
import { Gold } from './Gold';

type Tab = 'legendary' | 'epic';

export function CodexModal({ onClose }: { onClose: () => void }) {
  const { pools, allItems, dataVersion, meta, codex, loadData, startGame } = useGameStore();
  const [tab, setTab] = useState<Tab>('legendary');
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadData().catch(() => setError(true));
  }, [loadData]);

  const collected = useMemo(() => new Set(codex), [codex]);

  const ids = useMemo(() => {
    if (!pools) return [];
    const pool = tab === 'legendary' ? pools.legendaries : pools.epics;
    return Object.keys(pool).sort((a, b) => pool[a].gold.total - pool[b].gold.total || pool[a].name.localeCompare(pool[b].name));
  }, [pools, tab]);

  const total = pools ? Object.keys(pools.legendaries).length + Object.keys(pools.epics).length : 0;
  const owned = pools ? codex.filter(id => pools.legendaries[id] || pools.epics[id]).length : 0;

  const practice = (itemId: string) => {
    onClose();
    void startGame('practice', { practiceTarget: itemId });
  };

  if (!pools || !allItems || !dataVersion) {
    return (
      <Modal title="Codex" onClose={onClose} wide>
        <p className="font-ui text-sm text-center py-8 text-hextech-gold-light/70">
          {error ? 'Could not load item data. Check your connection.' : 'Loading items…'}
        </p>
      </Modal>
    );
  }

  const selectedItem = selected ? allItems[selected] : null;
  const isCollected = selected ? collected.has(selected) : false;
  const stats = selected ? meta?.items[selected] : undefined;

  return (
    <Modal title="Codex" onClose={onClose} wide>
      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between font-ui text-xs text-hextech-gold-light/70 mb-1">
          <span>Build an item perfectly (any mode) to collect it</span>
          <span className="text-hextech-gold font-semibold">{owned} / {total}</span>
        </div>
        <div className="h-2 bg-lol-dark rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-hextech-gold-dark to-hextech-gold" style={{ width: `${total ? (owned / total) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(['legendary', 'epic'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-display text-[0.8rem] tracking-wider px-3 py-1 rounded border transition-colors ${
              tab === t ? 'border-hextech-gold text-hextech-gold bg-hextech-gold/10' : 'border-lol-border text-hextech-gold-light/65 hover:text-hextech-gold'
            }`}
          >
            {t === 'legendary' ? 'LEGENDARY' : 'EPIC'}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 max-h-64 overflow-y-auto p-1 mb-3">
        {ids.map(id => {
          const have = collected.has(id);
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`relative rounded border-2 transition-all ${selected === id ? 'border-hextech-blue' : have ? 'border-hextech-gold/50' : 'border-transparent'}`}
              aria-label={allItems[id].name}
            >
              <img
                {...tooltipProps(id)}
                src={getItemImageUrl(id, dataVersion)}
                alt={allItems[id].name}
                loading="lazy"
                className={`w-full aspect-square rounded-sm ${have ? '' : 'grayscale opacity-30'}`}
              />
            </button>
          );
        })}
      </div>

      {/* Detail */}
      <div className="bg-lol-dark/50 border border-lol-border rounded-lg p-3 min-h-40">
        {selectedItem && selected ? (
          <div className="flex flex-col items-center gap-2">
            <p className="font-display text-base text-hextech-gold text-center">
              {selectedItem.name} <span className="font-ui text-sm text-yellow-400"><Gold amount={selectedItem.gold.total} /></span>
            </p>
            {isCollected ? (
              <RecipeTree tree={buildComponentTree(selected, allItems)} />
            ) : (
              <p className="font-ui text-sm text-hextech-gold-light/65 py-3">🔒 Recipe hidden until you build it perfectly</p>
            )}
            <p className="font-ui text-xs text-hextech-gold-light/70 text-center">
              {stats
                ? `Built by ${(stats.pickRate * 100).toFixed(1)}% of Challenger players · ${(stats.winRate * 100).toFixed(0)}% WR`
                : meta ? '💎 Hidden gem. No Challenger finished a game with it.' : ''}
            </p>
            <button onClick={() => practice(selected)} className="btn-hextech btn-hextech-secondary !px-4 !py-1.5 text-xs">
              PRACTICE THIS ITEM
            </button>
          </div>
        ) : (
          <p className="font-ui text-sm text-hextech-gold-light/65 text-center pt-12">Pick an item to see its details.</p>
        )}
      </div>
    </Modal>
  );
}

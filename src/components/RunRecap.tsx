/**
 * RunRecap Component
 *
 * Every item from the finished run, colored by how it went.
 * Tap one to see its full recipe again.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../stores/useGameStore';
import { getItemImageUrl } from '../services/RiotService';
import { RecipeTree } from './RecipeTree';

const BORDER = {
  perfect: 'border-success-green',
  mistake: 'border-warning-yellow',
  failed: 'border-error-red',
};

export function RunRecap() {
  const runHistory = useGameStore(s => s.runHistory);
  const dataVersion = useGameStore(s => s.dataVersion);
  const [selected, setSelected] = useState<number | null>(null);

  if (runHistory.length === 0 || !dataVersion) return null;

  const entry = selected !== null ? runHistory[selected] : null;

  return (
    <div className="mb-4">
      <p className="font-display text-[0.75rem] text-hextech-gold tracking-wider mb-1.5">YOUR RUN · tap an item to review its recipe</p>
      <div className="flex flex-wrap gap-1.5">
        {runHistory.map((run, i) => (
          <button
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className={`rounded border-2 ${BORDER[run.outcome]} ${selected === i ? 'ring-2 ring-hextech-blue' : ''}`}
            title={run.tree.itemName}
          >
            <img src={getItemImageUrl(run.tree.itemId, dataVersion)} alt={run.tree.itemName} className="w-9 h-9 block" />
          </button>
        ))}
      </div>
      <AnimatePresence>
        {entry && (
          <motion.div
            key={selected}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-lol-dark/50 border border-lol-border rounded-lg p-3 mt-2">
              <RecipeTree tree={entry.tree} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

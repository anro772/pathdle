/**
 * ItemTooltipLayer Component
 *
 * Renders the active item tooltip (see utils/tooltip.ts) in a portal, so panels
 * with overflow-hidden never clip it.
 */

import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../stores/useGameStore';
import { parseItemDescription } from '../utils/itemText';
import { useTooltipStore } from '../utils/tooltip';
import { Gold } from './Gold';

const TOOLTIP_WIDTH = 240;

/** Renders the active tooltip. Mount once near the app root. */
export function ItemTooltipLayer() {
  const { itemId, rect } = useTooltipStore();
  const allItems = useGameStore(s => s.allItems);
  const item = itemId ? allItems?.[itemId] : undefined;

  const text = item ? parseItemDescription(item.description) : null;

  // Prefer above the element, flip below near the top; clamp horizontally
  let style: React.CSSProperties = {};
  if (rect) {
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2), window.innerWidth - TOOLTIP_WIDTH - 8);
    const above = rect.top > 220;
    style = above
      ? { left, bottom: window.innerHeight - rect.top + 8, width: TOOLTIP_WIDTH }
      : { left, top: rect.bottom + 8, width: TOOLTIP_WIDTH };
  }

  return createPortal(
    <AnimatePresence>
      {item && text && (
        <motion.div
          key={itemId}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          style={style}
          className="fixed z-[80] pointer-events-none hextech-panel !bg-lol-black/95 border !border-hextech-gold/50 p-3 shadow-2xl"
          role="tooltip"
        >
          <div className="flex justify-between items-baseline gap-2 mb-1">
            <p className="font-display text-sm text-hextech-gold leading-tight">{item.name}</p>
            <p className="font-ui text-xs text-yellow-400 shrink-0"><Gold amount={item.gold.total} /></p>
          </div>
          {text.stats.length > 0 && (
            <ul className="font-ui text-xs text-hextech-blue space-y-0.5 mb-1">
              {text.stats.map(stat => <li key={stat}>{stat}</li>)}
            </ul>
          )}
          {text.effects.slice(0, 3).map(effect => (
            <p key={effect.name} className="font-ui text-[0.8rem] text-hextech-gold-light/75 leading-snug mt-1">
              <span className="text-hextech-gold font-semibold">{effect.name}</span>
              {effect.text && ` · ${effect.text.length > 160 ? `${effect.text.slice(0, 157)}…` : effect.text}`}
            </p>
          ))}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

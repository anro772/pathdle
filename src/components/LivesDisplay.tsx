/**
 * LivesDisplay Component
 *
 * Shows the player's remaining lives with authentic Hextech styling.
 * Uses SVG heart icons with glow effects for a polished look.
 */

import { useGameStore } from '../stores/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_LIVES = 3;

/**
 * Heart SVG icon component
 */
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill={filled ? '#E84057' : 'transparent'}
      stroke={filled ? '#E84057' : '#3C3C41'}
      strokeWidth="2"
      className={filled ? 'drop-shadow-[0_0_8px_rgba(232,64,87,0.6)]' : ''}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

/**
 * LivesDisplay Component
 *
 * Displays current lives as hearts with animations on life loss.
 */
export function LivesDisplay() {
  const { livesRemaining } = useGameStore();

  return (
    <div className="flex flex-col">
      <span className="font-ui text-xs text-hextech-gold-light/50 uppercase tracking-widest mb-1">
        Lives
      </span>
      <div className="flex items-center gap-1" aria-label={`${livesRemaining} lives remaining`}>
        {Array.from({ length: MAX_LIVES }, (_, index) => {
          const isFilled = index < livesRemaining;
          return (
            <AnimatePresence key={index} mode="wait">
              <motion.div
                key={isFilled ? 'filled' : 'empty'}
                initial={!isFilled ? { scale: 1.3, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              >
                <HeartIcon filled={isFilled} />
              </motion.div>
            </AnimatePresence>
          );
        })}
      </div>
    </div>
  );
}

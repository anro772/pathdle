/**
 * AchievementToast Component - announces newly unlocked achievements, one at a time.
 */

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../stores/useGameStore';
import { ACHIEVEMENTS } from '../utils/progress';
import { playSound } from '../utils/sound';

const SHOW_MS = 3200;

export function AchievementToast() {
  const queue = useGameStore(s => s.achievementQueue);
  const dismissAchievement = useGameStore(s => s.dismissAchievement);
  const current = queue[0] ? ACHIEVEMENTS.find(a => a.id === queue[0]) : undefined;

  useEffect(() => {
    if (!queue[0]) return;
    playSound('levelUp');
    const timeout = setTimeout(dismissAchievement, SHOW_MS);
    return () => clearTimeout(timeout);
  }, [queue, dismissAchievement]);

  return (
    <div className="fixed top-20 left-4 right-4 sm:left-auto flex justify-center sm:justify-end z-[75] pointer-events-none">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ y: -30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="hextech-panel border-2 !border-hextech-gold px-4 py-2.5 flex items-center gap-3 shadow-gold"
            role="status"
          >
            <motion.span
              initial={{ rotate: -20, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
              className="text-3xl"
            >
              {current.icon}
            </motion.span>
            <div>
              <p className="font-ui text-[0.75rem] text-hextech-blue uppercase tracking-widest">Achievement unlocked</p>
              <p className="font-display text-sm text-hextech-gold">{current.title}</p>
              <p className="font-ui text-[0.8rem] text-hextech-gold-light/70">{current.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

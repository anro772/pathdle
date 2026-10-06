/**
 * Timer Component
 *
 * Displays a countdown timer with authentic Hextech styling.
 * Visual urgency increases as time runs out with color changes, pulse animation
 * and a draining bar. Bonus time for correct answers pops up as "+5s".
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../stores/useGameStore';

export function Timer() {
  const timeRemaining = useGameStore(s => s.timeRemaining);
  const duration = useGameStore(s => s.settings.timerDuration);
  const [bonus, setBonus] = useState<{ id: number; seconds: number } | null>(null);

  // Time going UP within the same level = bonus for a correct component
  useEffect(() => {
    return useGameStore.subscribe((state, prev) => {
      const sameLevel = state.targetItem === prev.targetItem && state.currentLevel === prev.currentLevel;
      if (sameLevel && state.timeRemaining > prev.timeRemaining) {
        setBonus({ id: Date.now(), seconds: state.timeRemaining - prev.timeRemaining });
      }
    });
  }, []);

  const { colorClass, barClass, label } =
    timeRemaining > 5
      ? { colorClass: 'timer-calm', barClass: 'bg-hextech-blue', label: 'TIME' }
      : timeRemaining > 2
        ? { colorClass: 'timer-warning', barClass: 'bg-warning-yellow', label: 'HURRY' }
        : { colorClass: 'timer-urgent', barClass: 'bg-error-red', label: 'DANGER' };

  const percent = duration > 0 ? (timeRemaining / duration) * 100 : 0;

  return (
    <div className="relative flex flex-col items-center w-24">
      <span className="font-ui text-[0.75rem] text-hextech-gold-light/65 uppercase tracking-widest">
        {label}
      </span>
      <div className={`font-display text-3xl tabular-nums leading-none ${colorClass}`} role="timer" aria-live="off">
        {timeRemaining}
      </div>
      <div className="w-full h-1 mt-1 bg-lol-dark rounded-full overflow-hidden">
        <div
          className={`h-full ${barClass} transition-[width] duration-1000 ease-linear`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <AnimatePresence>
        {bonus && (
          <motion.span
            key={bonus.id}
            initial={{ opacity: 0, x: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1, 0], x: -14, scale: 1 }}
            transition={{ duration: 1.3 }}
            onAnimationComplete={() => setBonus(null)}
            className="absolute right-full top-1/2 -translate-y-1/2 font-ui font-bold text-lg text-success-green whitespace-nowrap pointer-events-none"
          >
            +{bonus.seconds}s
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

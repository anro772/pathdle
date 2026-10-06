/**
 * Timer Component
 *
 * Displays a countdown timer with authentic Hextech styling.
 * Visual urgency increases as time runs out with color changes, pulse animation
 * and a draining bar.
 */

import { useGameStore } from '../stores/useGameStore';

export function Timer() {
  const timeRemaining = useGameStore(s => s.timeRemaining);
  const duration = useGameStore(s => s.settings.timerDuration);

  const { colorClass, barClass, label } =
    timeRemaining > 5
      ? { colorClass: 'timer-calm', barClass: 'bg-hextech-blue', label: 'TIME' }
      : timeRemaining > 2
        ? { colorClass: 'timer-warning', barClass: 'bg-warning-yellow', label: 'HURRY' }
        : { colorClass: 'timer-urgent', barClass: 'bg-error-red', label: 'DANGER' };

  const percent = duration > 0 ? (timeRemaining / duration) * 100 : 0;

  return (
    <div className="flex flex-col items-center w-24">
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
    </div>
  );
}

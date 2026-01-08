/**
 * Timer Component
 *
 * Displays a countdown timer with authentic Hextech styling.
 * Visual urgency increases as time runs out with color changes and pulse animation.
 */

import { useGameStore } from '../stores/useGameStore';

export function Timer() {
  const { timeRemaining } = useGameStore();

  // Determine color and animation based on time remaining
  const getTimerState = () => {
    if (timeRemaining > 5) {
      return {
        colorClass: 'timer-calm',
        label: 'TIME'
      };
    } else if (timeRemaining > 2) {
      return {
        colorClass: 'timer-warning',
        label: 'HURRY'
      };
    } else {
      return {
        colorClass: 'timer-urgent',
        label: 'DANGER'
      };
    }
  };

  const { colorClass, label } = getTimerState();

  return (
    <div className="flex flex-col items-center">
      <span className="font-ui text-xs text-hextech-gold-light/50 uppercase tracking-widest mb-1">
        {label}
      </span>
      <div className={`timer-display tabular-nums ${colorClass}`}>
        {timeRemaining}
      </div>
    </div>
  );
}

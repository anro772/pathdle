/**
 * Timer Component
 *
 * Displays a countdown timer for the current level.
 * Visual urgency increases as time runs out with color changes and pulse animation.
 *
 * Color scheme:
 * - 10-6s: Blue (calm)
 * - 5-3s: Yellow (warning)
 * - 2-0s: Red + pulse (urgent)
 */

import { useGameStore } from '../stores/useGameStore';
import { getTimerColor, shouldTimerPulse } from '../utils/timerHelpers';

export function Timer() {
  const { timeRemaining } = useGameStore();

  // Get color class based on urgency
  const colorClass = getTimerColor(timeRemaining);

  // Determine if timer should pulse
  const shouldPulse = shouldTimerPulse(timeRemaining);

  return (
    <div className="flex items-center justify-center">
      <div
        className={`
          text-5xl font-bold tabular-nums
          ${colorClass}
          ${shouldPulse ? 'animate-pulse' : ''}
          transition-colors duration-200
        `.trim()}
      >
        {timeRemaining}
      </div>
    </div>
  );
}

/**
 * LivesDisplay component
 * Shows the player's remaining lives as hearts
 */

import { useGameStore } from '../stores/useGameStore';

const MAX_LIVES = 3;

/**
 * Displays current lives as hearts.
 * Shows filled hearts (❤️) for remaining lives and empty hearts (🖤) for lost lives.
 *
 * @example
 * If lives = 2, shows: ❤️❤️🖤
 * If lives = 3, shows: ❤️❤️❤️
 * If lives = 0, shows: 🖤🖤🖤
 */
export function LivesDisplay() {
  const { livesRemaining } = useGameStore();

  const hearts = Array.from({ length: MAX_LIVES }, (_, index) => {
    const isFilled = index < livesRemaining;
    return (
      <span key={index} className="text-2xl">
        {isFilled ? '❤️' : '🖤'}
      </span>
    );
  });

  return (
    <div className="flex items-center gap-1" aria-label={`${livesRemaining} lives remaining`}>
      {hearts}
    </div>
  );
}

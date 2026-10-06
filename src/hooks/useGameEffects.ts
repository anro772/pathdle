/**
 * Side effects driven by game state: the 1-second timer and sound effects.
 */

import { useEffect } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { playSound } from '../utils/sound';

export function useGameEffects(): void {
  const timerActive = useGameStore(s => s.timerActive);
  const goldTimerActive = useGameStore(s => s.goldCheckState.timerActive);
  const tick = useGameStore(s => s.tick);

  // Single interval for the main timer and the gold check timer
  useEffect(() => {
    if (!timerActive && !goldTimerActive) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerActive, goldTimerActive, tick]);

  // Sounds on state transitions
  useEffect(() => {
    return useGameStore.subscribe((state, prev) => {
      if (state.feedback && state.feedback.id !== prev.feedback?.id) {
        if (state.feedback.kind === 'correct') playSound('correct');
        if (state.feedback.kind === 'wrong') playSound('wrong');
      }

      if (state.levelComplete && !prev.levelComplete && state.levelResult?.outcome !== 'failed') {
        playSound('levelUp');
      }

      if (state.gameStatus === 'gameover' && prev.gameStatus !== 'gameover') {
        playSound('gameOver');
      }

      const ticking = state.timerActive && state.timeRemaining <= 5 && state.timeRemaining > 0;
      if (ticking && state.timeRemaining !== prev.timeRemaining) {
        playSound('tick');
      }
    });
  }, []);
}

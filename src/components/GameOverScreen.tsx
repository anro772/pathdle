/**
 * GameOverScreen Component
 * Displays game over state with current run stats and best ever stats.
 * Shows a star emoji if player achieved a new record.
 */

import { useGameStore } from '../stores/useGameStore';

export function GameOverScreen() {
  const {
    gameStatus,
    currentLevel,
    bestLevelReached,
    resetGame,
  } = useGameStore();

  // Only render when game is over
  if (gameStatus !== 'gameover') {
    return null;
  }

  // Check if current run is a new record
  const isNewRecord = currentLevel >= bestLevelReached;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-slate-medium border-2 border-hextech-gold rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <h1 className="text-4xl font-bold text-hextech-gold text-center mb-8">
          GAME OVER
        </h1>

        {/* This Run Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-light mb-2">
            THIS RUN:
          </h2>
          <p className="text-2xl text-white">
            Level Reached: <span className="font-bold text-hextech-gold">{currentLevel}</span>
          </p>
        </div>

        {/* Best Ever Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-light mb-2">
            BEST EVER:
          </h2>
          <p className="text-2xl text-white">
            Level Reached: <span className="font-bold text-hextech-gold">{bestLevelReached}</span>
            {isNewRecord && <span className="ml-2">⭐</span>}
          </p>
          {isNewRecord && (
            <p className="text-hextech-gold text-sm mt-2 font-semibold">
              NEW RECORD!
            </p>
          )}
        </div>

        {/* Play Again Button */}
        <button
          onClick={resetGame}
          className="w-full bg-hextech-gold text-slate-dark font-bold text-xl py-4 px-6 rounded hover:bg-opacity-90 transition-opacity"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}

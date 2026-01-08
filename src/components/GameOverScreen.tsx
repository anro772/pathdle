/**
 * GameOverScreen Component
 *
 * Displays game over state with authentic Hextech styling.
 * Shows current run stats, best ever stats, and new record celebration.
 */

import { useGameStore } from '../stores/useGameStore';
import { motion } from 'framer-motion';

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
    <div className="hextech-bg min-h-screen flex items-center justify-center p-8">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
        className="relative z-10 hextech-panel p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-display text-4xl text-gold-gradient mb-2"
          >
            GAME OVER
          </motion.h1>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-hextech-gold to-transparent"></div>
        </div>

        {/* Stats */}
        <div className="space-y-6 mb-8">
          {/* This Run */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-lol-dark/50 border border-lol-border rounded-lg p-4"
          >
            <p className="font-ui text-xs text-hextech-gold-light/50 uppercase tracking-wider mb-1">
              This Run
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl text-hextech-gold">
                Level {currentLevel}
              </span>
              {isNewRecord && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
                  className="text-xl"
                >
                  ⭐
                </motion.span>
              )}
            </div>
          </motion.div>

          {/* Best Ever */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-lol-dark/50 border border-lol-border rounded-lg p-4"
          >
            <p className="font-ui text-xs text-hextech-gold-light/50 uppercase tracking-wider mb-1">
              Best Ever
            </p>
            <span className="font-display text-3xl text-hextech-blue">
              Level {bestLevelReached}
            </span>
          </motion.div>

          {/* New Record Badge */}
          {isNewRecord && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
              className="text-center"
            >
              <span className="inline-block px-4 py-2 bg-hextech-gold/20 border border-hextech-gold rounded-full font-display text-sm text-hextech-gold tracking-wider">
                🏆 NEW RECORD!
              </span>
            </motion.div>
          )}
        </div>

        {/* Play Again Button */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={resetGame}
          className="btn-hextech w-full py-4 text-lg"
        >
          PLAY AGAIN
        </motion.button>
      </motion.div>
    </div>
  );
}

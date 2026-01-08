/**
 * GameOverScreen Component
 *
 * Displays game over state with authentic Hextech styling.
 * Shows current run stats, percentile rank, leaderboard submission, and top scores.
 */

import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  submitScore,
  getTopScores,
  getPercentile,
  type LeaderboardEntry,
} from '../services/LeaderboardService';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export function GameOverScreen() {
  const {
    gameStatus,
    currentLevel,
    bestLevelReached,
    resetGame,
  } = useGameStore();

  // Leaderboard state
  const [playerName, setPlayerName] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [percentile, setPercentile] = useState<number | null>(null);
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Load percentile and leaderboard on mount
  useEffect(() => {
    if (gameStatus === 'gameover') {
      // Get percentile preview
      getPercentile(currentLevel).then(setPercentile);
      // Load leaderboard
      getTopScores(10).then((data) => {
        setTopScores(data.topScores);
        setTotalPlayers(data.totalPlayers);
      });
    }
  }, [gameStatus, currentLevel]);

  // Only render when game is over
  if (gameStatus !== 'gameover') {
    return null;
  }

  // Check if current run is a new record
  const isNewRecord = currentLevel >= bestLevelReached;

  const handleSubmit = async () => {
    const trimmedName = playerName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 20) {
      setErrorMessage('Name must be 1-20 characters');
      return;
    }

    setSubmitState('submitting');
    setErrorMessage('');

    const result = await submitScore(trimmedName, currentLevel);

    if (result.success) {
      setSubmitState('success');
      setPercentile(result.percentile);
      // Refresh leaderboard
      const data = await getTopScores(10);
      setTopScores(data.topScores);
      setTotalPlayers(data.totalPlayers);
    } else {
      setSubmitState('error');
      setErrorMessage(result.error || 'Failed to save score');
    }
  };

  return (
    <div className="hextech-bg min-h-screen w-screen flex items-center justify-center p-4 overflow-y-auto">
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
        className="relative z-10 hextech-panel p-6 max-w-lg w-full my-4"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-display text-3xl text-gold-gradient mb-2"
          >
            GAME OVER
          </motion.h1>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-hextech-gold to-transparent"></div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* This Run */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-lol-dark/50 border border-lol-border rounded-lg p-3"
          >
            <p className="font-ui text-[10px] text-hextech-gold-light/50 uppercase tracking-wider mb-1">
              This Run
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl text-hextech-gold">
                Level {currentLevel}
              </span>
              {isNewRecord && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
                  className="text-base"
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
            className="bg-lol-dark/50 border border-lol-border rounded-lg p-3"
          >
            <p className="font-ui text-[10px] text-hextech-gold-light/50 uppercase tracking-wider mb-1">
              Best Ever
            </p>
            <span className="font-display text-2xl text-hextech-blue">
              Level {bestLevelReached}
            </span>
          </motion.div>
        </div>

        {/* Percentile Display */}
        <AnimatePresence mode="wait">
          {percentile !== null && percentile > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-4 p-4 bg-gradient-to-r from-hextech-blue/20 via-hextech-blue/10 to-hextech-blue/20 border border-hextech-blue/50 rounded-lg text-center"
            >
              <p className="font-ui text-xs text-hextech-blue/80 uppercase tracking-wider mb-1">
                You're better than
              </p>
              <p className="font-display text-4xl text-hextech-blue">
                {percentile.toFixed(1)}%
              </p>
              <p className="font-ui text-xs text-hextech-gold-light/50">
                of {totalPlayers.toLocaleString()} players
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Record Badge */}
        {isNewRecord && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
            className="text-center mb-4"
          >
            <span className="inline-block px-3 py-1.5 bg-hextech-gold/20 border border-hextech-gold rounded-full font-display text-xs text-hextech-gold tracking-wider">
              NEW PERSONAL BEST!
            </span>
          </motion.div>
        )}

        {/* Leaderboard Submission */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-4"
        >
          {submitState === 'success' ? (
            <div className="text-center p-3 bg-success-green/10 border border-success-green/50 rounded-lg">
              <p className="font-ui text-sm text-success-green">
                Score saved to leaderboard!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="font-display text-[10px] text-hextech-gold tracking-wider block">
                SAVE TO LEADERBOARD
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  disabled={submitState === 'submitting'}
                  className="input-hextech flex-1 py-2 px-3 text-sm"
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitState === 'submitting' || playerName.trim().length === 0}
                  className={`
                    btn-hextech-secondary px-4 py-2 text-sm font-display tracking-wider
                    ${submitState === 'submitting' ? 'opacity-50 cursor-wait' : ''}
                    ${playerName.trim().length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {submitState === 'submitting' ? '...' : 'SAVE'}
                </button>
              </div>
              {errorMessage && (
                <p className="font-ui text-xs text-error-red">{errorMessage}</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Top 10 Leaderboard */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mb-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-xs text-hextech-gold tracking-wider">
              TOP 10
            </h3>
            <span className="font-ui text-[10px] text-hextech-gold-light/50">
              {totalPlayers.toLocaleString()} total players
            </span>
          </div>
          <div className="bg-lol-dark/30 border border-lol-border rounded-lg overflow-hidden">
            {topScores.length === 0 ? (
              <div className="p-4 text-center">
                <p className="font-ui text-xs text-hextech-gold-light/50">
                  No scores yet. Be the first!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-lol-border/50">
                {topScores.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`
                      flex items-center gap-3 px-3 py-2
                      ${index === 0 ? 'bg-hextech-gold/10' : ''}
                      ${index === 1 ? 'bg-hextech-gold/5' : ''}
                      ${index === 2 ? 'bg-hextech-gold/[0.03]' : ''}
                    `}
                  >
                    <span className={`
                      font-display text-sm w-6 text-center
                      ${index === 0 ? 'text-yellow-400' : ''}
                      ${index === 1 ? 'text-gray-300' : ''}
                      ${index === 2 ? 'text-amber-600' : ''}
                      ${index > 2 ? 'text-hextech-gold-light/50' : ''}
                    `}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="font-ui text-sm text-hextech-gold-light flex-1 truncate">
                      {entry.player_name}
                    </span>
                    <span className="font-display text-sm text-hextech-gold">
                      Lv.{entry.level}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Play Again Button */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={resetGame}
          className="btn-hextech w-full py-3 text-base"
        >
          PLAY AGAIN
        </motion.button>
      </motion.div>
    </div>
  );
}

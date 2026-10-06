/**
 * GameHeader Component
 *
 * Top bar while playing: lives, timer, level, score (with floating +points),
 * streak, practice controls, mute and quit.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/useGameStore';
import { LivesDisplay } from './LivesDisplay';
import { Timer } from './Timer';
import { MuteButton } from './MuteButton';
import { GoldIcon } from './Gold';
import { DAILY_LEVELS } from '../utils/difficultySettings';
import { formatPoints } from '../utils/formatting';
import { getStreakMultiplier } from '../utils/scoring';
import { PRACTICE_FILTERS } from '../utils/practiceFilters';

/** League-style gold counter for the score, with a floating "+points" pop when it goes up */
function ScoreDisplay() {
  const score = useGameStore(s => s.score);
  const [delta, setDelta] = useState<{ id: number; value: number } | null>(null);

  useEffect(() => {
    return useGameStore.subscribe((state, prev) => {
      if (state.score > prev.score && state.mode === prev.mode) {
        setDelta({ id: Date.now(), value: state.score - prev.score });
      }
    });
  }, []);

  return (
    <div className="relative">
      <motion.div
        key={delta?.id ?? 0}
        initial={delta ? { scale: 1.12 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        className="gold-counter flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5"
        title="Score"
      >
        <span className="text-2xl sm:text-3xl leading-none flex"><GoldIcon /></span>
        <div className="leading-none">
          <p className="font-ui text-[0.65rem] font-bold text-[#F5C842]/70 uppercase tracking-widest">Score</p>
          <p className="font-ui text-xl sm:text-2xl font-bold text-[#F5C842] tabular-nums">{formatPoints(score)}</p>
        </div>
      </motion.div>
      <AnimatePresence>
        {delta && (
          <motion.span
            key={delta.id}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], y: 26 }}
            transition={{ duration: 1.5 }}
            onAnimationComplete={() => setDelta(null)}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-1 font-ui font-bold text-lg text-[#F5C842] whitespace-nowrap flex items-center gap-1 drop-shadow"
          >
            +{formatPoints(delta.value)} <GoldIcon />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export function GameHeader() {
  const {
    mode,
    currentLevel,
    streak,
    settings,
    practiceFilter,
    levelComplete,
    quitToMenu,
    revealAnswer,
    skipLevel,
    setPracticeFilter,
  } = useGameStore();

  const isPractice = mode === 'practice';
  const multiplier = getStreakMultiplier(streak + 1);

  return (
    <header className="relative z-10 shrink-0 w-full">
      <div className="hextech-panel border-t-0 rounded-t-none">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-6 py-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Left: Quit + lives / practice label */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={quitToMenu}
              className="text-hextech-gold-light/65 hover:text-hextech-gold transition-colors font-ui text-sm px-1"
              title={mode === 'daily' ? 'Back to menu (your Daily progress is saved, but this level is forfeited)' : 'Back to menu'}
            >
              ← <span className="hidden sm:inline">Menu</span>
            </button>
            {isPractice ? (
              <div>
                <p className="font-ui text-[0.75rem] text-hextech-gold-light/65 uppercase tracking-widest">Practice</p>
                <select
                  value={practiceFilter}
                  onChange={e => setPracticeFilter(e.target.value)}
                  className="input-hextech !py-0.5 !px-1.5 !text-sm"
                  aria-label="Practice item pool"
                >
                  {PRACTICE_FILTERS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <LivesDisplay />
            )}
          </div>

          {/* Center: Timer + gold score, or practice controls */}
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            {isPractice ? (
              <div className="flex gap-2">
                <button
                  onClick={revealAnswer}
                  disabled={levelComplete}
                  className="btn-hextech btn-hextech-secondary !px-3 !py-1.5 text-xs disabled:opacity-40"
                >
                  Reveal
                </button>
                <button onClick={skipLevel} className="btn-hextech btn-hextech-secondary !px-3 !py-1.5 text-xs">
                  Skip
                </button>
              </div>
            ) : (
              <>
                {settings.timerDuration > 0 && <Timer />}
                <ScoreDisplay />
              </>
            )}
          </div>

          {/* Right: Level, streak, score, mute */}
          <div className="flex items-center justify-end gap-3 sm:gap-5">
            {!isPractice && streak >= 1 && (
              <div className="text-center hidden sm:block" title={`${streak} perfect level${streak > 1 ? 's' : ''} in a row. Next perfect level scores ×${multiplier}`}>
                <p className="font-ui text-[0.75rem] text-hextech-gold-light/70 uppercase tracking-wider">Streak</p>
                <p className="font-display text-lg text-warning-yellow">🔥{streak}</p>
              </div>
            )}
            <div className="text-right">
              <p className="font-ui text-[0.75rem] text-hextech-gold-light/70 uppercase tracking-wider">
                {isPractice ? 'Item' : 'Level'}
              </p>
              <p className="font-display text-lg sm:text-xl text-gold-gradient tabular-nums">
                {currentLevel}{mode === 'daily' && <span className="text-sm">/{DAILY_LEVELS}</span>}
              </p>
            </div>
            <MuteButton />
          </div>
        </div>
      </div>
    </header>
  );
}

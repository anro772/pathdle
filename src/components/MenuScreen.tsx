/**
 * MenuScreen Component
 *
 * Title screen with the three modes: Daily, Endless and Practice.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../stores/useGameStore';
import { HowToPlay } from './HowToPlay';
import { MuteButton } from './MuteButton';
import { ShareButton } from './ShareButton';
import { DAILY_LEVELS } from '../utils/difficultySettings';
import { formatCountdown, formatPoints } from '../utils/formatting';
import { getDailyKey, getDailyNumber, msUntilNextDaily } from '../utils/seededRandom';
import { buildShareText, outcomesToEmoji } from '../utils/share';
import { getDailyResult, getDailyStats, hasSeenHowToPlay, markHowToPlaySeen } from '../utils/storage';
import { ACHIEVEMENTS } from '../utils/progress';
import { AchievementsModal } from './AchievementsModal';
import { CodexModal } from './CodexModal';
import { DailyStatsPanel } from './DailyStatsPanel';
import { Modal } from './Modal';
import { PRACTICE_FILTERS } from '../utils/practiceFilters';
import type { GameMode } from '../types/items';
import { Gold } from './Gold';

function ModeCard({ title, subtitle, accent, children, delay }: {
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="hextech-panel p-5 flex flex-col"
    >
      <p className={`font-ui text-[0.75rem] uppercase tracking-[0.2em] ${accent}`}>{subtitle}</p>
      <h2 className="font-display text-xl text-hextech-gold mb-3">{title}</h2>
      <div className="flex-1 flex flex-col">{children}</div>
    </motion.div>
  );
}

/** Ticking countdown to the next Daily */
function NextDailyCountdown() {
  const [ms, setMs] = useState(msUntilNextDaily());
  useEffect(() => {
    const interval = setInterval(() => setMs(msUntilNextDaily()), 1000);
    return () => clearInterval(interval);
  }, []);
  return <span className="tabular-nums">{formatCountdown(ms)}</span>;
}

export function MenuScreen() {
  const { gameStatus, loadError, bests, practiceFilter, startGame, setPracticeFilter } = useGameStore();
  const [showHelp, setShowHelp] = useState(() => !hasSeenHowToPlay());
  const [dialog, setDialog] = useState<'codex' | 'achievements' | 'stats' | null>(null);
  const { codex, unlockedAchievements } = useGameStore();
  const dailyStreak = getDailyStats().currentStreak;
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null);

  const isLoading = gameStatus === 'loading';
  const dailyKey = getDailyKey();
  const dailyNumber = getDailyNumber();
  const daily = getDailyResult(dailyKey);

  const closeHelp = () => {
    markHowToPlaySeen();
    setShowHelp(false);
  };

  const play = (mode: GameMode) => {
    setPendingMode(mode);
    void startGame(mode);
  };

  const spinner = (mode: GameMode) =>
    isLoading && pendingMode === mode ? <span className="inline-block w-4 h-4 border-2 border-lol-black border-t-transparent rounded-full animate-spin align-middle" /> : null;

  return (
    <div className="hextech-bg min-h-screen w-full flex flex-col items-center px-4 pt-16 pb-8 sm:py-12">
      {/* Top-right controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => setShowHelp(true)}
          className="w-8 h-8 flex items-center justify-center rounded border border-lol-border text-hextech-gold-light/70 hover:text-hextech-gold hover:border-hextech-gold/60 transition-colors font-display"
          aria-label="How to play"
          title="How to play"
        >
          ?
        </button>
        <MuteButton />
      </div>

      {/* Title */}
      <div className="relative text-center mb-8 sm:mb-10 animate-fade-in-up">
        <h1 className="font-display text-6xl sm:text-8xl text-gold-gradient mb-3 tracking-wider">PATHDLE</h1>
        <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-hextech-gold to-transparent opacity-60 mb-4"></div>
        <p className="font-ui text-lg sm:text-xl text-hextech-gold-light/80">
          How well do you know League of Legends build paths?
        </p>
        <p className="font-ui text-base text-hextech-blue">Rebuild items from memory before time runs out.</p>
      </div>

      {loadError && (
        <p className="relative mb-6 font-ui text-sm text-error-red bg-error-red/10 border border-error-red/40 rounded px-4 py-2">
          {loadError}
        </p>
      )}

      {/* Modes */}
      <div className="relative grid gap-4 w-full max-w-5xl md:grid-cols-3">
        <ModeCard title={`Daily #${dailyNumber}`} subtitle="Same 10 items for everyone" accent="text-hextech-blue" delay={0.05}>
          {dailyStreak > 0 && (
            <p className="font-ui text-xs text-warning-yellow -mt-2 mb-2" title="Days in a row you've finished the Daily">
              🔥 {dailyStreak}-day streak{daily?.finished ? '' : '. Keep it alive!'}
            </p>
          )}
          {daily?.finished ? (
            <>
              <p className="font-ui text-sm text-hextech-gold-light/70 mb-2">
                Done for today: <span className="text-hextech-gold font-semibold">{formatPoints(daily.score)} pts</span>
              </p>
              <p className="text-xl leading-tight mb-3 tracking-wider" aria-label="Daily result">
                {outcomesToEmoji(daily.outcomes, DAILY_LEVELS)}
              </p>
              <ShareButton
                className="w-full mb-3"
                text={buildShareText({
                  mode: 'daily',
                  outcomes: daily.outcomes,
                  score: daily.score,
                  dailyNumber,
                  totalLevels: DAILY_LEVELS,
                  url: window.location.origin,
                })}
              />
              <p className="font-ui text-xs text-hextech-gold-light/65 mt-auto text-center">
                Next Daily in <NextDailyCountdown />
              </p>
            </>
          ) : (
            <>
              <p className="font-ui text-sm text-hextech-gold-light/70 mb-4">
                3 epic components, then 7 legendaries. One attempt, and you can share the result.
              </p>
              {daily && (
                <p className="font-ui text-xs text-warning-yellow mb-2">
                  In progress: {daily.outcomes.length}/{DAILY_LEVELS} levels · {formatPoints(daily.score)} pts
                </p>
              )}
              <button onClick={() => play('daily')} disabled={isLoading} className="btn-hextech w-full mt-auto">
                {spinner('daily')} {daily ? 'RESUME' : 'PLAY DAILY'}
              </button>
            </>
          )}
        </ModeCard>

        <ModeCard title="Endless" subtitle="How far can you go?" accent="text-hextech-gold" delay={0.12}>
          <p className="font-ui text-sm text-hextech-gold-light/70 mb-3">
            3 lives, getting harder every level. Gold checks start at level 6.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-lol-dark/50 border border-lol-border rounded p-2 text-center">
              <p className="font-ui text-[0.75rem] text-hextech-gold-light/65 uppercase tracking-wider">Best level</p>
              <p className="font-display text-xl text-hextech-blue">{bests.endlessLevel || '–'}</p>
            </div>
            <div className="bg-lol-dark/50 border border-lol-border rounded p-2 text-center">
              <p className="font-ui text-[0.75rem] text-hextech-gold-light/65 uppercase tracking-wider">Best score</p>
              <p className="text-xl">{bests.endlessScore ? <Gold amount={bests.endlessScore} /> : <span className="font-display text-hextech-gold">–</span>}</p>
            </div>
          </div>
          <button onClick={() => play('endless')} disabled={isLoading} className="btn-hextech w-full mt-auto">
            {spinner('endless')} START RUN
          </button>
        </ModeCard>

        <ModeCard title="Practice" subtitle="No timer, no pressure" accent="text-success-green" delay={0.19}>
          <p className="font-ui text-sm text-hextech-gold-light/70 mb-3">
            Learn recipes at your own pace. Retry as often as you like, reveal or skip.
          </p>
          <label className="font-ui text-[0.75rem] text-hextech-gold-light/65 uppercase tracking-wider mb-1" htmlFor="practice-filter">
            Item pool
          </label>
          <select
            id="practice-filter"
            value={practiceFilter}
            onChange={e => setPracticeFilter(e.target.value)}
            className="input-hextech !py-2 !text-base mb-4"
          >
            {PRACTICE_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <button onClick={() => play('practice')} disabled={isLoading} className="btn-hextech btn-hextech-secondary w-full mt-auto">
            {spinner('practice')} PRACTICE
          </button>
        </ModeCard>
      </div>

      {/* Collection & stats */}
      <div className="relative flex flex-wrap justify-center gap-2 mt-6">
        <button onClick={() => setDialog('codex')} className="btn-hextech btn-hextech-secondary !px-4 !py-2 text-xs">
          📖 Codex <span className="text-hextech-gold-light/70">{codex.length}</span>
        </button>
        <button onClick={() => setDialog('achievements')} className="btn-hextech btn-hextech-secondary !px-4 !py-2 text-xs">
          🏆 Achievements <span className="text-hextech-gold-light/70">{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span>
        </button>
        <button onClick={() => setDialog('stats')} className="btn-hextech btn-hextech-secondary !px-4 !py-2 text-xs">
          📊 Daily stats
        </button>
      </div>

      <p className="relative mt-10 font-ui text-xs text-hextech-gold-light/45 text-center max-w-xl">
        Item data from Riot Games DataDragon, refreshed daily. Challenger stats are a snapshot from the Riot API.
        Pathdle isn't endorsed by Riot Games.
      </p>

      <AnimatePresence>{showHelp && <HowToPlay onClose={closeHelp} />}</AnimatePresence>
      <AnimatePresence>
        {dialog === 'codex' && <CodexModal onClose={() => setDialog(null)} />}
        {dialog === 'achievements' && <AchievementsModal onClose={() => setDialog(null)} />}
        {dialog === 'stats' && (
          <Modal title="Daily stats" onClose={() => setDialog(null)}>
            <DailyStatsPanel />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * GameOverScreen Component
 *
 * Displays the end of a run with authentic Hextech styling.
 * Shows run stats, records, the share card, leaderboard submission and top scores.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/useGameStore';
import {
  getTopScores,
  isLeaderboardEnabled,
  submitScore,
  type LeaderboardEntry,
  type LeaderboardMode,
} from '../services/LeaderboardService';
import { DAILY_LEVELS } from '../utils/difficultySettings';
import { getDailyNumber } from '../utils/seededRandom';
import { buildShareText, outcomesToEmoji } from '../utils/share';
import { getDailyResult, getPlayerName, saveDailyResult, savePlayerName } from '../utils/storage';
import { Confetti } from './Confetti';
import { ShareButton } from './ShareButton';
import { RunRecap } from './RunRecap';
import { DailyStatsPanel } from './DailyStatsPanel';
import { renderShareImage, shareOrDownloadImage } from '../utils/shareImage';
import { Gold } from './Gold';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

function StatTile({ label, value, accent = 'text-hextech-gold' }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-lol-dark/50 border border-lol-border rounded-lg p-3 text-center">
      <p className="font-ui text-[0.75rem] text-hextech-gold-light/65 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`font-display text-xl sm:text-2xl ${accent}`}>{value}</p>
    </div>
  );
}

function Leaderboard({ mode, dailyDate, refreshKey, highlightId }: {
  mode: LeaderboardMode;
  dailyDate: string | null;
  refreshKey: number;
  highlightId: string | null;
}) {
  const [tab, setTab] = useState<LeaderboardMode>(mode);
  const [loaded, setLoaded] = useState<{ key: string; entries: LeaderboardEntry[]; total: number } | null>(null);
  const requestKey = `${tab}-${refreshKey}`;
  const entries = loaded?.key === requestKey ? loaded.entries : null;
  const total = loaded?.total ?? 0;

  useEffect(() => {
    let cancelled = false;
    getTopScores(tab, tab === 'daily' ? dailyDate ?? undefined : undefined).then(data => {
      if (!cancelled) setLoaded({ key: `${tab}-${refreshKey}`, entries: data.topScores, total: data.totalPlayers });
    });
    return () => {
      cancelled = true;
    };
  }, [tab, dailyDate, refreshKey]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1">
          {(['endless', 'daily'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-display text-[0.8rem] tracking-wider px-2.5 py-1 rounded border transition-colors ${
                tab === t ? 'border-hextech-gold text-hextech-gold bg-hextech-gold/10' : 'border-lol-border text-hextech-gold-light/65 hover:text-hextech-gold'
              }`}
            >
              {t === 'endless' ? 'ENDLESS' : "TODAY'S DAILY"}
            </button>
          ))}
        </div>
        <span className="font-ui text-[0.75rem] text-hextech-gold-light/65">{total.toLocaleString()} scores</span>
      </div>
      <div className="bg-lol-dark/30 border border-lol-border rounded-lg overflow-hidden min-h-24">
        {entries === null ? (
          <p className="p-4 text-center font-ui text-xs text-hextech-gold-light/65">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="p-4 text-center font-ui text-xs text-hextech-gold-light/65">No scores yet. Be the first!</p>
        ) : (
          <ol className="divide-y divide-lol-border/50">
            {entries.map((entry, index) => (
              <li
                key={entry.id}
                className={`flex items-center gap-3 px-3 py-1.5 ${entry.id === highlightId ? 'bg-hextech-blue/15' : index === 0 ? 'bg-hextech-gold/10' : ''}`}
              >
                <span className="font-display text-sm w-6 text-center text-hextech-gold-light/65">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                </span>
                <span className="font-ui text-sm text-hextech-gold-light flex-1 truncate">{entry.player_name}</span>
                <span className="font-ui text-xs text-hextech-gold-light/65">Lv {entry.level}</span>
                <span className="text-sm w-20 text-right"><Gold amount={entry.score} /></span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export function GameOverScreen() {
  const { mode, currentLevel, score, outcomes, bests, bestsAtStart, dailyKey, livesRemaining, runHistory, dataVersion, startGame, quitToMenu } = useGameStore();
  const [imageState, setImageState] = useState<'idle' | 'working'>('idle');

  const leaderboardMode: LeaderboardMode = mode === 'daily' ? 'daily' : 'endless';
  const dailyNumber = getDailyNumber();
  const alreadySubmitted = mode === 'daily' && dailyKey ? !!getDailyResult(dailyKey)?.submitted : false;

  const [playerName, setPlayerName] = useState(getPlayerName);
  const [submitState, setSubmitState] = useState<SubmitState>(alreadySubmitted ? 'success' : 'idle');
  const [percentile, setPercentile] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [myEntryId, setMyEntryId] = useState<string | null>(null);

  const isDaily = mode === 'daily';
  const dailyCleared = isDaily && livesRemaining > 0 && outcomes.length >= DAILY_LEVELS;
  const isNewRecord = mode === 'endless' && score > 0 && score > bestsAtStart.endlessScore;
  const levelReached = isDaily ? outcomes.length : currentLevel;

  const shareText = buildShareText({
    mode: leaderboardMode,
    outcomes,
    score,
    dailyNumber,
    totalLevels: DAILY_LEVELS,
    url: window.location.origin,
  });

  const handleSubmit = async () => {
    const trimmedName = playerName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 20) {
      setErrorMessage('Name must be 1-20 characters');
      return;
    }

    setSubmitState('submitting');
    setErrorMessage('');
    savePlayerName(trimmedName);

    const result = await submitScore({
      playerName: trimmedName,
      mode: leaderboardMode,
      score,
      level: Math.max(1, levelReached),
      dailyDate: dailyKey ?? undefined,
    });

    if (result.success) {
      setSubmitState('success');
      setPercentile(result.percentile);
      setMyEntryId(result.entryId ?? null);
      setRefreshKey(k => k + 1);
      if (isDaily && dailyKey) {
        const saved = getDailyResult(dailyKey);
        if (saved) saveDailyResult(dailyKey, { ...saved, submitted: true });
      }
    } else {
      setSubmitState('error');
      setErrorMessage(result.error || 'Failed to save score');
    }
  };

  const handleSaveImage = async () => {
    if (!dataVersion) return;
    setImageState('working');
    try {
      const blob = await renderShareImage({
        title: isDaily ? `Daily #${dailyNumber}` : `Endless · Level ${currentLevel}`,
        subtitle: isDaily
          ? `${outcomes.filter(o => o !== 'failed').length}/${DAILY_LEVELS} cleared · ${outcomes.filter(o => o === 'perfect').length} perfect`
          : `${outcomes.filter(o => o === 'perfect').length} perfect levels`,
        score,
        outcomes,
        totalLevels: isDaily ? DAILY_LEVELS : undefined,
        itemIds: runHistory.map(r => r.tree.itemId),
        dataVersion,
      });
      if (blob) await shareOrDownloadImage(blob, isDaily ? `pathdle-daily-${dailyNumber}.png` : 'pathdle-endless.png');
    } catch {
      // Share cancelled - nothing to do
    } finally {
      setImageState('idle');
    }
  };

  const title = isDaily ? (dailyCleared ? 'DAILY COMPLETE' : 'OUT OF LIVES') : 'GAME OVER';

  return (
    <div className="hextech-bg min-h-screen w-full flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      {isNewRecord && <Confetti />}

      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="relative z-10 hextech-panel p-5 sm:p-6 max-w-lg w-full my-4"
      >
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="font-display text-3xl text-gold-gradient mb-2">{title}</h1>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-hextech-gold to-transparent"></div>
          {isDaily && <p className="font-ui text-sm text-hextech-gold-light/70 mt-2">Daily #{dailyNumber}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatTile label="Score" value={<Gold amount={score} />} />
          {isDaily ? (
            <StatTile label="Cleared" value={`${outcomes.filter(o => o !== 'failed').length}/${DAILY_LEVELS}`} accent="text-hextech-blue" />
          ) : (
            <StatTile label="Level" value={String(currentLevel)} accent="text-hextech-blue" />
          )}
          {isDaily ? (
            <StatTile label="Perfect" value={String(outcomes.filter(o => o === 'perfect').length)} accent="text-success-green" />
          ) : (
            <StatTile label="Best" value={<Gold amount={bests.endlessScore} />} />
          )}
        </div>

        {isNewRecord && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            className="text-center mb-4"
          >
            <span className="inline-block px-3 py-1.5 bg-hextech-gold/20 border border-hextech-gold rounded-full font-display text-xs text-hextech-gold tracking-wider">
              ⭐ NEW PERSONAL BEST
            </span>
          </motion.div>
        )}

        {/* Share card */}
        <div className="bg-lol-dark/50 border border-lol-border rounded-lg p-3 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-lg leading-tight tracking-wider whitespace-pre text-center sm:text-left">
            {outcomesToEmoji(outcomes, isDaily ? DAILY_LEVELS : undefined) || '–'}
          </p>
          <div className="flex sm:flex-col gap-2 shrink-0">
            <ShareButton text={shareText} />
            <button
              onClick={() => void handleSaveImage()}
              disabled={imageState === 'working'}
              className="btn-hextech btn-hextech-secondary px-4 py-2 text-sm disabled:opacity-50"
            >
              {imageState === 'working' ? '…' : 'SAVE IMAGE'}
            </button>
          </div>
        </div>

        <RunRecap />

        {isDaily && (
          <div className="mb-4 bg-lol-dark/30 border border-lol-border rounded-lg p-3">
            <DailyStatsPanel highlightCleared={outcomes.filter(o => o !== 'failed').length} />
          </div>
        )}

        {/* Percentile */}
        {percentile !== null && percentile > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-4 p-3 bg-gradient-to-r from-hextech-blue/20 via-hextech-blue/10 to-hextech-blue/20 border border-hextech-blue/50 rounded-lg text-center"
          >
            <p className="font-ui text-xs text-hextech-blue/80 uppercase tracking-wider">You beat</p>
            <p className="font-display text-3xl text-hextech-blue">{percentile.toFixed(1)}%</p>
            <p className="font-ui text-xs text-hextech-gold-light/65">of {isDaily ? "today's Daily players" : 'Endless runs'}</p>
          </motion.div>
        )}

        {/* Leaderboard */}
        {isLeaderboardEnabled() && (
          <div className="mb-4 space-y-3">
            {submitState === 'success' ? (
              <p className="text-center p-2 bg-success-green/10 border border-success-green/50 rounded-lg font-ui text-sm text-success-green">
                Score saved to the leaderboard!
              </p>
            ) : score > 0 ? (
              <div>
                <label htmlFor="player-name" className="font-display text-[0.75rem] text-hextech-gold tracking-wider block mb-1">
                  SAVE TO LEADERBOARD
                </label>
                <form
                  className="flex gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    void handleSubmit();
                  }}
                >
                  <input
                    id="player-name"
                    type="text"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    placeholder="Summoner name"
                    maxLength={20}
                    disabled={submitState === 'submitting'}
                    className="input-hextech flex-1 min-w-0 !py-2 !px-3 !text-sm"
                  />
                  <button
                    type="submit"
                    disabled={submitState === 'submitting' || playerName.trim().length === 0}
                    className="btn-hextech btn-hextech-secondary !px-4 !py-2 text-sm disabled:opacity-50"
                  >
                    {submitState === 'submitting' ? '…' : 'SAVE'}
                  </button>
                </form>
                {errorMessage && <p className="font-ui text-xs text-error-red mt-1">{errorMessage}</p>}
              </div>
            ) : null}

            <Leaderboard mode={leaderboardMode} dailyDate={dailyKey} refreshKey={refreshKey} highlightId={myEntryId} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!isDaily && (
            <button onClick={() => void startGame(mode)} className="btn-hextech flex-1 py-3 text-base">
              PLAY AGAIN
            </button>
          )}
          <button
            onClick={quitToMenu}
            className={`btn-hextech ${isDaily ? '' : 'btn-hextech-secondary'} flex-1 py-3 text-base`}
          >
            MENU
          </button>
        </div>
      </motion.div>
    </div>
  );
}

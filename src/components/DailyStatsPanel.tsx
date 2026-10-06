/**
 * DailyStatsPanel Component
 *
 * Wordle-style Daily stats: played, streaks, scores and a histogram of
 * levels cleared. Built from the Daily results saved in localStorage.
 */

import { getDailyStats } from '../utils/storage';
import { formatPoints } from '../utils/formatting';
import { DAILY_LEVELS } from '../utils/difficultySettings';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-xl text-hextech-gold">{value}</p>
      <p className="font-ui text-[0.75rem] text-hextech-gold-light/65 uppercase tracking-wider leading-tight">{label}</p>
    </div>
  );
}

export function DailyStatsPanel({ highlightCleared }: { highlightCleared?: number }) {
  const stats = getDailyStats();
  const maxCount = Math.max(1, ...stats.histogram);

  if (stats.played === 0) {
    return <p className="font-ui text-sm text-hextech-gold-light/70 text-center py-4">Finish your first Daily to start your stats.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-5 gap-1 mb-4">
        <Stat label="Played" value={String(stats.played)} />
        <Stat label="Streak" value={`🔥${stats.currentStreak}`} />
        <Stat label="Best streak" value={String(stats.bestStreak)} />
        <Stat label="Avg score" value={formatPoints(stats.averageScore)} />
        <Stat label="Best" value={formatPoints(stats.bestScore)} />
      </div>

      <p className="font-display text-[0.75rem] text-hextech-gold tracking-wider mb-1.5">LEVELS CLEARED</p>
      <div className="space-y-0.5">
        {stats.histogram.map((count, cleared) => (
          <div key={cleared} className="flex items-center gap-2">
            <span className="font-ui text-xs text-hextech-gold-light/70 w-5 text-right tabular-nums">{cleared}</span>
            <div className="flex-1">
              <div
                className={`h-4 rounded-sm flex items-center justify-end px-1 font-ui text-[0.75rem] font-bold min-w-5 ${
                  cleared === highlightCleared ? 'bg-hextech-blue text-lol-black' : count > 0 ? 'bg-hextech-gold/60 text-lol-black' : 'bg-lol-border/40 text-hextech-gold-light/55'
                }`}
                style={{ width: `${Math.max(6, (count / maxCount) * 100)}%` }}
              >
                {count}
              </div>
            </div>
          </div>
        )).reverse()}
      </div>
      <p className="font-ui text-[0.75rem] text-hextech-gold-light/55 mt-2 text-center">Out of {DAILY_LEVELS} levels · stats are stored on this device</p>
    </div>
  );
}

/**
 * LevelCompleteCard Component
 *
 * Shown after every level: how it went, the points breakdown and a fun fact
 * from the Challenger meta snapshot (or what an epic component builds into).
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../stores/useGameStore';
import { getChampionIconUrl, getItemImageUrl } from '../services/RiotService';
import { Confetti } from './Confetti';
import { ChampionQuiz } from './ChampionQuiz';
import { hasChampionQuiz } from '../utils/championQuiz';
import { tooltipProps } from '../utils/tooltip';
import { Gold } from './Gold';

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between font-ui text-sm">
      <span className="text-hextech-gold-light/70">{label}</span>
      <span className={accent ? 'text-warning-yellow font-semibold' : 'text-hextech-gold-light'}>{value}</span>
    </div>
  );
}

/** Challenger popularity for finished items, "builds into" for epic components */
function ItemFact() {
  const { targetItem, meta, allItems, pools, dataVersion, mode, bonusClaimed } = useGameStore();
  if (!targetItem || !allItems || !pools || !dataVersion) return null;

  const id = targetItem.itemId;
  const isEpic = !!pools.epics[id];

  if (isEpic) {
    const into = (allItems[id].into ?? [])
      .filter(intoId => pools.legendaries[intoId] || pools.epics[intoId])
      .sort((a, b) => (meta?.items[b]?.players ?? 0) - (meta?.items[a]?.players ?? 0))
      .slice(0, 8);
    if (into.length === 0) return null;

    return (
      <div className="bg-lol-dark/60 border border-lol-border rounded-lg p-3">
        <p className="font-ui text-[0.75rem] text-hextech-gold-light/65 uppercase tracking-wider mb-2">Builds into</p>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {into.map(intoId => (
            <img
              {...tooltipProps(intoId)}
              key={intoId}
              src={getItemImageUrl(intoId, dataVersion)}
              alt={allItems[intoId]?.name}
              title={allItems[intoId]?.name}
              className="w-9 h-9 rounded border border-hextech-gold/30"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!meta) return null;
  const stats = meta.items[id];
  const sample = `${meta.matchCount} Challenger games${meta.patch ? ` · patch ${meta.patch}` : ''}`;

  if (!stats) {
    return (
      <div className="bg-lol-dark/60 border border-lol-border rounded-lg p-3 text-center">
        <p className="font-ui text-sm text-hextech-gold-light">
          💎 <span className="text-hextech-blue font-semibold">Hidden gem.</span> Not one Challenger player finished a game with it.
        </p>
        <p className="font-ui text-[0.75rem] text-hextech-gold-light/55 mt-1">{sample}</p>
      </div>
    );
  }

  return (
    <div className="bg-lol-dark/60 border border-lol-border rounded-lg p-3">
      <p className="font-ui text-sm text-hextech-gold-light text-center">
        Built by <span className="text-hextech-blue font-semibold">{(stats.pickRate * 100).toFixed(1)}%</span> of Challenger players
        {' · '}
        <span className={stats.winRate >= 0.5 ? 'text-success-green' : 'text-error-red'}>{(stats.winRate * 100).toFixed(0)}% WR</span>
      </p>
      <div className="flex justify-center gap-1.5 mt-2">
        {!bonusClaimed && hasChampionQuiz(meta, id, mode === 'practice') ? (
          <p className="font-ui text-xs text-hextech-gold-light/55 h-9 flex items-center">Top builders revealed after the bonus question</p>
        ) : stats.topChamps.slice(0, 5).map(champ => (
          <div key={champ.name} className="relative" title={`${champ.name} (${champ.count})`}>
            <img
              src={getChampionIconUrl(champ.name, dataVersion)}
              alt={champ.name}
              className="w-9 h-9 rounded-full border border-hextech-gold/40"
              onError={e => (e.currentTarget.style.visibility = 'hidden')}
            />
          </div>
        ))}
      </div>
      <p className="font-ui text-[0.75rem] text-hextech-gold-light/55 mt-1.5 text-center">{sample}</p>
    </div>
  );
}

export function LevelCompleteCard() {
  const { levelResult, targetItem, dataVersion, mode, currentLevel, proceedToNextLevel } = useGameStore();
  // Collapse the card to look at the revealed build path (what you missed)
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'v') setMinimized(m => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!levelResult || !targetItem || !dataVersion) return null;

  const isPractice = mode === 'practice';
  const { outcome, score } = levelResult;

  const title = levelResult.revealed
    ? { text: 'REVEALED', color: 'text-hextech-gold' }
    : levelResult.timedOut
      ? { text: "TIME'S UP!", color: 'text-error-red' }
      : levelResult.goldCheck === 'failed'
        ? { text: 'GOLD CHECK MISSED', color: 'text-warning-yellow' }
        : outcome === 'perfect'
          ? { text: isPractice ? 'NAILED IT!' : 'PERFECT!', color: 'text-success-green' }
          : { text: 'CLEARED', color: 'text-warning-yellow' };

  const buttonLabel = levelResult.isFinalLevel ? 'SEE RESULTS' : isPractice ? 'NEXT ITEM' : 'NEXT LEVEL';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto transition-colors ${
        minimized ? 'bg-transparent pointer-events-none' : 'bg-black/45'
      }`}
    >
      {outcome === 'perfect' && !levelResult.revealed && <Confetti count={isPractice ? 18 : 30} />}

      {/* Collapsed: a small bar so the whole build path is visible */}
      <div className="fixed bottom-4 inset-x-0 flex justify-center px-4 pointer-events-none">
      <AnimatePresence>
        {minimized && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="pointer-events-auto hextech-panel !border-hextech-gold/60 px-4 py-2.5 flex items-center gap-3 shadow-2xl w-full max-w-xl"
          >
            <span className={`font-display text-base ${title.color} whitespace-nowrap`}>{title.text}</span>
            <span className="font-ui text-sm text-hextech-gold-light/70 truncate hidden sm:inline">Board view</span>
            <button
              onClick={() => setMinimized(false)}
              className="ml-auto shrink-0 font-ui text-sm font-bold px-3 py-1.5 rounded border border-hextech-gold/50 text-hextech-gold hover:bg-hextech-gold/10"
            >
              Show results <kbd className="kbd hidden sm:inline-block">V</kbd>
            </button>
            <button onClick={proceedToNextLevel} className="btn-hextech shrink-0 !px-4 !py-2 text-sm">
              {buttonLabel} <kbd className="kbd kbd-dark ml-1 hidden sm:inline-block">Enter</kbd>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className={`relative hextech-panel p-5 sm:p-6 w-full max-w-sm my-auto ${minimized ? 'hidden' : ''}`}
      >
        <button
          onClick={() => setMinimized(true)}
          className="absolute top-2.5 right-2.5 font-ui text-xs font-bold px-2 py-1 rounded border border-lol-border text-hextech-gold-light/80 hover:text-hextech-gold hover:border-hextech-gold/60 transition-colors"
          title="Hide this card to see the full build path (V or Esc)"
        >
          👁 View board
        </button>
        <div className="text-center mb-4 pt-5">
          <h2 className={`font-display text-3xl mb-3 ${title.color}`}>{title.text}</h2>
          <div className="flex items-center justify-center gap-3">
            <div className="item-slot p-1">
              <img {...tooltipProps(targetItem.itemId)} src={getItemImageUrl(targetItem.itemId, dataVersion)} alt={targetItem.itemName} className="w-12 h-12" />
            </div>
            <div className="text-left">
              <p className="font-display text-base text-hextech-gold leading-tight">{targetItem.itemName}</p>
              <p className="font-ui text-sm text-yellow-400"><Gold amount={targetItem.totalCost} /></p>
            </div>
          </div>
        </div>

        {!isPractice && (
          <div className="space-y-1 mb-4 border-y border-lol-border py-3">
            {outcome === 'failed' ? (
              <Row label={`Level ${currentLevel}`} value="0 pts" />
            ) : (
              <>
                <Row label="Level cleared" value={`+${score.base}`} />
                {score.timeBonus > 0 && <Row label="Time bonus" value={`+${score.timeBonus}`} />}
                {score.goldBonus > 0 && <Row label="Gold answers" value={`+${score.goldBonus}`} />}
                {score.buyAllMultiplier > 1 && <Row label="Buy All" value={`×${score.buyAllMultiplier}`} accent />}
                {score.streakMultiplier > 1 && <Row label={`🔥 ${score.streak} streak`} value={`×${score.streakMultiplier}`} accent />}
                {score.hintPenalty > 0 && <Row label="💡 Hints" value={`−${score.hintPenalty}`} />}
              </>
            )}
            <div className="flex justify-between pt-1">
              <span className="font-display text-sm text-hextech-gold">Points</span>
              <span className="text-xl"><Gold amount={score.total} prefix="+" /></span>
            </div>
          </div>
        )}

        {levelResult.newCodexEntry && (
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="text-center font-ui text-xs text-hextech-blue mb-3"
          >
            📖 New item added to your Codex!
          </motion.p>
        )}

        {!isPractice && <ChampionQuiz key={currentLevel} itemId={targetItem.itemId} />}

        <div className="mb-5">
          <ItemFact />
        </div>

        <button onClick={proceedToNextLevel} className="btn-hextech w-full text-base py-3" autoFocus>
          {buttonLabel} <kbd className="kbd kbd-dark ml-1">Enter</kbd>
        </button>
      </motion.div>
    </motion.div>
  );
}

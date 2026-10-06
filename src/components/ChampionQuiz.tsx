/**
 * ChampionQuiz Component
 *
 * "Who builds this most?" bonus question on the level-complete card.
 * Three champion icons; the Challenger snapshot's top builder is worth +50 points.
 * Hotkeys 1-3 pick an answer.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../stores/useGameStore';
import { getChampionIconUrl } from '../services/RiotService';
import { buildChampionQuiz, CHAMPION_BONUS_POINTS } from '../utils/championQuiz';
import { seededRng } from '../utils/seededRandom';
import { playSound } from '../utils/sound';

export function ChampionQuiz({ itemId }: { itemId: string }) {
  const { meta, dataVersion, mode, dailyKey, currentLevel, claimChampionBonus } = useGameStore();

  // Same question for everyone in the Daily
  const [quiz] = useState(() =>
    buildChampionQuiz(meta, itemId, mode === 'daily' && dailyKey ? seededRng(dailyKey, currentLevel, 'champ') : Math.random)
  );
  const [picked, setPicked] = useState<string | null>(null);

  const answer = (name: string) => {
    if (picked || !quiz) return;
    const correct = quiz.correct.includes(name);
    setPicked(name);
    playSound(correct ? 'correct' : 'wrong');
    claimChampionBonus(correct);
  };

  useEffect(() => {
    if (!quiz) return;
    const onKey = (event: KeyboardEvent) => {
      const index = ['1', '2', '3'].indexOf(event.key);
      if (index >= 0 && quiz.options[index]) {
        event.preventDefault();
        answer(quiz.options[index]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!quiz || !dataVersion) return null;

  const wasRight = picked !== null && quiz.correct.includes(picked);

  return (
    <div className="bg-lol-dark/60 border border-hextech-blue/30 rounded-lg p-3 mb-3">
      <p className="font-ui text-xs text-hextech-gold-light/80 text-center mb-2">
        <span className="text-hextech-blue font-semibold">Bonus:</span> which Challenger champion builds this the most?
        <span className="text-success-green"> +{CHAMPION_BONUS_POINTS}</span>
      </p>
      <div className="flex justify-center gap-3">
        {quiz.options.map((name, i) => {
          const isCorrect = quiz.correct.includes(name);
          const state = picked === null ? 'idle' : isCorrect ? 'right' : picked === name ? 'wrong' : 'dim';
          return (
            <motion.button
              key={name}
              onClick={() => answer(name)}
              disabled={picked !== null}
              whileTap={picked === null ? { scale: 0.9 } : {}}
              animate={state === 'wrong' ? { x: [0, -5, 5, -3, 3, 0] } : {}}
              className="flex flex-col items-center gap-1 group"
              title={name}
            >
              <span className="relative">
                <img
                  src={getChampionIconUrl(name, dataVersion)}
                  alt={name}
                  className={`w-12 h-12 rounded-full border-2 transition-all ${
                    state === 'right' ? 'border-success-green shadow-[0_0_12px_rgba(11,218,81,0.6)]'
                      : state === 'wrong' ? 'border-error-red opacity-70'
                      : state === 'dim' ? 'border-lol-border opacity-40'
                      : 'border-hextech-gold/40 group-hover:border-hextech-gold'
                  }`}
                />
                {picked === null && <span className="kbd absolute -top-1 -left-1 hidden sm:inline-block">{i + 1}</span>}
              </span>
              <span className="font-ui text-[0.75rem] text-hextech-gold-light/70 max-w-16 truncate">{name}</span>
            </motion.button>
          );
        })}
      </div>
      {picked !== null && (
        <p className={`font-ui text-xs text-center mt-1.5 ${wasRight ? 'text-success-green' : 'text-error-red'}`}>
          {wasRight ? `Correct! +${CHAMPION_BONUS_POINTS} points` : `It's ${quiz.correct.join(' / ')}`}
        </p>
      )}
    </div>
  );
}

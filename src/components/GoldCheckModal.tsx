/**
 * GoldCheckModal Component
 *
 * A modal that appears after completing all components at Level 6+.
 * Players must pick the correct cost for randomly selected Row 2 components.
 * At Level 10+, also includes a final item total gold check.
 */

import { motion } from 'framer-motion';
import { useGameStore } from '../stores/useGameStore';
import { getItemImageUrl } from '../services/RiotService';
import { playSound } from '../utils/sound';
import { GOLD_CHECK_HOTKEYS } from '../hooks/useHotkeys';
import { Gold } from './Gold';

interface GoldQuestionProps {
  itemId: string;
  itemName: string;
  label: string;
  options: [number, number];
  selectedAnswer: number | null;
  hotkeys?: [string, string];
  highlight?: boolean;
  onSelect: (gold: number) => void;
}

/**
 * One gold question: item icon, name and two gold options.
 */
function GoldQuestion({ itemId, itemName, label, options, selectedAnswer, hotkeys, highlight, onSelect }: GoldQuestionProps) {
  const dataVersion = useGameStore(s => s.dataVersion);
  if (!dataVersion) return null;

  return (
    <div className={`hextech-panel p-3 sm:p-4 flex flex-col items-center w-full sm:w-[180px] ${highlight ? 'border-2 !border-hextech-gold/60' : ''}`}>
      <div className="flex sm:flex-col items-center gap-3 sm:gap-0 w-full sm:w-auto mb-3">
        <div className={`item-slot p-1.5 sm:mb-2 shrink-0 ${highlight ? '!border-hextech-gold' : ''}`}>
          <img src={getItemImageUrl(itemId, dataVersion)} alt={itemName} className="w-11 h-11 sm:w-14 sm:h-14" />
        </div>
        <div className="sm:text-center">
          <p className={`font-display text-sm leading-tight ${highlight ? 'text-gold-gradient' : 'text-hextech-gold'}`}>{itemName}</p>
          <p className="font-ui text-[0.75rem] text-hextech-gold-light/70 uppercase tracking-wider">{label}</p>
        </div>
      </div>

      <div className="flex gap-2 w-full">
        {options.map((gold, i) => (
          <button
            key={gold}
            onClick={() => {
              playSound('select');
              onSelect(gold);
            }}
            className={`
              relative flex-1 py-2.5 px-3 rounded-lg font-ui text-base font-bold transition-all duration-200
              ${selectedAnswer === gold
                ? 'bg-gradient-to-b from-yellow-600/50 to-yellow-800/50 border-2 border-yellow-400 text-yellow-200 shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                : 'bg-gradient-to-b from-[#1e2328] to-[#0a0c0e] border-2 border-[#5c5b57]/60 text-hextech-gold-light/70 hover:border-hextech-gold/60 hover:text-hextech-gold'
              }
            `}
          >
            {hotkeys && <span className="kbd absolute top-0.5 left-0.5 hidden sm:inline-block">{hotkeys[i]}</span>}
            <Gold amount={gold} />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Main GoldCheckModal component.
 */
export function GoldCheckModal() {
  const { goldCheckState, targetItem, submitGoldCheck, selectGoldCheckAnswer, selectFinalGoldAnswer } = useGameStore();

  const allAnswered =
    goldCheckState.items.every(item => item.selectedAnswer !== null) &&
    (!goldCheckState.finalItemCheck || goldCheckState.finalItemCheck.selectedAnswer !== null);

  const timerColor =
    goldCheckState.timeRemaining <= 3
      ? 'timer-urgent'
      : goldCheckState.timeRemaining <= 5
        ? 'timer-warning'
        : 'timer-calm';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="hextech-panel p-5 sm:p-6 max-w-2xl w-full my-auto"
      >
        <div className="text-center mb-4">
          <h2 className="font-display text-2xl text-hextech-gold mb-1 tracking-wider">GOLD CHECK</h2>
          <p className="font-ui text-sm text-hextech-gold-light/70">
            What does each item cost in total? Every right answer is worth +50 points.
          </p>
        </div>

        <div className="flex justify-center mb-4">
          <div className={`font-display text-4xl tabular-nums ${timerColor}`}>{goldCheckState.timeRemaining}s</div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3 sm:gap-4 mb-5">
          {goldCheckState.items.map((item, i) => (
            <GoldQuestion
              key={item.componentIndex}
              itemId={item.itemId}
              itemName={item.itemName}
              label="Item cost"
              options={item.options}
              selectedAnswer={item.selectedAnswer}
              hotkeys={GOLD_CHECK_HOTKEYS[i]}
              onSelect={gold => selectGoldCheckAnswer(item.componentIndex, gold)}
            />
          ))}
          {goldCheckState.finalItemCheck && targetItem && (
            <GoldQuestion
              itemId={targetItem.itemId}
              itemName={targetItem.itemName}
              label="Total cost"
              options={goldCheckState.finalItemCheck.options}
              selectedAnswer={goldCheckState.finalItemCheck.selectedAnswer}
              hotkeys={GOLD_CHECK_HOTKEYS[goldCheckState.items.length]}
              highlight
              onSelect={selectFinalGoldAnswer}
            />
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={submitGoldCheck}
            disabled={!allAnswered}
            className={`btn-hextech px-8 py-3 text-base ${!allAnswered ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {allAnswered ? <>CONFIRM <kbd className="kbd kbd-dark ml-1">Enter</kbd></> : 'PICK ALL ANSWERS'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * GoldCheckModal Component
 *
 * A modal that appears after completing all components at Level 6+.
 * Players must identify the correct combine cost for randomly selected Row 2 components.
 * At Level 10+, also includes a final item total gold check.
 */

import { motion } from 'framer-motion';
import { useGameStore, type GoldCheckItem } from '../stores/useGameStore';
import { getItemImageUrl } from '../services/RiotService';
import { formatGold } from '../utils/formatting';

/**
 * Individual gold check card for a Row 2 component.
 */
function GoldCheckItemCard({ item }: { item: GoldCheckItem }) {
  const { dataVersion, selectGoldCheckAnswer } = useGameStore();

  if (!dataVersion) return null;

  return (
    <div className="hextech-panel p-4 flex flex-col items-center">
      {/* Item Icon and Name */}
      <div className="item-slot p-2 mb-3">
        <img
          src={getItemImageUrl(item.itemId, dataVersion)}
          alt={item.itemName}
          className="w-14 h-14"
        />
      </div>
      <p className="font-display text-sm text-hextech-gold mb-1 text-center leading-tight">
        {item.itemName}
      </p>
      <p className="font-ui text-[10px] text-hextech-gold-light/60 uppercase tracking-wider mb-3">
        Combine Cost
      </p>

      {/* Gold Options (2 buttons) */}
      <div className="flex gap-2 w-full">
        {item.options.map((gold) => (
          <button
            key={gold}
            onClick={() => selectGoldCheckAnswer(item.componentIndex, gold)}
            className={`
              flex-1 py-2.5 px-3 rounded border-2 font-ui text-base font-bold
              transition-all duration-150
              ${item.selectedAnswer === gold
                ? 'bg-yellow-500/30 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                : 'bg-lol-black/60 border-lol-border text-hextech-gold-light/60 hover:border-yellow-500/50 hover:bg-lol-dark hover:text-yellow-400'
              }
            `}
          >
            {formatGold(gold)}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Final item gold check card (Level 10+).
 */
function FinalGoldCheckCard() {
  const { goldCheckState, targetItem, dataVersion, selectFinalGoldAnswer } = useGameStore();

  if (!goldCheckState.finalItemCheck || !targetItem || !dataVersion) return null;

  const { options, selectedAnswer, correctGold: _ } = goldCheckState.finalItemCheck;

  return (
    <div className="hextech-panel p-4 flex flex-col items-center border-2 border-hextech-gold/50">
      {/* Final Item Icon and Name */}
      <div className="item-slot p-2 mb-3 border-hextech-gold">
        <img
          src={getItemImageUrl(targetItem.itemId, dataVersion)}
          alt={targetItem.itemName}
          className="w-16 h-16"
        />
      </div>
      <p className="font-display text-base text-gold-gradient mb-1 text-center leading-tight">
        {targetItem.itemName}
      </p>
      <p className="font-ui text-[10px] text-hextech-gold-light/60 uppercase tracking-wider mb-3">
        Total Cost
      </p>

      {/* Gold Options (2 buttons) */}
      <div className="flex gap-2 w-full">
        {options.map((gold) => (
          <button
            key={gold}
            onClick={() => selectFinalGoldAnswer(gold)}
            className={`
              flex-1 py-2.5 px-3 rounded border-2 font-ui text-base font-bold
              transition-all duration-150
              ${selectedAnswer === gold
                ? 'bg-yellow-500/30 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                : 'bg-lol-black/60 border-lol-border text-hextech-gold-light/60 hover:border-yellow-500/50 hover:bg-lol-dark hover:text-yellow-400'
              }
            `}
          >
            {formatGold(gold)}
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
  const { goldCheckState, submitGoldCheck, currentLevel } = useGameStore();

  // Check if all questions are answered
  const componentAnswersComplete = goldCheckState.items.every(
    (item) => item.selectedAnswer !== null
  );
  const finalAnswerComplete =
    !goldCheckState.finalItemCheck || goldCheckState.finalItemCheck.selectedAnswer !== null;
  const allAnswered = componentAnswersComplete && finalAnswerComplete;

  // Timer color based on time remaining
  const timerColor =
    goldCheckState.timeRemaining <= 3
      ? 'text-error-red'
      : goldCheckState.timeRemaining <= 5
        ? 'text-warning-yellow'
        : 'text-hextech-blue';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="hextech-panel p-6 max-w-2xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="font-display text-2xl text-hextech-gold mb-2 tracking-wider">
            GOLD CHECK
          </h2>
          <p className="font-ui text-sm text-hextech-gold-light/70">
            Select the correct combine cost for each component
          </p>
        </div>

        {/* Timer */}
        <div className="flex justify-center mb-6">
          <div className={`font-display text-4xl ${timerColor} transition-colors`}>
            {goldCheckState.timeRemaining}s
          </div>
        </div>

        {/* Gold Check Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {goldCheckState.items.map((item) => (
            <GoldCheckItemCard key={item.componentIndex} item={item} />
          ))}
        </div>

        {/* Final Item Check (Level 10+) */}
        {goldCheckState.finalItemCheck && currentLevel >= 10 && (
          <div className="mb-6">
            <div className="text-center mb-3">
              <p className="font-ui text-xs text-hextech-gold-light/60 uppercase tracking-wider">
                Final Item
              </p>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-xs">
                <FinalGoldCheckCard />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            onClick={submitGoldCheck}
            disabled={!allAnswered}
            className={`
              btn-hextech px-8 py-3 text-base
              ${!allAnswered ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {allAnswered ? 'CONFIRM' : 'SELECT ALL ANSWERS'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

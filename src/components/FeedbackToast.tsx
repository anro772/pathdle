/**
 * FeedbackToast Component
 *
 * Short message at the bottom of the screen: wrong answers show the correct recipe,
 * right answers get a quick confirmation.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../stores/useGameStore';
import { getItemImageUrl } from '../services/RiotService';

const STYLES = {
  wrong: 'border-error-red/70 text-error-red',
  correct: 'border-success-green/70 text-success-green',
  info: 'border-hextech-blue/70 text-hextech-blue',
};

export function FeedbackToast() {
  const feedback = useGameStore(s => s.feedback);
  const allItems = useGameStore(s => s.allItems);
  const dataVersion = useGameStore(s => s.dataVersion);
  const dismissFeedback = useGameStore(s => s.dismissFeedback);

  useEffect(() => {
    if (!feedback) return;
    const duration = feedback.itemIds ? 3500 : feedback.kind === 'correct' ? 1200 : 2200;
    const timeout = setTimeout(dismissFeedback, duration);
    return () => clearTimeout(timeout);
  }, [feedback, dismissFeedback]);

  return (
    <div className="fixed bottom-4 inset-x-0 flex justify-center z-[60] pointer-events-none px-4">
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key={feedback.id}
            initial={{ y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`hextech-panel border-2 ${STYLES[feedback.kind]} px-4 py-2.5 flex items-center gap-3 shadow-2xl max-w-full`}
            role="status"
          >
            <span className="font-display text-sm">
              {feedback.kind === 'wrong' ? '✗' : feedback.kind === 'correct' ? '✓' : 'ℹ'}
            </span>
            <span className="font-ui text-sm text-hextech-gold-light">{feedback.message}</span>
            {feedback.itemIds && dataVersion && (
              <div className="flex gap-1 flex-wrap">
                {feedback.itemIds.map((id, i) => (
                  <img
                    key={`${id}-${i}`}
                    src={getItemImageUrl(id, dataVersion)}
                    alt={allItems?.[id]?.name ?? ''}
                    title={allItems?.[id]?.name}
                    className="w-8 h-8 rounded border border-hextech-gold/40"
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

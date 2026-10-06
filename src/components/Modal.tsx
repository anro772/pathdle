/**
 * Modal Component - shared overlay + Hextech panel for menu dialogs.
 * Closes on backdrop click or Escape.
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';

export function Modal({ title, onClose, children, wide = false }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className={`hextech-panel p-4 sm:p-6 w-full my-auto ${wide ? 'max-w-3xl' : 'max-w-md'}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl sm:text-2xl text-gold-gradient">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded border border-lol-border text-hextech-gold-light/70 hover:text-hextech-gold hover:border-hextech-gold/60"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

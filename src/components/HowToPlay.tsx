/**
 * HowToPlay Component
 *
 * Rules overlay: shown on the first visit and reopenable from the menu.
 */

import { motion } from 'framer-motion';

const STEPS = [
  {
    icon: '🎯',
    title: 'Rebuild the item',
    text: 'You get a target item. Its components are hidden behind "?" slots: work out what goes in each one.',
  },
  {
    icon: '🛒',
    title: 'Buy each component',
    text: 'The shop only sells basic items, so you build each component from its parts. Example: for Giant\'s Belt, pick a Ruby Crystal, not the belt itself. A basic slot (like Long Sword) is bought directly.',
  },
  {
    icon: '💡',
    title: 'Stuck? Use a clue',
    text: 'Hint shows one stat of the hidden component (−25 points each). Peek reveals which component it is (1 per run).',
  },
  {
    icon: '⚡',
    title: 'Or buy it all at once',
    text: 'Know the whole recipe? Click the target item (or press B) and pick every base component for a ×1.5 bonus.',
  },
  {
    icon: '💰',
    title: 'Know your gold',
    text: 'From level 6 a gold check asks what the components cost. From level 10 it asks the full item cost too.',
  },
];

const HOTKEYS: Array<[string, string]> = [
  ['1-4 Q-R A-F Z-V', 'Pick shop items (same layout as the grid)'],
  ['Enter', 'Purchase / continue'],
  ['Backspace', 'Remove the last cart item'],
  ['Tab / ← →', 'Switch component slot'],
  ['B', 'Buy All mode'],
  ['H', 'Hint: one stat of the hidden component (−25)'],
  ['P', 'Peek: reveal the hidden component (1 per run)'],
  ['V', 'After a level: hide the results to review the build path'],
];

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="hextech-panel p-5 sm:p-7 max-w-xl w-full my-auto"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="how-to-play-title"
      >
        <h2 id="how-to-play-title" className="font-display text-2xl text-gold-gradient text-center mb-5">How to play</h2>

        <ol className="space-y-3 mb-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3 items-start">
              <span className="text-2xl w-8 text-center shrink-0">{step.icon}</span>
              <div>
                <p className="font-display text-sm text-hextech-gold">{i + 1}. {step.title}</p>
                <p className="font-ui text-sm text-hextech-gold-light/75 leading-snug">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <div className="bg-lol-dark/60 border border-lol-border rounded-lg p-3">
            <p className="font-display text-xs text-hextech-gold mb-2">Lives & scoring</p>
            <ul className="font-ui text-xs text-hextech-gold-light/75 space-y-1">
              <li>❤️ 3 lives. A wrong buy, a missed gold check or running out of time costs one.</li>
              <li>⏱️ Faster = more points.</li>
              <li>🔥 Perfect levels in a row multiply your points, up to ×2.</li>
              <li>🔒 Hint items are already in your cart.</li>
              <li>🧠 After a level, name the champion who builds the item most in Challenger for +50.</li>
              <li>📖 Every item you build perfectly goes into your Codex.</li>
            </ul>
          </div>
          <div className="bg-lol-dark/60 border border-lol-border rounded-lg p-3">
            <p className="font-display text-xs text-hextech-gold mb-2">Keyboard</p>
            <ul className="font-ui text-xs text-hextech-gold-light/75 space-y-1">
              {HOTKEYS.map(([key, text]) => (
                <li key={key} className="flex gap-2">
                  <kbd className="kbd shrink-0">{key}</kbd>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button onClick={onClose} className="btn-hextech w-full py-3">Got it</button>
      </motion.div>
    </motion.div>
  );
}

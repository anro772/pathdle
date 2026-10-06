/**
 * SlotBurst Component
 *
 * A quick ring of gold sparks around a component slot when it's bought correctly.
 */

import { motion } from 'framer-motion';

const SPARKS = 10;

export function SlotBurst() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {Array.from({ length: SPARKS }, (_, i) => {
        const angle = (i / SPARKS) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 46, y: Math.sin(angle) * 46, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 -ml-1 -mt-1 w-2 h-2 rounded-full"
            style={{ background: i % 2 ? '#F0E6D2' : '#C8AA6E', boxShadow: '0 0 6px #C8AA6E' }}
          />
        );
      })}
    </div>
  );
}

/**
 * Confetti Component
 *
 * A short burst of gold and hextech-blue particles for perfect levels and new records.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#C8AA6E', '#F0E6D2', '#0AC8B9', '#F0B232', '#785A28'];

function makeParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 900,
    y: 250 + Math.random() * 450,
    rotate: (Math.random() - 0.5) * 720,
    delay: Math.random() * 0.15,
    size: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length],
    round: Math.random() > 0.5,
  }));
}

export function Confetti({ count = 36 }: { count?: number }) {
  // Random layout is fixed per mount
  const [particles] = useState(() => makeParticles(count));

  return (
    <div className="fixed inset-0 pointer-events-none z-[70] overflow-hidden" aria-hidden="true">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, -220, p.y], opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: 1.6, delay: p.delay, ease: 'easeOut' }}
          className="absolute left-1/2 top-1/3"
          style={{
            width: p.size,
            height: p.size * (p.round ? 1 : 0.5),
            background: p.color,
            borderRadius: p.round ? '9999px' : '1px',
          }}
        />
      ))}
    </div>
  );
}

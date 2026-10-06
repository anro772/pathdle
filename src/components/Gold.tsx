/**
 * Gold Components
 *
 * League-style gold coin icon and a gold amount (coin + number).
 * The coin is sized in em, so it always matches the surrounding text.
 */

import { useId } from 'react';
import { formatPoints } from '../utils/formatting';

export function GoldIcon({ className = '' }: { className?: string }) {
  // Unique gradient ids: several coins can be on screen at once
  const id = useId();

  return (
    <svg viewBox="0 0 24 24" className={`inline-block w-[1.05em] h-[1.05em] shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-face`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#FFF4C2" />
          <stop offset="0.35" stopColor="#F5C842" />
          <stop offset="0.8" stopColor="#C8901C" />
          <stop offset="1" stopColor="#8A5A0E" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE58A" />
          <stop offset="1" stopColor="#6E4508" />
        </linearGradient>
      </defs>
      {/* Coin underneath (stack) */}
      <ellipse cx="12" cy="17.5" rx="9.5" ry="4.2" fill="#7A4E0C" />
      {/* Main coin */}
      <circle cx="12" cy="11" r="9.5" fill={`url(#${id}-face)`} stroke={`url(#${id}-rim)`} strokeWidth="1.4" />
      <circle cx="12" cy="11" r="6.2" fill="none" stroke="#9A6614" strokeWidth="1.1" opacity="0.75" />
      {/* Embossed diamond, like the in-game gold symbol */}
      <path d="M12 7.2 15 11l-3 3.8L9 11Z" fill="#FFE9A3" stroke="#9A6614" strokeWidth="0.8" />
      {/* Shine */}
      <ellipse cx="8.6" cy="7.4" rx="2.2" ry="1.2" fill="#FFFBE6" opacity="0.7" transform="rotate(-30 8.6 7.4)" />
    </svg>
  );
}

/** A gold amount: coin icon + number (e.g. "+300") */
export function Gold({ amount, prefix = '', className = '' }: { amount: number; prefix?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.25em] font-bold tabular-nums text-[#F5C842] ${className}`}>
      <GoldIcon />
      {prefix}{formatPoints(amount)}
    </span>
  );
}

/**
 * MuteButton Component - toggles sound effects (persisted).
 */

import { useState } from 'react';
import { isMuted, setMuted } from '../utils/sound';

export function MuteButton() {
  const [muted, setMutedState] = useState(isMuted());

  const toggle = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded border border-lol-border text-hextech-gold-light/70 hover:text-hextech-gold hover:border-hextech-gold/60 transition-colors"
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

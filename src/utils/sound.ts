/**
 * Tiny WebAudio sound effects (plus phone haptics) - no audio files needed.
 */

import { getMuted, saveMuted } from './storage';

export type SoundName = 'select' | 'remove' | 'correct' | 'wrong' | 'tick' | 'levelUp' | 'gameOver';

let ctx: AudioContext | null = null;
let muted = getMuted();

/** Note sequences: [frequency Hz, start offset s, duration s] */
const SOUNDS: Record<SoundName, { wave: OscillatorType; volume: number; notes: Array<[number, number, number]> }> = {
  select: { wave: 'triangle', volume: 0.12, notes: [[880, 0, 0.06]] },
  remove: { wave: 'triangle', volume: 0.1, notes: [[440, 0, 0.06]] },
  correct: { wave: 'triangle', volume: 0.16, notes: [[660, 0, 0.08], [990, 0.07, 0.12]] },
  wrong: { wave: 'sawtooth', volume: 0.08, notes: [[220, 0, 0.12], [160, 0.1, 0.2]] },
  tick: { wave: 'sine', volume: 0.1, notes: [[1200, 0, 0.04]] },
  levelUp: { wave: 'triangle', volume: 0.16, notes: [[523, 0, 0.1], [659, 0.09, 0.1], [784, 0.18, 0.1], [1047, 0.27, 0.25]] },
  gameOver: { wave: 'triangle', volume: 0.14, notes: [[392, 0, 0.18], [330, 0.16, 0.18], [262, 0.32, 0.4]] },
};

/** Phone vibration patterns (ms) for the sounds that deserve a buzz */
const VIBRATIONS: Partial<Record<SoundName, number | number[]>> = {
  wrong: [60, 40, 60],
  levelUp: 30,
  gameOver: [80, 60, 120],
};

export function playSound(name: SoundName): void {
  if (muted || typeof window === 'undefined') return;

  const vibration = VIBRATIONS[name];
  if (vibration && 'vibrate' in navigator) {
    try {
      navigator.vibrate(vibration);
    } catch {
      // Vibration blocked - ignore
    }
  }

  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();

    const { wave, volume, notes } = SOUNDS[name];
    const now = ctx.currentTime;

    for (const [freq, offset, duration] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + duration + 0.02);
    }
  } catch {
    // Audio unavailable - ignore
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  saveMuted(value);
}

/**
 * AchievementsModal Component - every badge, unlocked or not.
 */

import { useGameStore } from '../stores/useGameStore';
import { ACHIEVEMENTS } from '../utils/progress';
import { Modal } from './Modal';

export function AchievementsModal({ onClose }: { onClose: () => void }) {
  const unlocked = new Set(useGameStore(s => s.unlockedAchievements));

  return (
    <Modal title="Achievements" onClose={onClose} wide>
      <p className="font-ui text-xs text-hextech-gold-light/70 mb-3">
        {unlocked.size} / {ACHIEVEMENTS.length} unlocked · Endless and Daily count, Practice doesn't
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ACHIEVEMENTS.map(a => {
          const have = unlocked.has(a.id);
          return (
            <div
              key={a.id}
              className={`rounded-lg border p-2.5 text-center ${have ? 'border-hextech-gold/60 bg-hextech-gold/10' : 'border-lol-border bg-lol-dark/40'}`}
            >
              <div className={`text-3xl mb-1 ${have ? '' : 'grayscale opacity-30'}`}>{a.icon}</div>
              <p className={`font-display text-xs ${have ? 'text-hextech-gold' : 'text-hextech-gold-light/55'}`}>{a.title}</p>
              <p className="font-ui text-[0.75rem] text-hextech-gold-light/65 leading-tight mt-0.5">{a.description}</p>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

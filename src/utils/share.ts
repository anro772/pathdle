/**
 * Wordle-style share text for finished runs.
 */

import type { GameMode, LevelOutcome } from '../types/items';

const OUTCOME_EMOJI: Record<LevelOutcome, string> = {
  perfect: '🟩',
  mistake: '🟨',
  failed: '🟥',
};

const NOT_REACHED = '⬛';

export interface ShareInput {
  mode: Exclude<GameMode, 'practice'>;
  outcomes: LevelOutcome[];
  score: number;
  /** Daily puzzle number (daily only) */
  dailyNumber?: number;
  /** Total levels in the run (daily only) */
  totalLevels?: number;
  url?: string;
}

/** Turns outcomes into emoji rows of 10 */
export function outcomesToEmoji(outcomes: LevelOutcome[], totalLevels?: number): string {
  const cells = outcomes.map(o => OUTCOME_EMOJI[o]);
  while (totalLevels && cells.length < totalLevels) cells.push(NOT_REACHED);

  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 10) {
    rows.push(cells.slice(i, i + 10).join(''));
  }
  return rows.join('\n');
}

export function buildShareText(input: ShareInput): string {
  const cleared = input.outcomes.filter(o => o !== 'failed').length;
  const points = `${input.score.toLocaleString('en-US')} pts`;

  const header = input.mode === 'daily'
    ? `Pathdle Daily #${input.dailyNumber} · ${cleared}/${input.totalLevels} · ${points}`
    : `Pathdle Endless · Level ${input.outcomes.length} · ${points}`;

  return [header, outcomesToEmoji(input.outcomes, input.mode === 'daily' ? input.totalLevels : undefined), input.url]
    .filter(Boolean)
    .join('\n');
}

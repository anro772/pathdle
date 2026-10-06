/**
 * "Who builds this?" bonus question for the level-complete card:
 * pick the champion that builds the item most in the Challenger snapshot.
 */

import type { MetaSnapshot } from '../services/MetaService';
import { shuffle, type Rng } from './seededRandom';

/** Bonus points for a correct answer */
export const CHAMPION_BONUS_POINTS = 50;

/** Minimum sample before we trust "most built by" */
const MIN_PLAYERS = 5;

export interface ChampionQuiz {
  /** Three champion names, shuffled */
  options: string[];
  /** Every champion tied for most builds (any of them counts as correct) */
  correct: string[];
}

/**
 * Builds the quiz for an item, or null if the snapshot has too little data.
 * Wrong options come from other items' top builders and never include any of
 * this item's own top-5 builders, so there is exactly one right answer.
 */
export function buildChampionQuiz(meta: MetaSnapshot | null, itemId: string, rng: Rng = Math.random): ChampionQuiz | null {
  const stats = meta?.items[itemId];
  if (!meta || !stats || stats.players < MIN_PLAYERS || stats.topChamps.length === 0) return null;

  const topCount = stats.topChamps[0].count;
  const correct = stats.topChamps.filter(c => c.count === topCount).map(c => c.name);
  const ownBuilders = new Set(stats.topChamps.map(c => c.name));

  const pool = new Set<string>();
  for (const item of Object.values(meta.items)) {
    for (const champ of item.topChamps) {
      if (!ownBuilders.has(champ.name)) pool.add(champ.name);
    }
  }

  const distractors = shuffle([...pool].sort(), rng).slice(0, 2);
  if (distractors.length < 2) return null;

  const answer = correct[Math.floor(rng() * correct.length)];
  return { options: shuffle([answer, ...distractors], rng), correct };
}

/** Whether the bonus question is asked for this item and mode */
export function hasChampionQuiz(meta: MetaSnapshot | null, itemId: string, isPractice: boolean): boolean {
  return !isPractice && buildChampionQuiz(meta, itemId) !== null;
}

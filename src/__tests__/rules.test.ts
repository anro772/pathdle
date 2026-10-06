import { describe, expect, it } from 'vitest';
import { loadItems } from './helpers';
import { filterItems } from '../utils/itemFilters';
import { pickDailyTargets } from '../stores/useGameStore';
import { computeLevelScore, getStreakMultiplier, MAX_POINTS_PER_LEVEL } from '../utils/scoring';
import { CHAMPION_BONUS_POINTS } from '../utils/championQuiz';
import { buildShareText, outcomesToEmoji } from '../utils/share';
import { getDailyKey, getDailyNumber, msUntilNextDaily } from '../utils/seededRandom';
import { getDifficultySettings } from '../utils/difficultySettings';
import type { LevelOutcome } from '../types/items';

const pools = filterItems(loadItems().data);

describe('daily', () => {
  it('picks 3 epics then 7 legendaries, deterministically', () => {
    const a = pickDailyTargets(pools, '2026-10-06');
    const b = pickDailyTargets(pools, '2026-10-06');
    expect(a).toEqual(b);
    expect(a).toHaveLength(10);
    expect(new Set(a).size).toBe(10);
    a.slice(0, 3).forEach(id => expect(pools.epics[id]).toBeDefined());
    a.slice(3).forEach(id => expect(pools.legendaries[id]).toBeDefined());
  });

  it('changes every day', () => {
    expect(pickDailyTargets(pools, '2026-10-06')).not.toEqual(pickDailyTargets(pools, '2026-10-07'));
  });

  it('numbers and keys days in UTC', () => {
    const date = new Date(Date.UTC(2026, 9, 7, 23, 30));
    expect(getDailyKey(date)).toBe('2026-10-07');
    expect(getDailyNumber(date)).toBe(2);
    expect(msUntilNextDaily(date)).toBe(30 * 60 * 1000);
  });
});

describe('difficulty', () => {
  it('ramps from epics to legendaries and adds gold checks', () => {
    expect(getDifficultySettings(1)).toMatchObject({ pool: 'epic', goldChecks: 0 });
    expect(getDifficultySettings(4)).toMatchObject({ pool: 'legendary', goldChecks: 0 });
    expect(getDifficultySettings(6).goldChecks).toBe(1);
    expect(getDifficultySettings(10)).toMatchObject({ goldChecks: 3, finalGoldCheck: true });
    expect(getDifficultySettings(5, 'practice')).toMatchObject({ timerDuration: 0, goldChecks: 0 });
  });

  it('gives every Endless/Daily level 30 seconds', () => {
    for (const level of [1, 3, 4, 10, 16, 40]) {
      expect(getDifficultySettings(level).timerDuration).toBe(30);
      expect(getDifficultySettings(level, 'daily').timerDuration).toBe(30);
    }
  });
});

describe('scoring', () => {
  it('scores time, gold, buy all and streaks', () => {
    const score = computeLevelScore({ outcome: 'perfect', secondsLeft: 10, goldAnswersCorrect: 1, buyAll: true, previousStreak: 2 });
    // (100 + 100 + 50) * 1.5 * 1.2
    expect(score.total).toBe(450);
    expect(score.streak).toBe(3);
  });

  it('resets the streak on mistakes and scores 0 on failures', () => {
    expect(computeLevelScore({ outcome: 'mistake', secondsLeft: 5, goldAnswersCorrect: 0, buyAll: false, previousStreak: 4 }))
      .toMatchObject({ total: 150, streak: 0, streakMultiplier: 1 });
    expect(computeLevelScore({ outcome: 'failed', secondsLeft: 5, goldAnswersCorrect: 0, buyAll: false, previousStreak: 4 }).total).toBe(0);
  });

  it('subtracts hints but never goes below 0', () => {
    const base = { outcome: 'perfect' as const, secondsLeft: 0, goldAnswersCorrect: 0, buyAll: false, previousStreak: 0 };
    expect(computeLevelScore({ ...base, hintsUsed: 2 })).toMatchObject({ total: 50, hintPenalty: 50, streak: 1 });
    expect(computeLevelScore({ ...base, hintsUsed: 10 })).toMatchObject({ total: 0, hintPenalty: 100 });
  });

  it('pins the per-level maximum used by the leaderboard check (schema.sql)', () => {
    const best = computeLevelScore({ outcome: 'perfect', secondsLeft: 30, goldAnswersCorrect: 4, buyAll: true, previousStreak: 50 });
    expect(best.total + CHAMPION_BONUS_POINTS).toBe(MAX_POINTS_PER_LEVEL);
    // supabase/schema.sql hardcodes this value: change both together
    expect(MAX_POINTS_PER_LEVEL).toBe(1850);
  });

  it('caps the streak multiplier at x2', () => {
    expect(getStreakMultiplier(1)).toBe(1);
    expect(getStreakMultiplier(4)).toBe(1.3);
    expect(getStreakMultiplier(50)).toBe(2);
  });
});

describe('share text', () => {
  it('pads daily results and formats the header', () => {
    expect(outcomesToEmoji(['perfect', 'mistake', 'failed'], 5)).toBe('🟩🟨🟥⬛⬛');
    expect(buildShareText({ mode: 'daily', outcomes: ['perfect', 'failed'], score: 3450, dailyNumber: 7, totalLevels: 10 }))
      .toBe('Pathdle Daily #7 · 1/10 · 3,450 pts\n🟩🟥⬛⬛⬛⬛⬛⬛⬛⬛');
  });

  it('wraps long endless runs', () => {
    const outcomes: LevelOutcome[] = Array(12).fill('perfect');
    const text = buildShareText({ mode: 'endless', outcomes, score: 100 });
    expect(text.split('\n')).toHaveLength(3);
  });
});

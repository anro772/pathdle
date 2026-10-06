import { describe, expect, it } from 'vitest';
import {
  applyLevel,
  applyRunEnd,
  computeDailyStats,
  EMPTY_LIFETIME,
  findNewAchievements,
  type LevelEvent,
} from '../utils/progress';
import { parseItemDescription } from '../utils/itemText';
import { buildChampionQuiz } from '../utils/championQuiz';
import { seededRng } from '../utils/seededRandom';
import type { MetaSnapshot } from '../services/MetaService';
import type { DailyResult } from '../utils/storage';

const level = (overrides: Partial<LevelEvent> = {}): LevelEvent => ({
  mode: 'endless',
  outcome: 'perfect',
  buyAll: false,
  goldCheckPassed: false,
  secondsUsed: 10,
  streak: 1,
  hiddenGem: false,
  ...overrides,
});

describe('lifetime stats', () => {
  it('counts cleared levels but ignores practice and failures', () => {
    let stats = applyLevel(EMPTY_LIFETIME, level({ buyAll: true, secondsUsed: 4, streak: 3 }));
    stats = applyLevel(stats, level({ outcome: 'mistake', goldCheckPassed: true }));
    stats = applyLevel(stats, level({ outcome: 'failed' }));
    stats = applyLevel(stats, level({ mode: 'practice' }));
    expect(stats).toMatchObject({ levelsCleared: 2, perfectLevels: 1, buyAlls: 1, goldChecksPassed: 1, fastClears: 1, bestStreak: 3 });
  });

  it('records run ends', () => {
    const flawless = applyRunEnd(EMPTY_LIFETIME, { mode: 'daily', level: 10, outcomes: Array(10).fill('perfect') });
    expect(flawless).toMatchObject({ dailiesFinished: 1, flawlessDailies: 1 });
    expect(applyRunEnd(EMPTY_LIFETIME, { mode: 'endless', level: 12, outcomes: [] }).bestEndlessLevel).toBe(12);
  });
});

describe('achievements', () => {
  it('unlocks only new achievements whose condition is met', () => {
    const stats = { ...EMPTY_LIFETIME, levelsCleared: 1, buyAlls: 5 };
    const ids = findNewAchievements({ stats, codexCount: 0, codexTotal: 100 }, ['first-blood']).map(a => a.id);
    expect(ids).toEqual(['buy-all']);
  });

  it('completionist needs the whole codex', () => {
    const ctx = { stats: EMPTY_LIFETIME, codexCount: 10, codexTotal: 10 };
    expect(findNewAchievements(ctx, []).map(a => a.id)).toContain('completionist');
    expect(findNewAchievements({ ...ctx, codexTotal: 0, codexCount: 0 }, []).map(a => a.id)).not.toContain('completionist');
  });
});

describe('daily stats', () => {
  const result = (cleared: number, score: number): DailyResult => ({
    score,
    outcomes: [...Array(cleared).fill('perfect'), ...Array(Math.min(1, 10 - cleared)).fill('failed')],
    finished: true,
  });

  it('computes streaks, averages and a histogram', () => {
    const stats = computeDailyStats(
      {
        '2026-10-01': result(10, 3000),
        '2026-10-02': result(5, 1000),
        '2026-10-04': result(7, 2000),
        '2026-10-05': result(10, 3000),
        '2026-10-06': { ...result(3, 500), finished: false },
      },
      '2026-10-06'
    );
    expect(stats.played).toBe(4);
    expect(stats.currentStreak).toBe(2); // 4th + 5th, today not finished yet
    expect(stats.bestStreak).toBe(2);
    expect(stats.averageScore).toBe(2250);
    expect(stats.bestScore).toBe(3000);
    expect(stats.histogram[10]).toBe(2);
    expect(stats.histogram[5]).toBe(1);
  });

  it('breaks the streak after a missed day', () => {
    expect(computeDailyStats({ '2026-10-03': result(10, 100) }, '2026-10-06').currentStreak).toBe(0);
  });
});

describe('item text', () => {
  it('parses stats and passives', () => {
    const text = parseItemDescription(
      '<mainText><stats><attention>60</attention> Ability Power<br><attention>300</attention> Health</stats><br><br>' +
      '<passive>Torment</passive><br>Burns for <magicDamage>2% max Health</magicDamage>.<br><br><passive>Suffering</passive><br>Bonus damage.</mainText>'
    );
    expect(text.stats).toEqual(['60 Ability Power', '300 Health']);
    expect(text.effects).toEqual([
      { name: 'Torment', text: 'Burns for 2% max Health.' },
      { name: 'Suffering', text: 'Bonus damage.' },
    ]);
  });
});

describe('champion quiz', () => {
  const meta: MetaSnapshot = {
    patch: '16.19', platform: 'euw1', tier: 'CHALLENGER', matchCount: 10, playerCount: 100, generatedAt: '',
    items: {
      '1': { players: 20, pickRate: 0.2, winRate: 0.5, topChamps: [{ name: 'Jinx', count: 8 }, { name: 'Ashe', count: 8 }, { name: 'Ezreal', count: 2 }] },
      '2': { players: 20, pickRate: 0.2, winRate: 0.5, topChamps: [{ name: 'Lux', count: 9 }, { name: 'Ahri', count: 5 }, { name: 'Jinx', count: 1 }] },
      '3': { players: 2, pickRate: 0.02, winRate: 0.5, topChamps: [{ name: 'Teemo', count: 2 }] },
    },
  };

  it('has one right answer and never uses the item\'s own builders as distractors', () => {
    const quiz = buildChampionQuiz(meta, '1', seededRng('q'))!;
    expect(quiz.options).toHaveLength(3);
    expect(quiz.correct).toEqual(['Jinx', 'Ashe']);
    expect(quiz.options.filter(o => quiz.correct.includes(o))).toHaveLength(1);
    expect(quiz.options).not.toContain('Ezreal');
  });

  it('skips items with too little data', () => {
    expect(buildChampionQuiz(meta, '3')).toBeNull();
    expect(buildChampionQuiz(meta, 'missing')).toBeNull();
    expect(buildChampionQuiz(null, '1')).toBeNull();
  });
});

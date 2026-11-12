import { findKind } from '../../game/board';
import { findCircuit } from '../../game/circuit';
import { newGame } from '../../game/engine';
import { playLevel } from '../bot';
import {
  CHAPTERS,
  LEVELS,
  goalProgress,
  goalText,
  isUnlocked,
  levelOutcome,
  levelState,
  nextLevel,
  pickLevelSeed,
  starsFor,
  totalStars,
} from '../index';
import { MOVE_BONUS } from '../run';
import type { LevelData } from '../types';

describe('bölüm verisi', () => {
  it('numaralar 1den başlar ve ardışıktır; mahalleler hepsini kapsar', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => i + 1));
    const covered = CHAPTERS.flatMap((c) => Array.from({ length: c.last - c.first + 1 }, (_, i) => c.first + i));
    expect(covered).toEqual(LEVELS.map((l) => l.id));
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('bölüm %i geçerli kurulur', (_, level) => {
    const s = levelState(level);
    expect(findKind(s.board, 'battery')).not.toBeNull();
    expect(findKind(s.board, 'lamp')).not.toBeNull();
    expect(findCircuit(s.board)).toBeNull();
    expect(level.board?.every((row) => row.length === 8)).toBe(true);
    expect(level.stars[0]).toBeLessThanOrEqual(level.stars[1]);
    expect(level.stars[1]).toBeLessThan(level.stars[2]);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('bölüm %i kendi tohumuyla bota bile geçilebilir', (_, level) => {
    const r = playLevel(level);
    expect(r.outcome.status).toBe('won');
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('bölüm %i: tohum havuzu en az 8 tohum, asıl tohum içinde, örnekleri bota geçilir', (_, level) => {
    const pool = level.seeds ?? [];
    expect(pool.length).toBeGreaterThanOrEqual(8);
    expect(pool).toContain(level.seed);
    expect(new Set(pool).size).toBe(pool.length);
    // Havuzun tamamı ölçülürken doğrulandı; burada baş, orta ve son örneklenir (test süresi).
    for (const seed of [pool[0], pool[Math.floor(pool.length / 2)], pool[pool.length - 1]]) {
      expect(playLevel({ ...level, seed }).outcome.status).toBe('won');
    }
  });

  it('her denemede havuzdan, bir öncekinden farklı tohum seçilir', () => {
    const level = { ...LEVELS[0], seeds: [1, 2, 3] };
    expect(pickLevelSeed(level, null, () => 0)).toBe(1);
    expect(pickLevelSeed(level, 1, () => 0)).toBe(2);
    expect(pickLevelSeed(level, 3, () => 0.99)).toBe(2);
    for (let i = 0; i < 50; i++) expect(pickLevelSeed(level, 2)).not.toBe(2);
    expect(pickLevelSeed({ ...LEVELS[0], seeds: undefined }, LEVELS[0].seed)).toBe(LEVELS[0].seed);
  });

  it('kilit hedefindeki sayı tahtadaki kilitli blok sayısıyla aynı; kilitli blokların kablosu var', () => {
    for (const level of LEVELS) {
      const s = levelState(level);
      const locked = s.board.filter((c) => c.kind === 'block' && c.locked);
      for (const c of locked) expect(c.kind === 'block' && c.wires !== 0).toBe(true);
      if (level.goal.type === 'locked') expect(locked).toHaveLength(level.goal.count);
    }
  });

  it('yeni öğe ilk kez çıktığı bölümde tanıtılır', () => {
    const firstLocked = LEVELS.find((l) => levelState(l).board.some((c) => c.kind === 'block' && c.locked));
    expect(firstLocked?.intro?.icon).toBe('locked');
    const firstDouble = LEVELS.find((l) => levelState(l).board.filter((c) => c.kind === 'lamp').length > 1);
    expect(firstDouble?.intro?.icon).toBe('doubleLamp');
    const firstSwitch = LEVELS.find((l) => levelState(l).board.some((c) => c.kind === 'switch'));
    expect(firstSwitch?.intro?.icon).toBe('switch');
  });

  it('görev dosyasındaki dağılım: 1–10 temel, 11–20 kilit, 21–30 çift lamba, 31–40 anahtar ilk kez çıkar; 41–80 hepsi karışık', () => {
    const first = (pred: (l: (typeof LEVELS)[number]) => boolean) => LEVELS.find(pred)?.id;
    const board = (l: (typeof LEVELS)[number]) => levelState(l).board;
    expect(LEVELS).toHaveLength(80);
    expect(first((l) => board(l).some((c) => c.kind === 'block' && c.locked))).toBe(11);
    expect(first((l) => board(l).filter((c) => c.kind === 'lamp').length > 1)).toBe(21);
    expect(first((l) => board(l).some((c) => c.kind === 'switch'))).toBe(31);
  });

  it('çift lambalı bölümde tahtada iki lamba var, ikisi de pilden yeterince uzak', () => {
    for (const level of LEVELS.filter((l) => (l.board ?? []).join('').split('L').length - 1 === 2)) {
      const s = levelState(level);
      const lamps = s.board.flatMap((c, i) => (c.kind === 'lamp' ? [{ r: Math.floor(i / 8), c: i % 8 }] : []));
      const b = findKind(s.board, 'battery')!;
      expect(lamps).toHaveLength(2);
      for (const l of lamps) expect(Math.abs(l.r - b.r) + Math.abs(l.c - b.c)).toBeGreaterThanOrEqual(5);
    }
  });

  it('uzun devre hedefinde pil ile lamba yeterince uzak (en kısa yol hedef uzunluğuna ulaşabilir)', () => {
    for (const level of LEVELS) {
      if (level.goal.type !== 'circuit') continue;
      const s = levelState(level);
      const b = findKind(s.board, 'battery')!;
      // Çift lambada en az bir lambaya giden en kısa yol hedef uzunluğuna ulaşabilmeli.
      const lamps = s.board.flatMap((c, i) => (c.kind === 'lamp' ? [{ r: Math.floor(i / 8), c: i % 8 }] : []));
      const far = Math.max(...lamps.map((l) => Math.abs(b.r - l.r) + Math.abs(b.c - l.c) - 1));
      expect(far).toBeGreaterThanOrEqual(level.goal.length);
    }
  });
});

describe('bölüm kuralları', () => {
  const level: LevelData = { id: 1, seed: 1, moves: 10, goal: { type: 'lamps', count: 2 }, stars: [0, 1000, 2000] };
  const base = { ...newGame(1) };

  it('hedef ilerlemesi', () => {
    expect(goalProgress(level.goal, { ...base, circuits: 1 })).toEqual({ current: 1, target: 2, done: false });
    expect(goalProgress({ type: 'circuit', length: 8 }, { ...base, longestCircuit: 9 }).done).toBe(true);
    expect(goalProgress({ type: 'score', points: 500 }, { ...base, score: 499 }).done).toBe(false);
  });

  it('hedef tutunca kazanılır; kalan hamleler bonus olur ve yıldızları belirler', () => {
    const out = levelOutcome(level, { ...base, circuits: 2, moves: 4, score: 500 });
    expect(out).toEqual({ status: 'won', bonus: 6 * MOVE_BONUS, score: 500 + 6 * MOVE_BONUS, stars: 2 });
  });

  it('hamle biterse ya da yer kalmazsa kaybedilir; hedef son hamlede tutarsa kazanılır', () => {
    expect(levelOutcome(level, { ...base, circuits: 1, moves: 10 })).toEqual({ status: 'lost', reason: 'moves' });
    expect(levelOutcome(level, { ...base, circuits: 0, moves: 3, over: true })).toEqual({ status: 'lost', reason: 'stuck' });
    expect(levelOutcome(level, { ...base, circuits: 2, moves: 10 }).status).toBe('won');
    expect(levelOutcome(level, { ...base, circuits: 1, moves: 3 })).toEqual({ status: 'playing' });
  });

  it('kazanılan bölüm en az 1 yıldız', () => {
    expect(starsFor(level, 0)).toBe(1);
    expect(starsFor(level, 1000)).toBe(2);
    expect(starsFor(level, 2500)).toBe(3);
  });

  it('kilit: önceki bölüm geçilince açılır; sıradaki bölüm ilk geçilmemiş açık bölümdür', () => {
    expect(isUnlocked(1, {})).toBe(true);
    expect(isUnlocked(2, {})).toBe(false);
    expect(isUnlocked(2, { 1: 1 })).toBe(true);
    expect(nextLevel({})).toBe(1);
    expect(nextLevel({ 1: 3, 2: 1 })).toBe(3);
    expect(totalStars({ 1: 3, 2: 1 })).toBe(4);
  });

  it('hedef yazıları', () => {
    expect(goalText({ type: 'lamps', count: 5 })).toBe('5 lamba yak');
    expect(goalText({ type: 'circuit', length: 8 })).toBe('8 hücrelik devre kur');
    expect(goalText({ type: 'score', points: 1500 })).toBe('1.500 puan topla');
  });
});

import { applyMove, newGame } from '../../game/engine';
import { validPlacements } from '../../game/placement';
import { createRng } from '../../game/rng';
import { DailyMove, MAX_DAILY_MOVES, dailySeed, isPlayableDate, replayDaily } from '../verify';
// Sunucu fonksiyonunun kullandığı paket (npm run build:functions ile üretilir)
import * as bundled from '../../../supabase/functions/_shared/verify.js';

/** Tohumlu rastgele bir oyuncuyla Günün Tahtası oynar; hamleleri ve sonucu döndürür. */
function play(date: string, playerSeed: number, maxMoves = 400) {
  let state = newGame(dailySeed(date));
  const player = createRng(playerSeed);
  const moves: DailyMove[] = [];
  while (!state.over && moves.length < maxMoves) {
    const options: DailyMove[] = [];
    state.tray.forEach((p, i) => p && validPlacements(state.board, p).forEach(({ r, c }) => options.push({ i, r, c })));
    const m = player.pick(options);
    state = applyMove(state, m.i, m.r, m.c)!.state;
    moves.push(m);
  }
  return { moves, state };
}

describe('Günün Tahtası doğrulama', () => {
  it('dürüst oyunu birebir yeniden üretir', () => {
    for (const seed of [1, 2, 3]) {
      const { moves, state } = play('2026-11-12', seed);
      expect(replayDaily('2026-11-12', moves)).toEqual({
        ok: true,
        score: state.score,
        circuits: state.circuits,
        longest: state.longestCircuit,
        over: state.over,
        moves: moves.length,
      });
    }
  });

  it('yarıda bırakılan oyun da doğrulanır (bitmiş olması gerekmez)', () => {
    const { moves } = play('2026-11-12', 4, 5);
    const r = replayDaily('2026-11-12', moves);
    expect(r.ok).toBe(true);
  });

  it('başka günün hamleleri bugüne uymaz ya da farklı puan verir', () => {
    const { moves, state } = play('2026-11-12', 5);
    const other = replayDaily('2026-11-13', moves);
    expect(other.ok === false || other.score !== state.score || other.moves !== moves.length).toBe(true);
  });

  it('geçersiz yerleştirme, bozuk hamle, fazla hamle ve bozuk tarih reddedilir', () => {
    const { moves } = play('2026-11-12', 6, 3);
    expect(replayDaily('2026-11-12', [...moves, moves[moves.length - 1]])).toMatchObject({ ok: false });
    expect(replayDaily('2026-11-12', [{ i: 0, r: 9, c: 0 }])).toEqual({ ok: false, reason: 'bad-move', at: 0 });
    expect(replayDaily('2026-11-12', [{ i: 1.5, r: 0, c: 0 } as DailyMove])).toMatchObject({ reason: 'bad-move' });
    expect(replayDaily('2026-11-12', Array(MAX_DAILY_MOVES + 1).fill({ i: 0, r: 0, c: 0 }))).toEqual({
      ok: false,
      reason: 'too-many-moves',
    });
    expect(replayDaily('12.11.2026', [])).toEqual({ ok: false, reason: 'bad-date' });
  });

  it('oyun bittikten sonra eklenen hamle reddedilir', () => {
    const { moves, state } = play('2026-11-12', 7);
    expect(state.over).toBe(true);
    expect(replayDaily('2026-11-12', [...moves, { i: 0, r: 0, c: 0 }])).toMatchObject({ ok: false, reason: 'illegal-move' });
  });

  it('sunucu paketi güncel: kaynakla aynı sonucu verir (kurallar değişince npm run build:functions)', () => {
    for (const seed of [8, 9]) {
      const { moves } = play('2026-11-12', seed);
      expect(bundled.replayDaily('2026-11-12', moves)).toEqual(replayDaily('2026-11-12', moves));
    }
    expect(bundled.dailySeed('2026-11-12')).toBe(dailySeed('2026-11-12'));
  });

  it('tarih bugüne en fazla bir gün uzak olmalı (saat dilimi payı)', () => {
    const now = new Date(Date.UTC(2026, 10, 12, 10));
    expect(isPlayableDate('2026-11-12', now)).toBe(true);
    expect(isPlayableDate('2026-11-11', now)).toBe(true);
    expect(isPlayableDate('2026-11-13', now)).toBe(true);
    expect(isPlayableDate('2026-11-10', now)).toBe(false);
    expect(isPlayableDate('2026-11-14', now)).toBe(false);
  });
});

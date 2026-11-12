import { idx } from '../../game/board';
import { applyMove, newGame } from '../../game/engine';
import { place } from '../../game/placement';
import { applyLightning, applyRotate } from '../../game/powerups';
import { E, GameState, W } from '../../game/types';
import { boardWithTerminals, piece, setBlock } from '../../game/__tests__/helpers';
import {
  CURRENT_START_MS,
  CURRENT_STEP_MS,
  DROP_SQUASH,
  EXPLODE_DELAY_MS,
  EXPLODE_STAGGER_MS,
  LIGHTNING_ROW_MS,
  ROTATE_SPIN_MS,
} from '../constants';
import { backOut, buildTimeline, squashCurve } from '../timeline';

function circuitState(): GameState {
  const board = boardWithTerminals();
  for (let c = 1; c <= 5; c++) setBlock(board, 3, c, E | W);
  setBlock(board, 0, 0, 0);
  return {
    ...newGame(1),
    board,
    tray: [piece([{ r: 0, c: 0, wires: E | W }]), piece([{ r: 0, c: 0, wires: 0 }], 2), null],
  };
}

function play(state: GameState, i: number, r: number, c: number) {
  const res = applyMove(state, i, r, c)!;
  const placed = place(state.board, state.tray[i]!, r, c);
  return buildTimeline(placed, res.state.board, res.events);
}

describe('zaman çizelgesi', () => {
  it('devresiz hamle yalnızca ezilme-esneme oynatır ve girişi kilitlemez', () => {
    const tl = play(circuitState(), 1, 6, 6);
    expect(tl.cells.get(idx(6, 6))).toEqual({ squashAt: 0 });
    expect(tl.current).toBeNull();
    expect(tl.bursts).toHaveLength(0);
    expect(tl.lockUntil).toBe(0);
  });

  it('akım hücre başı 40 ms ilerler, lamba sonda yanar', () => {
    const tl = play(circuitState(), 0, 3, 6);
    expect(tl.current!.path).toHaveLength(8);
    expect(tl.current!.times[0]).toBe(CURRENT_START_MS);
    expect(tl.current!.times[7]).toBe(CURRENT_START_MS + 7 * CURRENT_STEP_MS);
    expect(tl.lamp).toEqual({ pos: { r: 3, c: 7 }, at: CURRENT_START_MS + 7 * CURRENT_STEP_MS });
    expect(tl.circuitLength).toBe(6);
  });

  it('yoldaki bloklar lambadan sonra 30 ms arayla patlar; pil ve lamba patlamaz', () => {
    const tl = play(circuitState(), 0, 3, 6);
    const lampAt = tl.lamp!.at;
    const explodes = [1, 2, 3, 4, 5, 6].map((c) => tl.cells.get(idx(3, c))!.explodeAt);
    expect(explodes).toEqual([0, 1, 2, 3, 4, 5].map((i) => lampAt + EXPLODE_DELAY_MS + i * EXPLODE_STAGGER_MS));
    expect(tl.cells.get(idx(3, 0))!.explodeAt).toBeUndefined();
    expect(tl.bursts).toHaveLength(6);
    expect(tl.cells.get(idx(0, 0))).toBeUndefined();
  });

  it('pil/lamba patlamalardan sonra taşınır, puan patlamalar bitince uçar, giriş o ana kadar kilitli', () => {
    const tl = play(circuitState(), 0, 3, 6);
    const lastBurst = Math.max(...tl.bursts.map((b) => b.at));
    expect(tl.scorePops).toHaveLength(1);
    expect(tl.scorePops[0].amount).toBe(360);
    expect(tl.scorePops[0].at).toBe(lastBurst);
    expect(tl.cells.get(idx(3, 0))!.vanishAt).toBeGreaterThan(lastBurst);
    expect(tl.terminals!.appearAt).toBeGreaterThan(tl.cells.get(idx(3, 0))!.vanishAt!);
    expect(tl.lockUntil).toBeGreaterThan(tl.terminals!.appearAt);
    expect(tl.duration).toBeGreaterThanOrEqual(tl.lockUntil);
    expect(tl.praise).toEqual({ text: 'Güzel!', at: tl.lamp!.at });
    expect(tl.shakeAt).toBeNull();
  });

  it('satır temizleme ortadan dışa doğru patlar', () => {
    const s = circuitState();
    const board = boardWithTerminals();
    for (let c = 0; c < 7; c++) setBlock(board, 0, c, 0);
    const state: GameState = { ...s, board };
    const tl = play(state, 1, 0, 7);
    expect(tl.bursts).toHaveLength(8);
    const at = (c: number) => tl.cells.get(idx(0, c))!.explodeAt!;
    expect(at(3)).toBeLessThan(at(0));
    expect(at(4)).toBeLessThan(at(7));
    expect(tl.lockUntil).toBeGreaterThan(0);
  });

  it('eğriler sınırlarda doğru', () => {
    expect(squashCurve(0, DROP_SQUASH.from, DROP_SQUASH.peak, DROP_SQUASH.peakAt)).toBe(0.9);
    expect(squashCurve(DROP_SQUASH.peakAt, DROP_SQUASH.from, DROP_SQUASH.peak, DROP_SQUASH.peakAt)).toBeCloseTo(1.06);
    expect(squashCurve(1, DROP_SQUASH.from, DROP_SQUASH.peak, DROP_SQUASH.peakAt)).toBe(1);
    expect(backOut(0)).toBeCloseTo(0);
    expect(backOut(1)).toBeCloseTo(1);
  });
});

describe('joker animasyonları', () => {
  it('döndür: hücre önce döner, akım dönüş bitince başlar', () => {
    const board = boardWithTerminals();
    for (let c = 1; c <= 6; c++) setBlock(board, 3, c, c === 4 ? 1 | 4 : E | W);
    const s: GameState = { ...newGame(4), board };
    const res = applyRotate(s, 3, 4)!;
    const tl = buildTimeline(res.placed!, res.state.board, res.events);
    expect(tl.cells.get(idx(3, 4))?.spinAt).toBe(0);
    expect(tl.current).not.toBeNull();
    expect(tl.lamp!.at).toBeGreaterThanOrEqual(ROTATE_SPIN_MS);
  });

  it('yıldırım: ekran sarsılır, bloklar yukarıdan aşağı satır satır patlar', () => {
    const board = boardWithTerminals();
    setBlock(board, 1, 1, E | W);
    setBlock(board, 6, 4, E | W);
    const s: GameState = { ...newGame(4), board };
    const res = applyLightning(s)!;
    const tl = buildTimeline(s.board, res.state.board, res.events);
    expect(tl.shakeAt).toBe(0);
    expect(tl.praise?.text).toBe('Yıldırım!');
    expect(tl.cells.get(idx(1, 1))?.explodeAt).toBe(LIGHTNING_ROW_MS);
    expect(tl.cells.get(idx(6, 4))?.explodeAt).toBe(6 * LIGHTNING_ROW_MS);
    expect(tl.lockUntil).toBeGreaterThan(0);
  });
});

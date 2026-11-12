import { emptyBoard, idx, inwardDir } from '../board';
import { findCircuit, findCircuits } from '../circuit';
import { DOUBLE_LAMP_MULTIPLIER, applyMove, circuitScore, newGame, previewCircuit, resolve } from '../engine';
import { MIN_LAMP_SEPARATION, MIN_TERMINAL_DISTANCE, placeTerminals } from '../generator';
import { createRng } from '../rng';
import { Cell, GameState, Pos } from '../types';
import { E, N, S, W, piece, setBlock } from './helpers';

/** Pil (3,0)→D; lamba A (0,4)→G; lamba B (7,4)→K. */
function twoLampBoard(): Cell[] {
  const b = emptyBoard();
  b[idx(3, 0)] = { kind: 'battery', wires: E };
  b[idx(0, 4)] = { kind: 'lamp', wires: S };
  b[idx(7, 4)] = { kind: 'lamp', wires: N };
  return b;
}

/** Gövde: (3,1)…(3,3) düz, (3,4) artı/T; kollar (2,4),(1,4) yukarı ve (4,4)…(6,4) aşağı. */
function branch(b: Cell[], { up = true, down = true } = {}) {
  for (let c = 1; c <= 3; c++) setBlock(b, 3, c, E | W);
  setBlock(b, 3, 4, W | (up ? N : 0) | (down ? S : 0));
  if (up) for (const r of [1, 2]) setBlock(b, r, 4, N | S);
  if (down) for (const r of [4, 5, 6]) setBlock(b, r, 4, N | S);
}

const manhattan = (a: Pos, b: Pos) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

describe('çift lamba', () => {
  it('kollara ayrılan yol iki lambaya birden ulaşır; kısa yol önce', () => {
    const b = twoLampBoard();
    branch(b);
    const paths = findCircuits(b);
    expect(paths).toHaveLength(2);
    expect(paths[0][paths[0].length - 1]).toEqual({ r: 0, c: 4 });
    expect(paths[1][paths[1].length - 1]).toEqual({ r: 7, c: 4 });
    expect(paths[0].length).toBeLessThan(paths[1].length);
    expect(findCircuit(b)).toEqual(paths[0]);
  });

  it('tek kol yalnız o lambayı yakar', () => {
    const b = twoLampBoard();
    branch(b, { up: false });
    const paths = findCircuits(b);
    expect(paths).toHaveLength(1);
    expect(paths[0][paths[0].length - 1]).toEqual({ r: 7, c: 4 });
  });

  it('Çifte Işık: iki yol temizlenir, puan ×2, iki olay, iki lamba sayılır', () => {
    const b = twoLampBoard();
    branch(b);
    const res = resolve(b, 0, 0, 1);
    // Yukarı kol: 3 gövde + 1 T + 2 = 6 blok; aşağı kol: 3 + 1 + 3 = 7 blok
    const expected = (circuitScore(6, 1) + circuitScore(7, 1)) * DOUBLE_LAMP_MULTIPLIER;
    expect(res.scoreGained).toBe(expected);
    expect(res.lampsLit).toBe(2);
    expect(res.circuitLength).toBe(7);
    const circuits = res.events.filter((e) => e.type === 'CIRCUIT_COMPLETE');
    expect(circuits).toHaveLength(2);
    expect(circuits.every((e) => e.type === 'CIRCUIT_COMPLETE' && e.double)).toBe(true);
    expect(res.board.filter((c) => c.kind === 'block')).toHaveLength(0);
  });

  it('pil/lamba taşınınca lamba sayısı korunur, kurallara uyar, anında devre olmaz', () => {
    for (let seed = 0; seed < 100; seed++) {
      const { board, battery, lamps } = placeTerminals(twoLampBoard(), createRng(seed));
      expect(lamps).toHaveLength(2);
      expect(board.filter((c) => c.kind === 'lamp')).toHaveLength(2);
      expect(board.filter((c) => c.kind === 'battery')).toHaveLength(1);
      for (const l of lamps) {
        expect(inwardDir(l.r, l.c)).not.toBeNull();
        expect(manhattan(l, battery)).toBeGreaterThanOrEqual(MIN_TERMINAL_DISTANCE);
      }
      expect(manhattan(lamps[0], lamps[1])).toBeGreaterThanOrEqual(MIN_LAMP_SEPARATION);
      expect(findCircuits(board)).toEqual([]);
    }
  });

  it('hamlede iki lamba yanınca lamba sayacı 2 artar; önizleme iki yolu birlikte parlatır', () => {
    const b = twoLampBoard();
    branch(b);
    b[idx(3, 2)] = { kind: 'empty' }; // eksik tek parça
    const state: GameState = { ...newGame(1), board: b, tray: [piece([{ r: 0, c: 0, wires: E | W }]), null, null] };
    const lit = previewCircuit(state, 0, 3, 2)!;
    expect(lit.some((p) => p.r === 0 && p.c === 4)).toBe(true);
    expect(lit.some((p) => p.r === 7 && p.c === 4)).toBe(true);
    expect(new Set(lit.map((p) => `${p.r},${p.c}`)).size).toBe(lit.length);
    const res = applyMove(state, 0, 3, 2)!;
    expect(res.state.circuits).toBe(2);
    expect(res.state.board.filter((c) => c.kind === 'lamp')).toHaveLength(2);
  });
});

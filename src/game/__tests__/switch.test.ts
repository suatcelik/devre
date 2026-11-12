import { cellAt, idx, rotateCW } from '../board';
import { circuitLength, findCircuit } from '../circuit';
import { applyMove, newGame, resolve, turnSwitches } from '../engine';
import { Cell, GameState } from '../types';
import { E, N, S, W, boardWithTerminals, piece, setBlock } from './helpers';

const sw = (board: Cell[], r: number, c: number, wires: number) => {
  board[idx(r, c)] = { kind: 'switch', wires };
};

/** Pil (3,0) → (3,1..6) düz, (3,3) anahtar → lamba (3,7) */
function row(switchWires: number) {
  const b = boardWithTerminals();
  for (let c = 1; c <= 6; c++) setBlock(b, 3, c, E | W);
  sw(b, 3, 3, switchWires);
  return b;
}

describe('anahtar', () => {
  it('saat yönünde 90° döner: ─ ↔ │, köşeler dört adımda döner', () => {
    expect(rotateCW(E | W)).toBe(N | S);
    expect(rotateCW(N | S)).toBe(E | W);
    expect(rotateCW(S | E)).toBe(S | W); // ┌ → ┐
    expect(rotateCW(S | W)).toBe(N | W); // ┐ → ┘
    expect(rotateCW(N | W)).toBe(N | E); // ┘ → └
    expect(rotateCW(N | E)).toBe(S | E); // └ → ┌
  });

  it('hizalıyken akımı iletir ve devre uzunluğuna sayılır; hizasızken keser', () => {
    const open = row(E | W);
    const path = findCircuit(open)!;
    expect(path).toHaveLength(8);
    expect(circuitLength(open, path)).toBe(6);
    expect(findCircuit(row(N | S))).toBeNull();
  });

  it('devre ve satır temizlemesi anahtarı silmez', () => {
    const res = resolve(row(E | W), 0, 0, 1);
    expect(res.circuitLength).toBe(6);
    expect(cellAt(res.board, 3, 3)).toEqual({ kind: 'switch', wires: E | W });
    const b = boardWithTerminals();
    for (let c = 0; c < 8; c++) setBlock(b, 0, c, 0);
    sw(b, 0, 4, N | S);
    const line = resolve(b, 0, 0, 1);
    expect(cellAt(line.board, 0, 4).kind).toBe('switch');
    expect(cellAt(line.board, 0, 0).kind).toBe('empty');
  });

  it('her hamleden sonra döner; hizalandığı hamlede hazır yol devreyi kapatır', () => {
    // Satır dolmasın diye yol köşeden yukarı döner: pil (3,0) → (3,1) → anahtar (3,2) → köşe (3,3) → (2,3),(1,3) → lamba (0,3)
    const board = boardWithTerminals({ r: 3, c: 0, d: E }, { r: 0, c: 3, d: S });
    setBlock(board, 3, 1, E | W);
    sw(board, 3, 2, N | S); // hizasız
    setBlock(board, 3, 3, W | N);
    setBlock(board, 2, 3, N | S);
    setBlock(board, 1, 3, N | S);
    const state: GameState = {
      ...newGame(1),
      board,
      tray: [piece([{ r: 0, c: 0, wires: 0 }], 1), piece([{ r: 0, c: 0, wires: 0 }], 2), piece([{ r: 0, c: 0, wires: 0 }], 3)],
    };
    // 1. hamle: yol hazır ama anahtar hizasız → devre yok, sonra anahtar döner (artık hizalı)
    const m1 = applyMove(state, 0, 6, 6)!;
    expect(m1.events.some((e) => e.type === 'CIRCUIT_COMPLETE')).toBe(false);
    expect(m1.events).toContainEqual({ type: 'SWITCHES_TURNED', cells: [{ r: 3, c: 2 }] });
    expect(cellAt(m1.state.board, 3, 2)).toEqual({ kind: 'switch', wires: E | W });
    // 2. hamle: başka yere konan parça, hizalanan anahtarla devreyi kapatır
    const m2 = applyMove(m1.state, 1, 6, 1)!;
    expect(m2.events.some((e) => e.type === 'CIRCUIT_COMPLETE')).toBe(true);
    expect(cellAt(m2.state.board, 3, 2).kind).toBe('switch');
  });

  it('anahtarsız tahtada olay üretmez', () => {
    expect(turnSwitches(boardWithTerminals()).cells).toEqual([]);
  });
});

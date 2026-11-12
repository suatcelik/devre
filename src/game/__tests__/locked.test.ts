import { cellAt, idx } from '../board';
import { findCircuit } from '../circuit';
import { resolve } from '../engine';
import { Cell } from '../types';
import { E, W, boardWithTerminals, setBlock } from './helpers';

function lock(board: Cell[], r: number, c: number, wires: number) {
  board[idx(r, c)] = { kind: 'block', wires, color: 'purple', locked: true };
}

describe('kilitli blok', () => {
  it('akımı iletir', () => {
    const b = boardWithTerminals();
    for (let c = 1; c <= 6; c++) setBlock(b, 3, c, E | W);
    lock(b, 3, 3, E | W);
    expect(findCircuit(b)).toHaveLength(8);
  });

  it('içinden geçen devre kilitli bloğu kırar ve sayar', () => {
    const b = boardWithTerminals();
    for (let c = 1; c <= 6; c++) setBlock(b, 3, c, E | W);
    lock(b, 3, 3, E | W);
    const res = resolve(b, 0, 0, 1);
    expect(res.circuitLength).toBe(6);
    expect(cellAt(res.board, 3, 3).kind).not.toBe('block');
  });

  it('satır temizlemesi kilitli bloğu kırmaz, diğerlerini temizler', () => {
    const b = boardWithTerminals();
    for (let c = 0; c < 8; c++) setBlock(b, 0, c, 0);
    lock(b, 0, 4, E | W);
    const res = resolve(b, 0, 0, 1);
    expect(res.scoreGained).toBe(70);
    expect(cellAt(res.board, 0, 4)).toMatchObject({ kind: 'block', locked: true });
    expect(cellAt(res.board, 0, 0).kind).toBe('empty');
  });

  it('yalnızca kilitli bloklarla dolu çizgi olay üretmez', () => {
    const b = boardWithTerminals();
    for (let c = 0; c < 8; c++) lock(b, 0, c, E | W);
    const res = resolve(b, 0, 0, 1);
    expect(res.events).toEqual([]);
    expect(res.scoreGained).toBe(0);
  });
});

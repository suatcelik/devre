import { BOARD_SIZE, Board, Cell, Dir, E, N, Pos, S, W, WireDirs } from './types';

export const EMPTY: Cell = { kind: 'empty' };

export const idx = (r: number, c: number) => r * BOARD_SIZE + c;
export const inBounds = (r: number, c: number) =>
  r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

export function emptyBoard(): Cell[] {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => EMPTY);
}

export function cellAt(board: Board, r: number, c: number): Cell {
  return board[idx(r, c)];
}

export function opposite(d: Dir): Dir {
  return (((d << 2) | (d >> 2)) & 0xf) as Dir;
}

export function step(r: number, c: number, d: Dir): Pos {
  switch (d) {
    case N:
      return { r: r - 1, c };
    case S:
      return { r: r + 1, c };
    case E:
      return { r, c: c + 1 };
    default:
      return { r, c: c - 1 };
  }
}

/** Kablo maskesini 90° saat yönünde döndürür: K→D→G→B→K. */
export function rotateCW(mask: WireDirs): WireDirs {
  return ((mask << 1) | (mask >> 3)) & 0xf;
}

export function wiresOf(cell: Cell): WireDirs {
  return cell.kind === 'empty' ? 0 : cell.wires;
}

export function bitCount(mask: number): number {
  let n = 0;
  for (let m = mask; m; m &= m - 1) n++;
  return n;
}

export function findKind(board: Board, kind: 'battery' | 'lamp'): Pos | null {
  const i = board.findIndex((cell) => cell.kind === kind);
  return i < 0 ? null : { r: Math.floor(i / BOARD_SIZE), c: i % BOARD_SIZE };
}

/** Kenardaki, köşe olmayan bir hücrenin içeri bakan yönü. Kenarda değilse null. */
export function inwardDir(r: number, c: number): Dir | null {
  const last = BOARD_SIZE - 1;
  const corner = (r === 0 || r === last) && (c === 0 || c === last);
  if (corner) return null;
  if (c === 0) return E;
  if (c === last) return W;
  if (r === 0) return S;
  if (r === last) return N;
  return null;
}

/** Pil ve lambanın durabileceği tüm kenar hücreleri (köşeler hariç). */
export function edgeSlots(): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (inwardDir(r, c) !== null) out.push({ r, c });
    }
  }
  return out;
}

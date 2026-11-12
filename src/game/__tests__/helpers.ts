import { emptyBoard, idx } from '../board';
import { Cell, Dir, E, N, Piece, PieceCell, S, W } from '../types';

export { N, E, S, W };

/** Pil (3,0) solda sağa bakar, lamba (3,7) sağda sola bakar. */
export function boardWithTerminals(
  battery: { r: number; c: number; d: Dir } = { r: 3, c: 0, d: E },
  lamp: { r: number; c: number; d: Dir } = { r: 3, c: 7, d: W },
): Cell[] {
  const b = emptyBoard();
  b[idx(battery.r, battery.c)] = { kind: 'battery', wires: battery.d };
  b[idx(lamp.r, lamp.c)] = { kind: 'lamp', wires: lamp.d };
  return b;
}

export function setBlock(board: Cell[], r: number, c: number, wires: number): void {
  board[idx(r, c)] = { kind: 'block', wires, color: 'blue' };
}

export function piece(cells: PieceCell[], id = 1): Piece {
  return { id, shapeId: 'test', color: 'pink', cells };
}

import { cellAt, idx, inBounds } from './board';
import { BOARD_SIZE, Board, Cell, Piece, Pos } from './types';

/** Parçanın sol üst köşesi (row, col) olacak şekilde yerleştirilebilir mi? */
export function canPlace(board: Board, piece: Piece, row: number, col: number): boolean {
  return piece.cells.every(({ r, c }) => {
    const rr = row + r;
    const cc = col + c;
    return inBounds(rr, cc) && cellAt(board, rr, cc).kind === 'empty';
  });
}

/** Yerleştirmeyi uygular. Geçerliliği çağıran tarafından kontrol edilmiş olmalı. */
export function place(board: Board, piece: Piece, row: number, col: number): Cell[] {
  const next = board.slice();
  for (const { r, c, wires } of piece.cells) {
    next[idx(row + r, col + c)] = { kind: 'block', wires, color: piece.color };
  }
  return next;
}

export function placedCells(piece: Piece, row: number, col: number): Pos[] {
  return piece.cells.map(({ r, c }) => ({ r: row + r, c: col + c }));
}

/** Parçanın tahtada sığabileceği tüm sol üst köşe konumları. */
export function validPlacements(board: Board, piece: Piece): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canPlace(board, piece, r, c)) out.push({ r, c });
    }
  }
  return out;
}

export function fitsAnywhere(board: Board, piece: Piece): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canPlace(board, piece, r, c)) return true;
    }
  }
  return false;
}

/** Tepsideki hiçbir parça sığmıyorsa oyun biter. Boş tepsi oyun sonu değildir. */
export function isGameOver(board: Board, tray: readonly (Piece | null)[]): boolean {
  const pieces = tray.filter((p): p is Piece => p !== null);
  if (pieces.length === 0) return false;
  return !pieces.some((p) => fitsAnywhere(board, p));
}

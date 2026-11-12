import { inBounds, opposite, step, bitCount } from './board';
import type { Rng } from './rng';
import { DIRS, Dir, E, Piece, PieceCell, PieceColor, S } from './types';

// Parçalar döndürülemez; bu yüzden her yönelim ayrı bir şekildir.
// Her şeklin sabit bir rengi vardır (renk yalnızca görsel).

export interface Shape {
  id: string;
  color: PieceColor;
  cells: readonly [number, number][];
  /** Üretimdeki göreli sıklık. */
  weight: number;
}

export const SHAPES: readonly Shape[] = [
  { id: 'dot', color: 'yellow', cells: [[0, 0]], weight: 2 },

  { id: 'i2h', color: 'pink', cells: [[0, 0], [0, 1]], weight: 3 },
  { id: 'i2v', color: 'pink', cells: [[0, 0], [1, 0]], weight: 3 },

  { id: 'i3h', color: 'blue', cells: [[0, 0], [0, 1], [0, 2]], weight: 3 },
  { id: 'i3v', color: 'blue', cells: [[0, 0], [1, 0], [2, 0]], weight: 3 },
  { id: 'l3a', color: 'green', cells: [[0, 0], [1, 0], [1, 1]], weight: 2 },
  { id: 'l3b', color: 'green', cells: [[0, 1], [1, 0], [1, 1]], weight: 2 },
  { id: 'l3c', color: 'green', cells: [[0, 0], [0, 1], [1, 0]], weight: 2 },
  { id: 'l3d', color: 'green', cells: [[0, 0], [0, 1], [1, 1]], weight: 2 },

  { id: 'i4h', color: 'purple', cells: [[0, 0], [0, 1], [0, 2], [0, 3]], weight: 1 },
  { id: 'i4v', color: 'purple', cells: [[0, 0], [1, 0], [2, 0], [3, 0]], weight: 1 },
  { id: 'o4', color: 'yellow', cells: [[0, 0], [0, 1], [1, 0], [1, 1]], weight: 1 },
  { id: 't4d', color: 'orange', cells: [[0, 0], [0, 1], [0, 2], [1, 1]], weight: 1 },
  { id: 't4u', color: 'orange', cells: [[0, 1], [1, 0], [1, 1], [1, 2]], weight: 1 },
  { id: 'l4a', color: 'orange', cells: [[0, 0], [1, 0], [2, 0], [2, 1]], weight: 1 },
  { id: 'l4b', color: 'orange', cells: [[0, 1], [1, 1], [2, 0], [2, 1]], weight: 1 },
  { id: 's4h', color: 'pink', cells: [[0, 1], [0, 2], [1, 0], [1, 1]], weight: 1 },
  { id: 'z4h', color: 'pink', cells: [[0, 0], [0, 1], [1, 1], [1, 2]], weight: 1 },
];

export const SHAPE_BY_ID: Record<string, Shape> = Object.fromEntries(
  SHAPES.map((s) => [s.id, s]),
);

/** Parça içindeki iki komşu hücrenin birbirine bağlanma olasılığı. */
const INTERNAL_LINK = 0.75;
/** Parçanın dış kenarına kablo ucu çıkma olasılığı. */
const EXTERNAL_END = 0.45;
/** Hücre başına "boş" (kablosuz) hücre olasılığı; tek hücrelik parçada hiç olmaz. */
const BLANK_CELL = 0.06;

/**
 * Bir şekle kablo atar. Kurallar:
 *  - Parça içindeki bağlantılar her zaman karşılıklıdır.
 *  - Hiçbir hücrede tek uç (çıkmaz) kalmaz: her hücre boş, düz, köşe, T veya artıdır.
 */
export function wireShape(shape: Shape, rng: Rng): PieceCell[] {
  const key = (r: number, c: number) => `${r},${c}`;
  const cells = new Map<string, PieceCell>();
  for (const [r, c] of shape.cells) cells.set(key(r, c), { r, c, wires: 0 });

  // En fazla bir boş hücre: böylece her hücrenin onarım için yeterli serbest kenarı kalır.
  const blanks = new Set<string>();
  if (shape.cells.length > 1 && rng.next() < BLANK_CELL * shape.cells.length) {
    blanks.add(rng.pick([...cells.keys()]));
  }

  const neighbor = (cell: PieceCell, d: Dir) => {
    const p = step(cell.r, cell.c, d);
    return cells.get(key(p.r, p.c));
  };

  // İç bağlantılar (her komşu çifti bir kez, N ve W yönünden bakarak değil E ve S yönünden)
  for (const cell of cells.values()) {
    if (blanks.has(key(cell.r, cell.c))) continue;
    for (const d of DIRS) {
      const other = neighbor(cell, d);
      if (!other) {
        if (rng.next() < EXTERNAL_END) cell.wires |= d;
        continue;
      }
      if (d !== E && d !== S) continue; // yalnız E ve S: çift başına tek karar
      if (blanks.has(key(other.r, other.c))) continue;
      if (rng.next() < INTERNAL_LINK) {
        cell.wires |= d;
        other.wires |= opposite(d);
      }
    }
  }

  // Çıkmazları ve tamamen kablosuz (boş seçilmemiş) hücreleri onar.
  let changed = true;
  while (changed) {
    changed = false;
    for (const cell of cells.values()) {
      if (blanks.has(key(cell.r, cell.c))) continue;
      const count = bitCount(cell.wires);
      if (count >= 2) continue;
      const free = DIRS.filter((d) => {
        if (cell.wires & d) return false;
        const other = neighbor(cell, d);
        return !other || !blanks.has(key(other.r, other.c));
      });
      const d = rng.pick(free);
      cell.wires |= d;
      const other = neighbor(cell, d);
      if (other) other.wires |= opposite(d);
      changed = true;
    }
  }

  return [...cells.values()];
}

export function makePiece(shape: Shape, id: number, rng: Rng): Piece {
  return { id, shapeId: shape.id, color: shape.color, cells: wireShape(shape, rng) };
}

/** Parçanın kapladığı satır/sütun sayısı. */
export function pieceSize(piece: Piece): { rows: number; cols: number } {
  let rows = 0;
  let cols = 0;
  for (const { r, c } of piece.cells) {
    rows = Math.max(rows, r + 1);
    cols = Math.max(cols, c + 1);
  }
  return { rows, cols };
}

/** Parça, (row, col) sol üst köşe olacak şekilde tahtanın içinde mi? */
export function pieceInBounds(piece: Piece, row: number, col: number): boolean {
  return piece.cells.every(({ r, c }) => inBounds(row + r, col + c));
}

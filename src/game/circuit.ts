import { cellAt, findKind, idx, inBounds, opposite, step, wiresOf } from './board';
import { BOARD_SIZE, Board, DIRS, Pos } from './types';

/**
 * İki komşu hücre ancak karşılıklı kablo uçları varsa bağlıdır.
 * (r, c) hücresinden bağlı komşuları döndürür.
 */
export function connectedNeighbors(board: Board, r: number, c: number): Pos[] {
  const wires = wiresOf(cellAt(board, r, c));
  const out: Pos[] = [];
  for (const d of DIRS) {
    if (!(wires & d)) continue;
    const p = step(r, c, d);
    if (!inBounds(p.r, p.c)) continue;
    if (wiresOf(cellAt(board, p.r, p.c)) & opposite(d)) out.push(p);
  }
  return out;
}

/**
 * Pilden herhangi bir lambaya giden en kısa yol (pil ve lamba dahil); yol yoksa null.
 * Önizleme ve tek devre gereken yerler için.
 */
export function findCircuit(board: Board): Pos[] | null {
  return findCircuits(board)[0] ?? null;
}

/**
 * Pilden ulaşılabilen her lambaya giden en kısa yol (DEVRE_TASKS 4.6, çift lamba).
 * Tek BFS: yollar pilden çıkan ortak gövdeyi paylaşabilir. Kısa yol önce gelir.
 * Tek lambalı tahtada sonuç [findCircuit(board)] ile aynıdır.
 */
export function findCircuits(board: Board): Pos[][] {
  const start = findKind(board, 'battery');
  if (!start) return [];
  const prev = new Int16Array(BOARD_SIZE * BOARD_SIZE).fill(-1);
  const startIdx = idx(start.r, start.c);
  prev[startIdx] = startIdx;
  const queue: Pos[] = [start];
  const lamps: Pos[] = [];

  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (cellAt(board, cur.r, cur.c).kind === 'lamp') {
      lamps.push(cur);
      continue; // lambanın tek ucu var; içinden geçilmez
    }
    for (const n of connectedNeighbors(board, cur.r, cur.c)) {
      const ni = idx(n.r, n.c);
      if (prev[ni] !== -1) continue;
      const kind = cellAt(board, n.r, n.c).kind;
      if (kind !== 'block' && kind !== 'switch' && kind !== 'lamp') continue;
      prev[ni] = idx(cur.r, cur.c);
      queue.push(n);
    }
  }

  return lamps.map((lamp) => {
    const path: Pos[] = [];
    let i = idx(lamp.r, lamp.c);
    while (i !== startIdx) {
      path.push({ r: Math.floor(i / BOARD_SIZE), c: i % BOARD_SIZE });
      i = prev[i];
    }
    path.push(start);
    return path.reverse();
  });
}

/** Yoldaki blok ve anahtar hücre sayısı (pil ve lamba sayılmaz). Puan bununla hesaplanır. */
export function circuitLength(board: Board, path: readonly Pos[]): number {
  return path.filter((p) => {
    const kind = cellAt(board, p.r, p.c).kind;
    return kind === 'block' || kind === 'switch';
  }).length;
}

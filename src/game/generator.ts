import {
  EMPTY,
  cellAt,
  edgeSlots,
  idx,
  inBounds,
  inwardDir,
  opposite,
  step,
  wiresOf,
} from './board';
import { findCircuit, findCircuits } from './circuit';
import { SHAPES, SHAPE_BY_ID, makePiece } from './pieces';
import { canPlace, fitsAnywhere } from './placement';
import type { Rng } from './rng';
import { Board, Cell, DIRS, Piece, Pos, TRAY_SIZE } from './types';

/** Her tepsi yuvası için kaç aday üretilip aralarından seçileceği. */
const CANDIDATES_PER_SLOT = 4;
/** Açık kablo ucuna uyan adayın ağırlık çarpanı. */
const OPEN_END_BONUS = 3;
/** Pil ile lamba arasındaki en küçük Manhattan uzaklığı. */
export const MIN_TERMINAL_DISTANCE = 5;

/**
 * Parça, tahtanın bir yerinde mevcut bir kablo ucuyla (blok, pil veya lamba)
 * karşılıklı bağlantı kurabiliyor mu?
 */
export function connectsToOpenEnd(board: Board, piece: Piece): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (!canPlace(board, piece, row, col)) continue;
      for (const { r, c, wires } of piece.cells) {
        for (const d of DIRS) {
          if (!(wires & d)) continue;
          const p = step(row + r, col + c, d);
          if (!inBounds(p.r, p.c)) continue;
          if (wiresOf(cellAt(board, p.r, p.c)) & opposite(d)) return true;
        }
      }
    }
  }
  return false;
}

function weightedShape(rng: Rng) {
  return SHAPES[rng.weighted(SHAPES.map((s) => s.weight))];
}

/**
 * Yeni tepsi üretir. Adalet kuralları:
 *  1. Tepsideki en az bir parça tahtaya sığar (gerekirse tek hücrelik parça verilir).
 *  2. Açık kablo uçlarına bağlanabilen parçaların gelme olasılığı daha yüksektir.
 */
export function generateTray(
  board: Board,
  rng: Rng,
  firstId: number,
): { tray: Piece[]; nextId: number } {
  let id = firstId;
  const tray: Piece[] = [];
  for (let slot = 0; slot < TRAY_SIZE; slot++) {
    const candidates: Piece[] = [];
    for (let k = 0; k < CANDIDATES_PER_SLOT; k++) {
      candidates.push(makePiece(weightedShape(rng), id, rng));
    }
    const weights = candidates.map((p) => (connectsToOpenEnd(board, p) ? OPEN_END_BONUS : 1));
    tray.push(candidates[rng.weighted(weights)]);
    id++;
  }

  if (!tray.some((p) => fitsAnywhere(board, p))) {
    // En küçük parça bile sığmıyorsa tahta doludur; oyun sonu kontrolü bunu yakalar.
    const slot = rng.int(TRAY_SIZE);
    tray[slot] = makePiece(SHAPE_BY_ID.dot, tray[slot].id, rng);
  }
  return { tray, nextId: id };
}

const manhattan = (a: Pos, b: Pos) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

/** Çift lambalı tahtada iki lamba arasındaki en küçük uzaklık. */
export const MIN_LAMP_SEPARATION = 3;

export interface TerminalPlacement {
  board: Cell[];
  battery: Pos;
  /** İlk lamba (tek lambalı tahtada tek lamba) */
  lamp: Pos;
  lamps: Pos[];
}

/**
 * Pil ve lambaları yeni kenar konumlarına taşır. Eski konumlar boşalır.
 * Tahtadaki lamba sayısı korunur (çift lambalı bölümlerde iki; en az bir).
 * Tercih sırası: boş kenar hücresi, yeterli uzaklık, anında devre oluşturmama.
 * Uygun boş yer yoksa kenardaki bir bloğu ezerek yer açar.
 */
export function placeTerminals(board: Board, rng: Rng): TerminalPlacement {
  const lampCount = Math.max(1, board.filter((c) => c.kind === 'lamp').length);
  return lampCount === 1 ? placeSingle(board, rng) : placeMany(board, rng, lampCount);
}

const withoutTerminals = (board: Board): Cell[] =>
  board.map((cell) => (cell.kind === 'battery' || cell.kind === 'lamp' ? EMPTY : cell));

function build(base: Cell[], battery: Pos, lamps: Pos[]): Cell[] {
  const next = base.slice();
  next[idx(battery.r, battery.c)] = { kind: 'battery', wires: inwardDir(battery.r, battery.c)! };
  for (const lamp of lamps) next[idx(lamp.r, lamp.c)] = { kind: 'lamp', wires: inwardDir(lamp.r, lamp.c)! };
  return next;
}

/** Tek lamba: davranış ve rastgele sayı kullanımı ilk sürümle birebir aynı (bölüm tohumları buna bağlı). */
function placeSingle(board: Board, rng: Rng): TerminalPlacement {
  const base = withoutTerminals(board);
  const slots = rng.shuffle(edgeSlots());
  const free = slots.filter((p) => base[idx(p.r, p.c)].kind === 'empty');
  const result = (battery: Pos, lamp: Pos): TerminalPlacement => ({
    board: build(base, battery, [lamp]),
    battery,
    lamp,
    lamps: [lamp],
  });

  let fallback: TerminalPlacement | null = null;
  for (const battery of free) {
    for (const lamp of free) {
      if (lamp === battery || manhattan(battery, lamp) < MIN_TERMINAL_DISTANCE) continue;
      const placed = result(battery, lamp);
      if (!findCircuit(placed.board)) return placed;
      fallback ??= placed;
    }
  }
  if (fallback) return fallback;

  // Kenarda yeterli boş yer yok: önce boşları, sonra herhangi iki uzak kenar hücresini kullan.
  const ordered = [...free, ...slots.filter((p) => !free.includes(p))];
  const battery = ordered[0];
  const lamp =
    ordered.find((p) => p !== battery && manhattan(p, battery) >= MIN_TERMINAL_DISTANCE) ??
    ordered[1];
  return result(battery, lamp);
}

/** Birden çok lamba: her lamba pilden uzak, lambalar birbirinden ayrık, anında devre yok. */
function placeMany(board: Board, rng: Rng, count: number): TerminalPlacement {
  const base = withoutTerminals(board);
  const slots = rng.shuffle(edgeSlots());
  const free = slots.filter((p) => base[idx(p.r, p.c)].kind === 'empty');
  const pickLamps = (battery: Pos, pool: Pos[]) => {
    const lamps: Pos[] = [];
    for (const p of pool) {
      if (p === battery || manhattan(p, battery) < MIN_TERMINAL_DISTANCE) continue;
      if (lamps.some((l) => manhattan(l, p) < MIN_LAMP_SEPARATION)) continue;
      lamps.push(p);
      if (lamps.length === count) return lamps;
    }
    return null;
  };

  let fallback: TerminalPlacement | null = null;
  for (const battery of free) {
    // Lambaları farklı sıralarla dene: aynı pil için birkaç seçenek.
    for (let shift = 0; shift < free.length; shift += 3) {
      const lamps = pickLamps(battery, [...free.slice(shift), ...free.slice(0, shift)]);
      if (!lamps) break;
      const placed = { board: build(base, battery, lamps), battery, lamp: lamps[0], lamps };
      if (findCircuits(placed.board).length === 0) return placed;
      fallback ??= placed;
    }
  }
  if (fallback) return fallback;

  // Boş yer yetmiyor: kenar hücrelerinin tamamından seç (gerekirse blok ezilir).
  const battery = free[0] ?? slots[0];
  const lamps = pickLamps(battery, slots) ?? slots.filter((p) => p !== battery).slice(0, count);
  return { board: build(base, battery, lamps), battery, lamp: lamps[0], lamps };
}

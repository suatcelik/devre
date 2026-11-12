// Basit açgözlü oyuncu: bölüm zorluğunu ölçmek ve her bölümün geçilebilir olduğunu
// test etmek için (DEVRE_TASKS 4.4). Gerçek bir oyuncudan zayıftır; eşikler buna göre konur.

import { cellAt, findKind, idx, inBounds, opposite, step, wiresOf } from '../game/board';
import { applyMove } from '../game/engine';
import { validPlacements } from '../game/placement';
import { BOARD_SIZE, Board, DIRS, GameState, Pos } from '../game/types';
import { goalProgress, levelOutcome, levelState, Outcome } from './run';
import type { LevelData } from './types';

/** Pilden (veya lambadan) kablo bağlantısıyla ulaşılabilen hücreler. */
function reach(board: Board, from: Pos | null): Pos[] {
  if (!from) return [];
  const seen = new Set<number>([idx(from.r, from.c)]);
  const queue = [from];
  for (let h = 0; h < queue.length; h++) {
    const p = queue[h];
    const w = wiresOf(cellAt(board, p.r, p.c));
    for (const d of DIRS) {
      if (!(w & d)) continue;
      const n = step(p.r, p.c, d);
      if (!inBounds(n.r, n.c) || seen.has(idx(n.r, n.c))) continue;
      if (!(wiresOf(cellAt(board, n.r, n.c)) & opposite(d))) continue;
      seen.add(idx(n.r, n.c));
      queue.push(n);
    }
  }
  return queue;
}

/**
 * Pil tarafındaki yolun açık uçları ile lamba tarafındakiler arasındaki en kısa Manhattan uzaklığı.
 * Açık uç: kablosu boş bir hücreye bakan bağlı hücre. Küçüldükçe devre yaklaşır.
 */
function gap(board: Board, a: Pos[], b: Pos[]): number {
  const openEnds = (cells: Pos[]) =>
    cells.flatMap((p) =>
      DIRS.filter((d) => wiresOf(cellAt(board, p.r, p.c)) & d)
        .map((d) => step(p.r, p.c, d))
        .filter((n) => inBounds(n.r, n.c) && cellAt(board, n.r, n.c).kind === 'empty'),
    );
  const ea = openEnds(a);
  const eb = openEnds(b);
  if (!ea.length || !eb.length) return 16;
  let best = 16;
  for (const p of ea) for (const q of eb) best = Math.min(best, Math.abs(p.r - q.r) + Math.abs(p.c - q.c));
  return best;
}

function emptyCount(board: Board) {
  let n = 0;
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) if (board[i].kind === 'empty') n++;
  return n;
}

function evaluate(level: LevelData, before: GameState, after: GameState): number {
  const gained = after.score - before.score;
  const circuit = after.circuits > before.circuits ? 1 : 0;
  const goalBefore = goalProgress(level.goal, before);
  const goalAfter = goalProgress(level.goal, after);
  const goalGain = (goalAfter.current - goalBefore.current) / Math.max(1, goalAfter.target);
  const b = after.board;
  const fromBattery = reach(b, findKind(b, 'battery'));
  // Çift lambada her iki lambanın bağlı yolu da hedeftir.
  const fromLamp = b.flatMap((c, i) => (c.kind === 'lamp' ? reach(b, { r: Math.floor(i / 8), c: i % 8 }) : []));
  const distance = gap(b, fromBattery, fromLamp);
  // Kilit hedefinde: pil ya da lambaya bağlanan her kilitli blok, devrenin onun içinden geçeceği demektir.
  const lockedLinked = level.goal.type === 'locked'
    ? [...fromBattery, ...fromLamp].filter((p) => {
        const cell = cellAt(b, p.r, p.c);
        return cell.kind === 'block' && cell.locked;
      }).length
    : 0;
  // Pil ve lambaya bağlı yolu büyütmek her hedefte devreye giden yoldur.
  return (
    gained + 400 * circuit + 3000 * goalGain - 120 * distance + 25 * (fromBattery.length + fromLamp.length) +
    350 * lockedLinked + 4 * emptyCount(b) - (after.over ? 100000 : 0)
  );
}

export interface BotResult {
  outcome: Outcome;
  moves: number;
  score: number;
  circuits: number;
  /** Botun yaptığı hamleler (tepsi yuvası, satır, sütun): sunucu doğrulama testleri için */
  played: { i: number; r: number; c: number }[];
}

/** Bölümü baştan sona açgözlü oynar. */
export function playLevel(level: LevelData): BotResult {
  let game = levelState(level);
  const played: { i: number; r: number; c: number }[] = [];
  for (;;) {
    const outcome = levelOutcome(level, game);
    if (outcome.status !== 'playing') return { outcome, moves: game.moves, score: game.score, circuits: game.circuits, played };
    let best: GameState | null = null;
    let bestMove: { i: number; r: number; c: number } | null = null;
    let bestValue = -Infinity;
    game.tray.forEach((piece, i) => {
      if (!piece) return;
      for (const { r, c } of validPlacements(game.board, piece)) {
        const res = applyMove(game, i, r, c);
        if (!res) continue;
        const v = evaluate(level, game, res.state);
        if (v > bestValue) {
          bestValue = v;
          best = res.state;
          bestMove = { i, r, c };
        }
      }
    });
    if (!best) return { outcome: { status: 'lost', reason: 'stuck' }, moves: game.moves, score: game.score, circuits: game.circuits, played };
    game = best;
    played.push(bestMove!);
  }
}

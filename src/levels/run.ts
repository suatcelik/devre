// Bölüm kuralları (DEVRE_TASKS 4.3, 4.5): hedef ilerlemesi, kazanma/kaybetme, bonus ve yıldızlar.
// Saf mantık: oyun durumunu değiştirmez, okur.

import { EMPTY, idx, inwardDir } from '../game/board';
import { newGame } from '../game/engine';
import { BOARD_SIZE, Cell, GameState } from '../game/types';
import type { Goal, LevelData } from './types';

/** Haritadaki anahtar karakterleri ve başlangıç kablo yönleri (K=1, D=2, G=4, B=8) */
const SWITCH_CHARS: Record<string, number> = { '─': 2 | 8, '│': 1 | 4, '┌': 4 | 2, '┐': 4 | 8, '└': 1 | 2, '┘': 1 | 8 };

/**
 * Bu deneme için tohum: havuzdan rastgele, bir önceki denemeyle aynı olmayan.
 * `rand` 0..1 arası sayı verir (testte sabitlenir).
 */
export function pickLevelSeed(level: LevelData, previous: number | null, rand: () => number = Math.random): number {
  const pool = level.seeds?.length ? level.seeds : [level.seed];
  const choices = pool.length > 1 && previous !== null ? pool.filter((s) => s !== previous) : pool;
  return choices[Math.min(choices.length - 1, Math.floor(rand() * choices.length))];
}

/** Hedef tutunca kalan her hamle bu kadar bonus puan getirir. */
export const MOVE_BONUS = 100;

/**
 * Bölümün başlangıç durumu: tohumdan oyun + bölüm haritası.
 * Haritada 'B' ve 'L' varsa pil ve lamba oraya konur (tohumun seçtiği yer yerine);
 * '#' kablosuz engel bloğudur.
 */
export function levelState(level: LevelData): GameState {
  const game = newGame(level.seed);
  if (!level.board) return game;
  let board: Cell[] = game.board.slice();
  const marks = level.board.join('');
  if (marks.includes('B') && marks.includes('L')) {
    board = board.map((cell) => (cell.kind === 'battery' || cell.kind === 'lamp' ? EMPTY : cell));
  }
  level.board.forEach((row, r) => {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const ch = row[c];
      if (ch === 'B' || ch === 'L') {
        const dir = inwardDir(r, c);
        if (dir === null) throw new Error(`Bölüm ${level.id}: ${ch} (${r},${c}) köşede ya da kenarda değil`);
        board[idx(r, c)] = ch === 'B' ? { kind: 'battery', wires: dir } : { kind: 'lamp', wires: dir };
      } else if (ch === '#' && board[idx(r, c)].kind === 'empty') {
        board[idx(r, c)] = { kind: 'block', wires: 0, color: 'purple' };
      } else if (ch in SWITCH_CHARS) {
        if (board[idx(r, c)].kind !== 'empty') throw new Error(`Bölüm ${level.id}: anahtar (${r},${c}) dolu hücrede`);
        board[idx(r, c)] = { kind: 'switch', wires: SWITCH_CHARS[ch] };
      } else if (/[1-9a-f]/.test(ch)) {
        // Kilitli blok: değer kablo maskesi. Pil/lamba tohumdan geliyorsa üstüne denk gelebilir; bu bir veri hatasıdır.
        if (board[idx(r, c)].kind !== 'empty') throw new Error(`Bölüm ${level.id}: kilitli blok (${r},${c}) dolu hücrede`);
        board[idx(r, c)] = { kind: 'block', wires: parseInt(ch, 16), color: 'blue', locked: true };
      }
    }
  });
  return { ...game, board };
}

export interface GoalProgress {
  current: number;
  target: number;
  done: boolean;
}

export function goalProgress(goal: Goal, game: GameState): GoalProgress {
  switch (goal.type) {
    case 'lamps':
      return { current: game.circuits, target: goal.count, done: game.circuits >= goal.count };
    case 'circuit':
      return { current: game.longestCircuit, target: goal.length, done: game.longestCircuit >= goal.length };
    case 'score':
      return { current: game.score, target: goal.points, done: game.score >= goal.points };
    case 'locked': {
      const left = lockedCount(game.board);
      return { current: goal.count - left, target: goal.count, done: left === 0 };
    }
  }
}

/** Tahtada kalan kilitli blok sayısı */
export function lockedCount(board: readonly Cell[]): number {
  return board.filter((c) => c.kind === 'block' && c.locked).length;
}

export const movesLeft = (level: LevelData, game: GameState) => Math.max(0, level.moves - game.moves);

export type Outcome =
  | { status: 'playing' }
  | { status: 'won'; bonus: number; score: number; stars: number }
  | { status: 'lost'; reason: 'moves' | 'stuck' };

/**
 * Hedef tutunca bölüm hemen kazanılır; kalan hamleler bonusa döner.
 * Hamle biterse ya da hiçbir parça sığmazsa kaybedilir.
 */
export function levelOutcome(level: LevelData, game: GameState): Outcome {
  if (goalProgress(level.goal, game).done) {
    const bonus = movesLeft(level, game) * MOVE_BONUS;
    const score = game.score + bonus;
    return { status: 'won', bonus, score, stars: starsFor(level, score) };
  }
  if (game.moves >= level.moves) return { status: 'lost', reason: 'moves' };
  if (game.over) return { status: 'lost', reason: 'stuck' };
  return { status: 'playing' };
}

/** Kazanılan bölümde yıldız sayısı (en az 1). */
export function starsFor(level: LevelData, score: number): number {
  return Math.max(1, level.stars.filter((t) => score >= t).length);
}

/** Hedefin kısa yazımı: "5 lamba yak", "8 hücrelik devre kur", "1.500 puan topla" */
export function goalText(goal: Goal): string {
  switch (goal.type) {
    case 'lamps':
      return `${goal.count} lamba yak`;
    case 'circuit':
      return `${goal.length} hücrelik devre kur`;
    case 'score':
      return `${String(goal.points).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} puan topla`;
    case 'locked':
      return `${goal.count} kilitli bloğu kır`;
  }
}

/** HUD'daki hedef kutusunun etiketi */
export function goalLabel(goal: Goal): string {
  switch (goal.type) {
    case 'lamps':
      return 'Lamba';
    case 'circuit':
      return 'Devre';
    case 'score':
      return 'Hedef';
    case 'locked':
      return 'Kilit';
  }
}

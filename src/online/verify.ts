// Hile önleme (DEVRE_TASKS 5.4): Günün Tahtası hamle listesini aynı tohumla baştan oynatıp
// puanı yeniden hesaplar. Hem istemcide hem sunucu fonksiyonunda (supabase/functions) çalışır;
// bu yüzden yalnızca saf oyun modülüne bağlıdır (React Native yok).

import { applyMove, newGame } from '../game/engine';
import { seedFromString } from '../game/rng';
import { BOARD_SIZE, TRAY_SIZE } from '../game/types';

/** Bir hamle: tepsi yuvası ve parçanın sol üst köşesi */
export interface DailyMove {
  i: number;
  r: number;
  c: number;
}

/** Makul üst sınır: 64 hücrelik tahtada bir oyun bundan uzun süremez. */
export const MAX_DAILY_MOVES = 600;

export type ReplayResult =
  | { ok: true; score: number; circuits: number; longest: number; over: boolean; moves: number }
  | { ok: false; reason: 'bad-date' | 'too-many-moves' | 'bad-move' | 'illegal-move'; at?: number };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isInt = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

/** Günün tohumu: istemcideki Günün Tahtası ile aynı (bkz. store/gameStore seedFor). */
export const dailySeed = (date: string) => seedFromString(date);

export function replayDaily(date: string, moves: readonly DailyMove[]): ReplayResult {
  if (typeof date !== 'string' || !DATE_RE.test(date)) return { ok: false, reason: 'bad-date' };
  if (!Array.isArray(moves) || moves.length > MAX_DAILY_MOVES) return { ok: false, reason: 'too-many-moves' };
  let state = newGame(dailySeed(date));
  for (let k = 0; k < moves.length; k++) {
    const m = moves[k];
    if (!m || !isInt(m.i, 0, TRAY_SIZE - 1) || !isInt(m.r, 0, BOARD_SIZE - 1) || !isInt(m.c, 0, BOARD_SIZE - 1)) {
      return { ok: false, reason: 'bad-move', at: k };
    }
    // Oyun bittikten sonra hamle olamaz; geçersiz yerleştirme reddedilir.
    if (state.over) return { ok: false, reason: 'illegal-move', at: k };
    const res = applyMove(state, m.i, m.r, m.c);
    if (!res) return { ok: false, reason: 'illegal-move', at: k };
    state = res.state;
  }
  return {
    ok: true,
    score: state.score,
    circuits: state.circuits,
    longest: state.longestCircuit,
    over: state.over,
    moves: moves.length,
  };
}

/** Sunucu, gönderilen tarihin bugüne (UTC) en fazla bir gün uzak olmasını ister: saat dilimi payı. */
export function isPlayableDate(date: string, nowUtc: Date): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const day = Date.UTC(y, m - 1, d);
  const today = Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate());
  return Math.abs(day - today) <= 86_400_000;
}

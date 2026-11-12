// Jokerler (DEVRE_TASKS 4.10): oynayarak kazanılır ya da bölümlerden kazanılan altınla dükkândan alınır.
// Gerçek parayla satın alma yoktur. Hiçbiri hamle saymaz.
//   Karıştır  tepsiyi yeniler                       (ucuz: tek hamleyi kurtarır)
//   Çekiç     bir bloğu kırar                       (ucuz)
//   Döndür    bir bloğu 90° döndürür, devre kurabilir (orta: doğrudan lamba yakabilir)
//   Yıldırım  tahtadaki bütün blokları kırar, kilitliler dahil (pahalı: bölümü tek başına kurtarabilir)

import { EMPTY, cellAt, idx, rotateCW } from './board';
import { resolve } from './engine';
import { generateTray } from './generator';
import { isGameOver } from './placement';
import { createRng } from './rng';
import { BOARD_SIZE, Board, GameEvent, GameState, Pos } from './types';

export type PowerupKind = 'hammer' | 'shuffle' | 'rotate' | 'lightning';
export type Inventory = Record<PowerupKind, number>;

export const POWERUP_KINDS: readonly PowerupKind[] = ['shuffle', 'hammer', 'rotate', 'lightning'];

/** Oynayarak kazanılan jokerler en fazla bu kadar birikir (aynı bölümü tekrar oynayarak sınırsız toplanamasın). */
export const POWERUP_CAP = 5;
/** Dükkândan alınarak her jokerden en fazla bu kadar tutulur. */
export const MAX_OWNED = 9;
/** Çekiç kazandıran devre uzunluğu ("Süper Devre!" eşiği) */
export const HAMMER_CIRCUIT = 12;

export const EMPTY_INVENTORY: Inventory = { hammer: 0, shuffle: 0, rotate: 0, lightning: 0 };

// ---------- Altın ----------

/** Dükkân fiyatları (altın). Bölümü kendi başına geçirebilen joker pahalı, tek hamleyi kurtaran ucuz. */
export const PRICES: Record<PowerupKind, number> = { shuffle: 40, hammer: 60, rotate: 90, lightning: 300 };
/** Yeni oyuncu (ve bu sürüme geçen eski oyuncu) bu kadar altınla başlar. */
export const START_COINS = 100;
/** Bölümü ilk kez geçince taban ödül; her yıldız ayrıca ödüllendirilir. */
export const FIRST_CLEAR_COINS = 30;
export const STAR_COINS = 15;
/** Daha önce geçilmiş bölümü yeniden kazanınca (yeni yıldız yoksa) küçük ödül: tekrar oynamak altın çiftliğine dönmesin. */
export const REPLAY_COINS = 10;

/**
 * Bölüm kazanınca verilen altın. `prevStars` bölümün önceki en iyi yıldızı (0 = ilk kez geçiliyor).
 * İlk geçiş: 45 / 60 / 75. Tekrar: 10 + yeni kazanılan her yıldız için 15.
 */
export function levelCoins(prevStars: number, stars: number): number {
  if (prevStars <= 0) return FIRST_CLEAR_COINS + STAR_COINS * stars;
  return REPLAY_COINS + STAR_COINS * Math.max(0, stars - prevStars);
}

/** Dükkândan bir joker alır. Altın yetmezse ya da üst sınırdaysa null. */
export function buyPowerup(inv: Inventory, coins: number, kind: PowerupKind): { inventory: Inventory; coins: number } | null {
  if (coins < PRICES[kind] || inv[kind] >= MAX_OWNED) return null;
  return { inventory: { ...inv, [kind]: inv[kind] + 1 }, coins: coins - PRICES[kind] };
}

// ---------- Jokerlerin etkisi ----------

export interface PowerupResult {
  state: GameState;
  events: GameEvent[];
  /** Animasyonda çizilecek ara tahta (ör. döndürülmüş ama henüz çözümlenmemiş). Yoksa eski tahta. */
  placed?: Board;
}

/** Çekiç yalnızca sıradan bloğa işler: kilitli blok, anahtar, pil ve lamba kırılmaz. */
export function canHammer(state: GameState, r: number, c: number): boolean {
  const cell = cellAt(state.board, r, c);
  return cell.kind === 'block' && !cell.locked;
}

export function applyHammer(state: GameState, r: number, c: number): PowerupResult | null {
  if (!canHammer(state, r, c)) return null;
  const board = state.board.slice();
  board[idx(r, c)] = EMPTY;
  return {
    state: { ...state, board, over: isGameOver(board, state.tray) },
    events: [{ type: 'BLOCK_BROKEN', pos: { r, c } }],
  };
}

/** Tepsideki parçaları atıp tohumlu yeni bir tepsi verir (adalet kuralı geçerli: en az biri sığar). */
export function applyShuffle(state: GameState): PowerupResult {
  const rng = createRng(state.rngState);
  const { tray, nextId } = generateTray(state.board, rng, state.nextPieceId);
  return {
    state: { ...state, tray, nextPieceId: nextId, rngState: rng.state, over: isGameOver(state.board, tray) },
    events: [{ type: 'TRAY_REFILL', tray }],
  };
}

/**
 * Döndür: kablolu bir blok (kilitli de olabilir) döndürülebilir. Kablosuz engel ve
 * dönünce değişmeyen artı (+) blok döndürülemez; anahtar zaten kendi döner.
 */
export function canRotate(state: GameState, r: number, c: number): boolean {
  const cell = cellAt(state.board, r, c);
  return cell.kind === 'block' && cell.wires !== 0 && rotateCW(cell.wires) !== cell.wires;
}

/**
 * Bloğu 90° saat yönünde döndürür, sonra tahtayı bir hamle gibi çözümler: yol tamamlandıysa lamba yanar,
 * puan ve kombo işler, pil ve lamba yer değiştirir. Hamle sayılmaz, anahtarlar dönmez, tepsi değişmez.
 */
export function applyRotate(state: GameState, r: number, c: number): PowerupResult | null {
  if (!canRotate(state, r, c)) return null;
  const cell = cellAt(state.board, r, c);
  if (cell.kind !== 'block') return null;
  const placed = state.board.slice();
  placed[idx(r, c)] = { ...cell, wires: rotateCW(cell.wires) };
  const res = resolve(placed, state.combo, state.score, state.rngState);
  return {
    placed,
    state: {
      ...state,
      board: res.board,
      score: state.score + res.scoreGained,
      // Döndürmek hamle değildir: devre kurulmazsa kombo bozulmaz.
      combo: res.lampsLit > 0 ? res.combo : state.combo,
      circuits: state.circuits + res.lampsLit,
      longestCircuit: Math.max(state.longestCircuit, res.circuitLength),
      rngState: res.rngState,
      over: isGameOver(res.board, state.tray),
    },
    events: [{ type: 'BLOCK_ROTATED', pos: { r, c } }, ...res.events],
  };
}

/** Yıldırım: tahtada en az bir blok varsa kullanılabilir. */
export function canLightning(state: GameState): boolean {
  return state.board.some((cell) => cell.kind === 'block');
}

/**
 * Bütün blokları kırar; kilitli bloklar da kırılır (kilit hedefi tamamlanabilir).
 * Pil, lamba ve anahtarlar yerinde kalır. Puan getirmez: puan hedefini joker değil oyuncu tutturur.
 */
export function applyLightning(state: GameState): PowerupResult | null {
  if (!canLightning(state)) return null;
  const cells: Pos[] = [];
  const board = state.board.map((cell, i) => {
    if (cell.kind !== 'block') return cell;
    cells.push({ r: Math.floor(i / BOARD_SIZE), c: i % BOARD_SIZE });
    return EMPTY;
  });
  return {
    state: { ...state, board, over: isGameOver(board, state.tray) },
    events: [{ type: 'LIGHTNING', cells }],
  };
}

/** Bir hamlenin olaylarından kazanılan jokerler: Süper Devre ya da Çifte Işık → +1 Çekiç. */
export function earnedFromMove(events: readonly GameEvent[]): Partial<Inventory> {
  const big = events.some(
    (e) => e.type === 'CIRCUIT_COMPLETE' && (e.double || e.length >= HAMMER_CIRCUIT),
  );
  return big ? { hammer: 1 } : {};
}

/** Oynayarak kazanılanı envantere ekler; kazanım üst sınırını aşmaz, satın alınmış fazlayı da silmez. */
export function addPowerups(inv: Inventory, gain: Partial<Inventory>): Inventory {
  const next = { ...inv };
  for (const k of POWERUP_KINDS) {
    const g = gain[k] ?? 0;
    if (g > 0) next[k] = Math.max(inv[k], Math.min(POWERUP_CAP, inv[k] + g));
  }
  return next;
}

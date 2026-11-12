// Saf oyun tipleri. Arayüzden bağımsızdır; sunucuda da çalışır.

export const BOARD_SIZE = 8;
export const TRAY_SIZE = 3;

/** Kablo yönleri bit maskesi olarak tutulur: N=1, E=2, S=4, W=8. */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
export type Dir = typeof N | typeof E | typeof S | typeof W;
export const DIRS: readonly Dir[] = [N, E, S, W];

/** 0..15 arası bit maskesi. 0 = boş kablo, 2 bit = düz/köşe, 3 bit = T, 4 bit = artı. */
export type WireDirs = number;

/** Parça renkleri yalnızca görseldir; kurala etkisi yoktur. */
export type PieceColor = 'pink' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export type Cell =
  | { kind: 'empty' }
  /**
   * Blok. `locked`: bölümle gelen kafesli blok (DEVRE_TASKS 4.6). Akımı iletir;
   * satır/sütun temizlemesi kırmaz, yalnızca içinden geçen devre kırar.
   */
  | { kind: 'block'; wires: WireDirs; color: PieceColor; locked?: boolean }
  /**
   * Anahtar (DEVRE_TASKS 4.6): bölümle gelen kalıcı döner kablo. Her hamleden sonra 90° saat yönünde döner;
   * o anki yönünde akımı iletir; devre ve satır temizlemesi onu silmez.
   */
  | { kind: 'switch'; wires: WireDirs }
  /** Pil ve lambanın tek bir ucu vardır, tahtanın içine bakar. */
  | { kind: 'battery'; wires: Dir }
  | { kind: 'lamp'; wires: Dir };

/** 8x8 tahta, satır öncelikli: index = row * 8 + col. */
export type Board = readonly Cell[];

export interface PieceCell {
  r: number;
  c: number;
  wires: WireDirs;
}

export interface Piece {
  id: number;
  shapeId: string;
  color: PieceColor;
  cells: readonly PieceCell[];
}

export interface Pos {
  r: number;
  c: number;
}

export interface GameState {
  board: Board;
  /** Yerleştirilen parçanın yuvası null olur; üçü de null olunca tepsi yenilenir. */
  tray: readonly (Piece | null)[];
  score: number;
  /** Art arda devre tamamlanan hamle sayısı. Devre puanı bununla çarpılır. */
  combo: number;
  moves: number;
  circuits: number;
  longestCircuit: number;
  seed: number;
  rngState: number;
  nextPieceId: number;
  over: boolean;
}

export type GameEvent =
  | { type: 'PLACED'; pieceId: number; trayIndex: number; at: Pos; cells: Pos[] }
  /** Her lambaya giden yol için bir olay; `double`: aynı hamlede iki lamba birden yandı (Çifte Işık) */
  | { type: 'CIRCUIT_COMPLETE'; path: Pos[]; length: number; combo: number; double: boolean }
  | { type: 'LINE_CLEAR'; rows: number[]; cols: number[]; cells: Pos[] }
  | { type: 'SCORE'; amount: number; reason: 'circuit' | 'line'; total: number }
  /** `lamp` ilk lamba; `lamps` tahtadaki tüm lambalar (çift lambalı bölümde iki) */
  | { type: 'TERMINALS_MOVED'; battery: Pos; lamp: Pos; lamps: Pos[] }
  | { type: 'TRAY_REFILL'; tray: Piece[] }
  /** Çekiçle bir blok kırıldı (DEVRE_TASKS 4.10) */
  | { type: 'BLOCK_BROKEN'; pos: Pos }
  /** Döndür jokeri: blok 90° saat yönünde döndü */
  | { type: 'BLOCK_ROTATED'; pos: Pos }
  /** Yıldırım jokeri: tahtadaki tüm bloklar (kilitliler dahil) kırıldı */
  | { type: 'LIGHTNING'; cells: Pos[] }
  /** Hamle sonunda anahtarlar 90° döndü */
  | { type: 'SWITCHES_TURNED'; cells: Pos[] }
  | { type: 'GAME_OVER'; score: number };

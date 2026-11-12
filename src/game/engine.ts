import { EMPTY, cellAt, emptyBoard, idx, rotateCW } from './board';
import { circuitLength, findCircuits } from './circuit';
import { generateTray, placeTerminals } from './generator';
import { canPlace, isGameOver, place, placedCells } from './placement';
import { createRng } from './rng';
import { BOARD_SIZE, Board, Cell, GameEvent, GameState, Pos } from './types';

export const CIRCUIT_POINTS = 10;
export const LINE_CELL_POINTS = 10;
/** Aynı hamlede iki lamba birden yanınca devre puanı bununla çarpılır (Çifte Işık). */
export const DOUBLE_LAMP_MULTIPLIER = 2;

/** Devre puanı: yol uzunluğu × yol uzunluğu × 10 × kombo çarpanı. */
export function circuitScore(length: number, combo: number): number {
  return length * length * CIRCUIT_POINTS * Math.max(1, combo);
}

export function newGame(seed: number): GameState {
  const rng = createRng(seed);
  const { board } = placeTerminals(emptyBoard(), rng);
  const { tray, nextId } = generateTray(board, rng, 1);
  return {
    board,
    tray,
    score: 0,
    combo: 0,
    moves: 0,
    circuits: 0,
    longestCircuit: 0,
    seed,
    rngState: rng.state,
    nextPieceId: nextId,
    over: false,
  };
}

/** Dolu satır ve sütunları bulur. Pil/lamba dolu sayılır ama temizlenmez. */
export function findFullLines(board: Board): { rows: number[]; cols: number[] } {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    let rowFull = true;
    let colFull = true;
    for (let j = 0; j < BOARD_SIZE; j++) {
      if (cellAt(board, i, j).kind === 'empty') rowFull = false;
      if (cellAt(board, j, i).kind === 'empty') colFull = false;
    }
    if (rowFull) rows.push(i);
    if (colFull) cols.push(i);
  }
  return { rows, cols };
}

export interface ResolveResult {
  board: Cell[];
  events: GameEvent[];
  scoreGained: number;
  combo: number;
  circuitLength: number;
  /** Bu hamlede yanan lamba sayısı (çift lambada 2 olabilir) */
  lampsLit: number;
  rngState: number;
}

/**
 * Yerleştirme sonrası tahtayı çözümler:
 * devre temizleme → satır/sütun temizleme → pil/lamba yer değiştirme.
 * `combo`, bu hamleden önceki art arda devre sayısıdır.
 */
export function resolve(
  board: Board,
  combo: number,
  score: number,
  rngState: number,
): ResolveResult {
  const rng = createRng(rngState);
  const events: GameEvent[] = [];
  let next = board.slice();
  let total = score;
  let length = 0;

  // Pilden ulaşılan her lamba yanar. İki lamba birden: Çifte Işık, puan ×2.
  const paths = findCircuits(next);
  const path = paths[0] ?? null;
  if (paths.length) {
    combo += 1;
    const double = paths.length > 1;
    const lengths = paths.map((p) => circuitLength(next, p));
    length = Math.max(...lengths);
    let amount = lengths.reduce((sum, len) => sum + circuitScore(len, combo), 0);
    if (double) amount *= DOUBLE_LAMP_MULTIPLIER;
    for (const p of paths.flat()) {
      if (cellAt(next, p.r, p.c).kind === 'block') next[idx(p.r, p.c)] = EMPTY;
    }
    total += amount;
    paths.forEach((p, i) => events.push({ type: 'CIRCUIT_COMPLETE', path: p, length: lengths[i], combo, double }));
    events.push({ type: 'SCORE', amount, reason: 'circuit', total });
  } else {
    combo = 0;
  }

  const { rows, cols } = findFullLines(next);
  // Yalnızca kilitli bloklarla dolu bir çizgi temizlenecek bir şey bırakmaz; olay üretilmez.
  const cleared: Pos[] = [];
  if (rows.length || cols.length) {
    const seen = new Set<number>();
    const clear = (r: number, c: number) => {
      const i = idx(r, c);
      const cell = next[i];
      // Kilitli blok satır/sütun temizlemesiyle kırılmaz.
      if (seen.has(i) || cell.kind !== 'block' || cell.locked) return;
      seen.add(i);
      cleared.push({ r, c });
      next[i] = EMPTY;
    };
    for (const r of rows) for (let c = 0; c < BOARD_SIZE; c++) clear(r, c);
    for (const c of cols) for (let r = 0; r < BOARD_SIZE; r++) clear(r, c);
  }
  if (cleared.length) {
    const amount = cleared.length * LINE_CELL_POINTS;
    total += amount;
    events.push({ type: 'LINE_CLEAR', rows, cols, cells: cleared });
    events.push({ type: 'SCORE', amount, reason: 'line', total });
  }

  if (path) {
    const moved = placeTerminals(next, rng);
    next = moved.board;
    events.push({ type: 'TERMINALS_MOVED', battery: moved.battery, lamp: moved.lamp, lamps: moved.lamps });
  }

  return {
    board: next,
    events,
    scoreGained: total - score,
    combo,
    circuitLength: length,
    lampsLit: paths.length,
    rngState: rng.state,
  };
}

export interface MoveResult {
  state: GameState;
  events: GameEvent[];
}

/**
 * Tepsideki parçayı (row, col) sol üst köşesine yerleştirir.
 * Geçersiz hamlede null döner; durum değişmez.
 */
export function applyMove(
  state: GameState,
  trayIndex: number,
  row: number,
  col: number,
): MoveResult | null {
  if (state.over) return null;
  const piece = state.tray[trayIndex];
  if (!piece || !canPlace(state.board, piece, row, col)) return null;

  const events: GameEvent[] = [
    { type: 'PLACED', pieceId: piece.id, trayIndex, at: { r: row, c: col }, cells: placedCells(piece, row, col) },
  ];
  const placed = place(state.board, piece, row, col);
  const res = resolve(placed, state.combo, state.score, state.rngState);
  events.push(...res.events);

  // Hamle sonunda anahtarlar 90° döner (4.6); tepsi ve oyun sonu yeni yönü görür.
  const turned = turnSwitches(res.board);
  const board = turned.board;
  if (turned.cells.length) events.push({ type: 'SWITCHES_TURNED', cells: turned.cells });

  let tray = state.tray.map((p, i) => (i === trayIndex ? null : p));
  let rngState = res.rngState;
  let nextPieceId = state.nextPieceId;
  if (tray.every((p) => p === null)) {
    const rng = createRng(rngState);
    const fresh = generateTray(board, rng, nextPieceId);
    tray = fresh.tray;
    nextPieceId = fresh.nextId;
    rngState = rng.state;
    events.push({ type: 'TRAY_REFILL', tray: fresh.tray });
  }

  const score = state.score + res.scoreGained;
  const over = isGameOver(board, tray);
  if (over) events.push({ type: 'GAME_OVER', score });

  return {
    state: {
      ...state,
      board,
      tray,
      score,
      combo: res.combo,
      moves: state.moves + 1,
      circuits: state.circuits + res.lampsLit,
      longestCircuit: Math.max(state.longestCircuit, res.circuitLength),
      rngState,
      nextPieceId,
      over,
    },
    events,
  };
}

/** Tahtadaki tüm anahtarları 90° saat yönünde döndürür. */
export function turnSwitches(board: Board): { board: Cell[]; cells: Pos[] } {
  const cells: Pos[] = [];
  const next = board.map((cell, i) => {
    if (cell.kind !== 'switch') return cell;
    cells.push({ r: Math.floor(i / BOARD_SIZE), c: i % BOARD_SIZE });
    return { kind: 'switch' as const, wires: rotateCW(cell.wires) };
  });
  return { board: next, cells };
}

/**
 * Sürükleme önizlemesi için: parça buraya bırakılırsa akım geçecek hücreler
 * (çift lambada iki yolun birleşimi, pilden başlayarak). Geçersiz konumda veya devre yoksa null.
 */
export function previewCircuit(
  state: GameState,
  trayIndex: number,
  row: number,
  col: number,
): Pos[] | null {
  const piece = state.tray[trayIndex];
  if (!piece || !canPlace(state.board, piece, row, col)) return null;
  const paths = findCircuits(place(state.board, piece, row, col));
  if (!paths.length) return null;
  if (paths.length === 1) return paths[0];
  const seen = new Set<string>();
  return paths.flat().filter((p) => {
    const k = `${p.r},${p.c}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

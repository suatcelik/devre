// İlk açılış öğreticisi (DEVRE_TASKS 3.7.5): 3 adım, yazı en az.
// Her adım elle kurulmuş bir tahta, bir tepsi ve el işaretinin göstereceği hamlelerdir.
// Saf veri; arayüzden bağımsız ve test edilir.

import { emptyBoard, idx } from '../game/board';
import { newGame } from '../game/engine';
import { canPlace } from '../game/placement';
import { Cell, Dir, E, GameState, N, Piece, PieceColor, S, W } from '../game/types';

export interface TutorialMove {
  trayIndex: number;
  r: number;
  c: number;
}

export interface TutorialStep {
  /** Kısa, tek satırlık yönlendirme */
  caption: string;
  board: Cell[];
  tray: (Piece | null)[];
  /** El işaretinin sırayla göstereceği doğru hamleler; sonuncusu devreyi tamamlar. */
  moves: TutorialMove[];
}

type BlockSpec = [r: number, c: number, wires: number, color: PieceColor];

function makeBoard(battery: [number, number, Dir], lamp: [number, number, Dir], blocks: BlockSpec[]): Cell[] {
  const b = emptyBoard();
  b[idx(battery[0], battery[1])] = { kind: 'battery', wires: battery[2] };
  b[idx(lamp[0], lamp[1])] = { kind: 'lamp', wires: lamp[2] };
  for (const [r, c, wires, color] of blocks) b[idx(r, c)] = { kind: 'block', wires, color };
  return b;
}

const piece = (id: number, shapeId: string, color: PieceColor, cells: [number, number, number][]): Piece => ({
  id,
  shapeId,
  color,
  cells: cells.map(([r, c, wires]) => ({ r, c, wires })),
});

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  // 1) Tek boşluk: parçayı sürükle, devre tamamlansın.
  {
    caption: 'Boşluğa sürükle!',
    board: makeBoard([3, 0, E], [3, 7, W], [
      [3, 1, E | W, 'green'],
      [3, 2, E | W, 'blue'],
      [3, 3, E | W, 'pink'],
      [3, 5, E | W, 'purple'],
      [3, 6, E | W, 'orange'],
    ]),
    tray: [null, piece(901, 'dot', 'yellow', [[0, 0, E | W]]), null],
    moves: [{ trayIndex: 1, r: 3, c: 4 }],
  },
  // 2) Köşe: kablolar birleşmeli; yanıltıcı parça da var.
  {
    caption: 'Kablolar birleşmeli',
    board: makeBoard([5, 0, E], [0, 4, S], [
      [5, 1, W | E, 'green'],
      [5, 2, W | E, 'green'],
      [5, 3, W | N, 'blue'],
      [4, 3, S | N, 'blue'],
      [3, 3, S | N, 'purple'],
      [1, 4, S | N, 'orange'],
    ]),
    tray: [
      piece(911, 'i2h', 'pink', [[0, 0, E | W], [0, 1, E | W]]),
      null,
      piece(912, 'i2h', 'pink', [[0, 0, S | E], [0, 1, W | N]]),
    ],
    moves: [{ trayIndex: 2, r: 2, c: 3 }],
  },
  // 3) Uzun yol, iki parça: uzun devre büyük puan getirir.
  {
    caption: 'Uzun devre = büyük puan',
    board: makeBoard([6, 0, E], [6, 7, W], [
      [6, 1, W | E, 'green'],
      [6, 2, W | N, 'green'],
      [5, 2, S | N, 'blue'],
      [4, 2, S | E, 'blue'],
      [4, 5, W | S, 'purple'],
      [6, 6, W | E, 'orange'],
    ]),
    tray: [
      piece(921, 'i2h', 'pink', [[0, 0, W | E], [0, 1, W | E]]),
      piece(922, 'dot', 'yellow', [[0, 0, N | E]]),
      piece(923, 'i2v', 'pink', [[0, 0, N | S], [1, 0, N | E]]),
    ],
    moves: [
      { trayIndex: 0, r: 4, c: 3 },
      { trayIndex: 2, r: 5, c: 5 },
    ],
  },
];

/** Öğretici adımının oyun durumu. */
export function tutorialState(step: number): GameState {
  const s = TUTORIAL_STEPS[step];
  return {
    ...newGame(1000 + step),
    board: s.board,
    tray: s.tray,
    nextPieceId: 1000,
  };
}

/** El işaretinin göstereceği sıradaki hamle: parçası hâlâ tepside ve yeri boş olan ilk hamle. */
export function nextHint(step: number, state: GameState): TutorialMove | null {
  for (const m of TUTORIAL_STEPS[step].moves) {
    const p = state.tray[m.trayIndex];
    if (p && canPlace(state.board, p, m.r, m.c)) return m;
  }
  return null;
}

// Paylaşım kartı için tahtanın kısa yazımı (DEVRE_TASKS 4.9): 64 karakter, satır öncelikli.
import type { Board, PieceColor } from '../game/types';

const COLOR_CODE: Record<PieceColor, string> = { pink: 'p', orange: 'o', yellow: 'y', green: 'g', blue: 'b', purple: 'u' };
export const CODE_COLOR: Record<string, PieceColor> = Object.fromEntries(
  Object.entries(COLOR_CODE).map(([k, v]) => [v, k as PieceColor]),
);

/** '.' boş · renk harfi blok · 's' kilitli · 'w' anahtar · 'B' pil · 'L' lamba */
export function encodeBoard(board: Board): string {
  return board
    .map((c) => {
      switch (c.kind) {
        case 'empty':
          return '.';
        case 'block':
          return c.locked ? 's' : COLOR_CODE[c.color];
        case 'switch':
          return 'w';
        case 'battery':
          return 'B';
        case 'lamp':
          return 'L';
      }
    })
    .join('');
}

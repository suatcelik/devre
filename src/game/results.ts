// Oyun sonu yıldızları (DEVRE_TASKS 3.7.4). Sonsuz ve günlük modun bölüm hedefi yoktur;
// yıldızlar oyunun kendi içindeki üç başarıya göre verilir. Macera modu (Faz 4) kendi hedeflerini kullanacak.

import type { GameState } from './types';

/** "Harika!" övgüsünün eşiği ile aynı. */
export const LONG_CIRCUIT_STAR = 9;

export interface StarGoal {
  label: string;
  met: boolean;
}

export function endlessStars(game: GameState, bestBefore: number): StarGoal[] {
  return [
    { label: 'İlk lamba', met: game.circuits >= 1 },
    { label: `${LONG_CIRCUIT_STAR}+ hücrelik devre`, met: game.longestCircuit >= LONG_CIRCUIT_STAR },
    { label: 'Yeni rekor', met: game.score > 0 && game.score > bestBefore },
  ];
}

export const starCount = (goals: readonly StarGoal[]) => goals.filter((g) => g.met).length;

// Macera modu bölümleri ve mahalleler (DEVRE_TASKS 4.2, 4.4).
// Bölümler botla ölçülerek ayarlandı: bkz. __tests__/calibrate.test.ts.
import data from './levels.json';
import type { Chapter, LevelData } from './types';

export const LEVELS: readonly LevelData[] = data as LevelData[];

/** Her mahalle kendi bölümleri tamamlandıkça haritada aydınlanır. */
export const CHAPTERS: readonly Chapter[] = [
  { id: 1, name: 'Fener Sokağı', first: 1, last: 5 },
  { id: 2, name: 'Işık Mahallesi', first: 6, last: 10 },
  { id: 3, name: 'Kıvılcım Çarşısı', first: 11, last: 15 },
  { id: 4, name: 'Yıldız Tepesi', first: 16, last: 20 },
  { id: 5, name: 'Çifte Köprü', first: 21, last: 25 },
  { id: 6, name: 'Ay Bahçesi', first: 26, last: 30 },
  { id: 7, name: 'Saat Kulesi', first: 31, last: 35 },
  { id: 8, name: 'Şimşek Limanı', first: 36, last: 40 },
  { id: 9, name: 'Fenerli Rıhtım', first: 41, last: 45 },
  { id: 10, name: 'Neon Çarşı', first: 46, last: 50 },
  { id: 11, name: 'Bulut Kulesi', first: 51, last: 55 },
  { id: 12, name: 'Değirmen Yolu', first: 56, last: 60 },
  { id: 13, name: 'Kuzey Işıkları', first: 61, last: 65 },
  { id: 14, name: 'Gökkuşağı Köprüsü', first: 66, last: 70 },
  { id: 15, name: 'Kristal Mağara', first: 71, last: 75 },
  { id: 16, name: 'Güneş Meydanı', first: 76, last: 80 },
];

export function getLevel(id: number): LevelData | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function chapterOf(levelId: number): Chapter {
  return CHAPTERS.find((c) => levelId >= c.first && levelId <= c.last) ?? CHAPTERS[CHAPTERS.length - 1];
}

/** Bölüm açık mı: ilk bölüm her zaman, diğerleri bir önceki en az 1 yıldızla geçildiyse (4.5). */
export function isUnlocked(levelId: number, stars: Record<number, number>): boolean {
  return levelId === 1 || (stars[levelId - 1] ?? 0) > 0;
}

/** Oynanacak sıradaki bölüm: açık olup henüz geçilmemiş ilk bölüm; hepsi geçildiyse sonuncusu. */
export function nextLevel(stars: Record<number, number>): number {
  const open = LEVELS.find((l) => isUnlocked(l.id, stars) && !(stars[l.id] > 0));
  return open ? open.id : LEVELS[LEVELS.length - 1].id;
}

export function totalStars(stars: Record<number, number>): number {
  return Object.values(stars).reduce((a, b) => a + b, 0);
}

export { goalLabel, goalProgress, goalText, levelOutcome, levelState, movesLeft, pickLevelSeed, starsFor } from './run';
export type { Outcome } from './run';
export type { Chapter, Goal, LevelData } from './types';

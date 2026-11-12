import { newGame } from '../engine';
import { endlessStars, starCount } from '../results';

const base = newGame(1);

describe('oyun sonu yıldızları', () => {
  it('hiç lamba yakılmadıysa yıldız yok', () => {
    expect(starCount(endlessStars({ ...base, score: 0 }, 0))).toBe(0);
  });

  it('ilk lamba bir yıldız, 9+ hücrelik devre ikinci yıldız', () => {
    const g = { ...base, circuits: 2, longestCircuit: 8, score: 500 };
    expect(endlessStars(g, 1000).map((s) => s.met)).toEqual([true, false, false]);
    expect(endlessStars({ ...g, longestCircuit: 9 }, 1000).map((s) => s.met)).toEqual([true, true, false]);
  });

  it('rekor, oyundan önceki en iyi puanı geçmeyi ister; eşitlik yetmez', () => {
    const g = { ...base, circuits: 3, longestCircuit: 12, score: 1000 };
    expect(starCount(endlessStars(g, 999))).toBe(3);
    expect(starCount(endlessStars(g, 1000))).toBe(2);
  });

  it('satır temizleyerek puan alıp devre kurmayan oyuncu rekor yıldızını yine alabilir', () => {
    const g = { ...base, circuits: 0, longestCircuit: 0, score: 80 };
    expect(endlessStars(g, 0).map((s) => s.met)).toEqual([false, false, true]);
  });
});

// Tohumlu rastgele sayı üreteci (mulberry32).
// Durum tek bir 32 bit sayıdır; GameState içinde saklanır, böylece oyun
// tamamen saf ve tekrar oynatılabilir kalır (günlük tahta ve sunucu doğrulaması için).

export interface Rng {
  /** [0, 1) aralığında sayı. */
  next(): number;
  /** [0, n) aralığında tam sayı. */
  int(n: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** Ağırlıklara göre bir index seçer. */
  weighted(weights: readonly number[]): number;
  readonly state: number;
}

export function createRng(state: number): Rng {
  let s = state >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number) => Math.floor(next() * n);
  return {
    next,
    int,
    pick: (items) => items[int(items.length)],
    shuffle: (items) => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    weighted: (weights) => {
      const total = weights.reduce((a, b) => a + b, 0);
      let roll = next() * total;
      for (let i = 0; i < weights.length; i++) {
        roll -= weights[i];
        if (roll < 0) return i;
      }
      return weights.length - 1;
    },
    get state() {
      return s;
    },
  };
}

/** Metinden (ör. "2026-11-11") tohum üretir. Günün Tahtası bunu kullanır. */
export function seedFromString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

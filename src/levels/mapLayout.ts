// Macera haritası yerleşimi (DEVRE_TASKS 4.2): yukarı doğru kıvrılan yol üzerinde bölüm düğümleri.
// Saf hesap; çizimden bağımsız ve test edilir. 1. bölüm en altta.

import type { Chapter } from './types';

/** Tasarımdaki yol noktalarının yatay konumu (358 px genişlikte 70, 180, 285, 200, 90, 160, 275) */
const ZIGZAG = [70, 180, 285, 200, 90, 160, 275].map((x) => x / 358);

export const MAP = {
  /** Ardışık bölümler arası dikey mesafe */
  spacing: 104,
  /** 1. bölümün altında kalan boşluk (mahalle tabelası ve şehir için) */
  bottom: 120,
  /** Son bölümün üstündeki "yakında" alanı */
  top: 190,
  /** Mahalleler arası ek boşluk (tabela için) */
  chapterGap: 70,
} as const;

export interface MapNode {
  id: number;
  x: number;
  y: number;
}

export interface ChapterBand {
  chapter: Chapter;
  /** Bandın üst ve alt sınırı (içerik koordinatı) */
  top: number;
  bottom: number;
}

export interface MapLayout {
  width: number;
  height: number;
  nodes: MapNode[];
  bands: ChapterBand[];
}

export function mapLayout(width: number, chapters: readonly Chapter[]): MapLayout {
  const ids = chapters.flatMap((c) => Array.from({ length: c.last - c.first + 1 }, (_, i) => c.first + i));
  const gaps = (id: number) => chapters.filter((c) => c.first <= id && c.first !== 1).length;
  const lastId = ids[ids.length - 1] ?? 0;
  const height = MAP.bottom + (lastId - 1) * MAP.spacing + gaps(lastId) * MAP.chapterGap + MAP.top;
  const yOf = (id: number) => height - MAP.bottom - (id - 1) * MAP.spacing - gaps(id) * MAP.chapterGap;

  const nodes = ids.map((id) => ({ id, x: ZIGZAG[(id - 1) % ZIGZAG.length] * width, y: yOf(id) }));
  const bands = chapters.map((chapter, i) => ({
    chapter,
    bottom: i === 0 ? height : yOf(chapter.first) + MAP.spacing / 2 + MAP.chapterGap,
    top: yOf(chapter.last) - MAP.spacing / 2,
  }));
  return { width, height, nodes, bands };
}

/**
 * Harita tuvalinin dilim boyu (nokta). Android'de tek bir tuval doku sınırını (~8.192–16.384 piksel) aşınca
 * uygulama çöker; 4x yoğunlukta bile 1.200 nokta = 4.800 piksel, en eski cihazların sınırının altında.
 */
export const MAP_TILE = 1200;

/** İçerik yüksekliğini art arda, boşluksuz dilimlere böler. */
export function mapTiles(height: number, tile = MAP_TILE): { top: number; height: number }[] {
  const out: { top: number; height: number }[] = [];
  for (let top = 0; top < height; top += tile) out.push({ top, height: Math.min(tile, height - top) });
  return out;
}

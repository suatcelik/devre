import { CHAPTERS, LEVELS } from '../index';
import { MAP, mapLayout, mapTiles } from '../mapLayout';

describe('harita yerleşimi', () => {
  const m = mapLayout(358, CHAPTERS);

  it('her bölüm için bir düğüm; 1. bölüm en altta, numara arttıkça yukarı', () => {
    expect(m.nodes.map((n) => n.id)).toEqual(LEVELS.map((l) => l.id));
    for (let i = 1; i < m.nodes.length; i++) expect(m.nodes[i].y).toBeLessThan(m.nodes[i - 1].y);
    expect(m.nodes[0].y).toBe(m.height - MAP.bottom);
  });

  it('düğümler içerikte ve yatayda kenardan taşmıyor', () => {
    for (const n of m.nodes) {
      expect(n.y).toBeGreaterThan(MAP.top / 2);
      expect(n.y).toBeLessThan(m.height);
      expect(n.x).toBeGreaterThanOrEqual(40);
      expect(n.x).toBeLessThanOrEqual(358 - 40);
    }
  });

  it('tasarımdaki zikzak: ilk yedi düğüm 70, 180, 285, 200, 90, 160, 275', () => {
    expect(m.nodes.slice(0, 7).map((n) => Math.round(n.x))).toEqual([70, 180, 285, 200, 90, 160, 275]);
  });

  it('mahalle bantları kendi bölümlerini kapsar, mahalle geçişinde ek boşluk var', () => {
    for (const band of m.bands) {
      for (const n of m.nodes.filter((x) => x.id >= band.chapter.first && x.id <= band.chapter.last)) {
        expect(n.y).toBeGreaterThan(band.top);
        expect(n.y).toBeLessThan(band.bottom);
      }
    }
    const [a, b] = [m.nodes[4], m.nodes[5]]; // 5 → 6 mahalle değişiyor
    expect(a.y - b.y).toBe(MAP.spacing + MAP.chapterGap);
  });
});

describe('harita dilimleri', () => {
  it('dilimler içeriği boşluksuz kaplar ve hiçbiri sınırı aşmaz', () => {
    const layout = mapLayout(358, CHAPTERS);
    const tiles = mapTiles(layout.height);
    expect(tiles[0].top).toBe(0);
    for (let i = 1; i < tiles.length; i++) expect(tiles[i].top).toBe(tiles[i - 1].top + tiles[i - 1].height);
    const last = tiles[tiles.length - 1];
    expect(last.top + last.height).toBe(layout.height);
    for (const tile of tiles) expect(tile.height * 4).toBeLessThanOrEqual(8192);
  });
});

import { createRng } from '../../game/rng';
import { boardLayout, cellOrigin, cellUnderPiece, dragTopLeft } from '../layout';

describe('sürükle-bırak geometrisi', () => {
  const layout = boardLayout(390);
  const origin = { x: 16, y: 260 };
  const lift = 60;

  it('gölge, sürüklenen parçanın çizildiği yere en fazla yarım hücre uzakta (her iki eksende)', () => {
    const rng = createRng(3);
    for (let k = 0; k < 2000; k++) {
      const finger = { x: rng.next() * 390, y: 200 + rng.next() * 500 };
      const w = layout.cell * (1 + rng.int(4)) + layout.gap * rng.int(4);
      const h = layout.cell * (1 + rng.int(4)) + layout.gap * rng.int(4);
      const drawn = dragTopLeft(finger, w, h, lift);
      const { r, c } = cellUnderPiece(drawn, origin, layout.inset, layout.pitch);
      const ghost = cellOrigin(layout, r, c);
      expect(Math.abs(origin.x + ghost.x - drawn.x)).toBeLessThanOrEqual(layout.pitch / 2 + 1e-9);
      expect(Math.abs(origin.y + ghost.y - drawn.y)).toBeLessThanOrEqual(layout.pitch / 2 + 1e-9);
    }
  });

  it('parça tam bir hücrenin üstündeyken o hücreye düşer, bir alt satıra değil', () => {
    const target = cellOrigin(layout, 3, 2);
    const drawn = { x: origin.x + target.x, y: origin.y + target.y };
    expect(cellUnderPiece(drawn, origin, layout.inset, layout.pitch)).toEqual({ r: 3, c: 2 });
    // Yarım hücreden az aşağı kayma aynı hücrede kalır
    const nudged = { x: drawn.x, y: drawn.y + layout.pitch * 0.45 };
    expect(cellUnderPiece(nudged, origin, layout.inset, layout.pitch)).toEqual({ r: 3, c: 2 });
  });

  it('parça parmağın lift kadar üstünde ve yatayda ortalı çizilir', () => {
    expect(dragTopLeft({ x: 200, y: 600 }, 80, 40, 60)).toEqual({ x: 160, y: 500 });
  });
});

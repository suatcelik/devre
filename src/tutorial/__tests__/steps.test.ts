import { bitCount, opposite, step as stepPos } from '../../game/board';
import { findCircuit } from '../../game/circuit';
import { applyMove } from '../../game/engine';
import { praiseFor } from '../../game/praise';
import { DIRS } from '../../game/types';
import { TUTORIAL_STEPS, nextHint, tutorialState } from '../steps';

describe('öğretici adımları', () => {
  TUTORIAL_STEPS.forEach((step, i) => {
    describe(`adım ${i + 1}: ${step.caption}`, () => {
      it('başlangıçta devre yok', () => {
        expect(findCircuit(tutorialState(i).board)).toBeNull();
      });

      it('gösterilen hamleler sırayla devreyi tamamlar, sonuncusu tamamlar', () => {
        let s = tutorialState(i);
        step.moves.forEach((m, k) => {
          expect(nextHint(i, s)).toEqual(m);
          const res = applyMove(s, m.trayIndex, m.r, m.c);
          expect(res).not.toBeNull();
          const circuit = res!.events.some((e) => e.type === 'CIRCUIT_COMPLETE');
          expect(circuit).toBe(k === step.moves.length - 1);
          s = res!.state;
        });
      });

      it('parçalarda çıkmaz uç yok ve iç bağlantılar karşılıklı', () => {
        for (const p of step.tray) {
          if (!p) continue;
          const at = new Map(p.cells.map((c) => [`${c.r},${c.c}`, c]));
          for (const cell of p.cells) {
            expect(bitCount(cell.wires)).not.toBe(1);
            for (const d of DIRS) {
              const n = stepPos(cell.r, cell.c, d);
              const other = at.get(`${n.r},${n.c}`);
              if (other) expect(Boolean(cell.wires & d)).toBe(Boolean(other.wires & opposite(d)));
            }
          }
        }
      });
    });
  });

  it('yanıltıcı parça (adım 2) devreyi tamamlamaz', () => {
    const res = applyMove(tutorialState(1), 0, 2, 3)!;
    expect(res.events.some((e) => e.type === 'CIRCUIT_COMPLETE')).toBe(false);
  });

  it('devreler giderek uzar ve övgü kazandırır', () => {
    const lengths = TUTORIAL_STEPS.map((step, i) => {
      let s = tutorialState(i);
      let length = 0;
      for (const m of step.moves) {
        const res = applyMove(s, m.trayIndex, m.r, m.c)!;
        for (const e of res.events) if (e.type === 'CIRCUIT_COMPLETE') length = e.length;
        s = res.state;
      }
      return length;
    });
    expect(lengths).toEqual([6, 8, 10]);
    expect(lengths.map((l) => praiseFor(l, 1))).toEqual(['Güzel!', 'Güzel!', 'Harika!']);
  });
});

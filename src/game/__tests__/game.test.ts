import { bitCount, cellAt, emptyBoard, idx, inwardDir, opposite, step } from '../board';
import { findCircuit } from '../circuit';
import { MIN_TERMINAL_DISTANCE, generateTray, placeTerminals } from '../generator';
import { applyMove, circuitScore, newGame, previewCircuit, resolve } from '../engine';
import { SHAPES, makePiece } from '../pieces';
import { canPlace, isGameOver, place, validPlacements } from '../placement';
import { praiseFor } from '../praise';
import { createRng, seedFromString } from '../rng';
import { DIRS, GameState } from '../types';
import { E, N, S, W, boardWithTerminals, piece, setBlock } from './helpers';

describe('rng', () => {
  it('aynı tohum aynı diziyi üretir', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('durumdan devam etmek aynı sonucu verir', () => {
    const a = createRng(7);
    a.next();
    a.next();
    const resumed = createRng(a.state);
    expect(resumed.next()).toBe(a.next());
  });

  it('metinden kararlı tohum üretir', () => {
    expect(seedFromString('2026-11-11')).toBe(seedFromString('2026-11-11'));
    expect(seedFromString('2026-11-11')).not.toBe(seedFromString('2026-11-12'));
  });
});

describe('board yardımcıları', () => {
  it('opposite her yön için doğru', () => {
    expect(opposite(N)).toBe(S);
    expect(opposite(S)).toBe(N);
    expect(opposite(E)).toBe(W);
    expect(opposite(W)).toBe(E);
  });

  it('kenar hücreleri içeri bakar, köşeler ve iç hücreler null', () => {
    expect(inwardDir(3, 0)).toBe(E);
    expect(inwardDir(3, 7)).toBe(W);
    expect(inwardDir(0, 4)).toBe(S);
    expect(inwardDir(7, 4)).toBe(N);
    expect(inwardDir(0, 0)).toBeNull();
    expect(inwardDir(3, 3)).toBeNull();
  });
});

describe('yerleştirme', () => {
  const domino = piece([
    { r: 0, c: 0, wires: E | W },
    { r: 0, c: 1, wires: E | W },
  ]);

  it('boş yere sığar, taşan veya çakışan yere sığmaz', () => {
    const b = boardWithTerminals();
    expect(canPlace(b, domino, 0, 0)).toBe(true);
    expect(canPlace(b, domino, 0, 7)).toBe(false);
    expect(canPlace(b, domino, -1, 0)).toBe(false);
    expect(canPlace(b, domino, 3, 0)).toBe(false); // pilin üstü
    setBlock(b, 5, 5, 0);
    expect(canPlace(b, domino, 5, 4)).toBe(false);
  });

  it('place hücreleri kablolarıyla doldurur ve orijinali değiştirmez', () => {
    const b = boardWithTerminals();
    const next = place(b, domino, 1, 2);
    expect(cellAt(next, 1, 2)).toEqual({ kind: 'block', wires: E | W, color: 'pink' });
    expect(cellAt(next, 1, 3).kind).toBe('block');
    expect(cellAt(b, 1, 2).kind).toBe('empty');
  });

  it('validPlacements tüm geçerli köşeleri listeler', () => {
    const b = emptyBoard();
    expect(validPlacements(b, domino)).toHaveLength(8 * 7);
  });
});

describe('devre bağlantısı', () => {
  it('düz kablolarla pilden lambaya yol bulur', () => {
    const b = boardWithTerminals();
    for (let c = 1; c <= 6; c++) setBlock(b, 3, c, E | W);
    const path = findCircuit(b);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(8);
    expect(path![0]).toEqual({ r: 3, c: 0 });
    expect(path![7]).toEqual({ r: 3, c: 7 });
  });

  it('köşe kablolarıyla dönebilir', () => {
    // Pil (3,0)→E, lamba (0,3)→S. Yol: (3,1) W|N, (2,1) S|N, (1,1) S|E, (1,2) W|E, (1,3) W|N
    const b = boardWithTerminals({ r: 3, c: 0, d: E }, { r: 0, c: 3, d: S });
    setBlock(b, 3, 1, W | N);
    setBlock(b, 2, 1, S | N);
    setBlock(b, 1, 1, S | E);
    setBlock(b, 1, 2, W | E);
    setBlock(b, 1, 3, W | N);
    expect(findCircuit(b)).toHaveLength(7);
  });

  it('T ve artı kablolar akımı geçirir', () => {
    const b = boardWithTerminals();
    setBlock(b, 3, 1, E | W | N); // T
    setBlock(b, 3, 2, N | E | S | W); // artı
    for (let c = 3; c <= 6; c++) setBlock(b, 3, c, E | W);
    expect(findCircuit(b)).toHaveLength(8);
  });

  it('boş kablolu hücre yolu keser', () => {
    const b = boardWithTerminals();
    for (let c = 1; c <= 6; c++) setBlock(b, 3, c, E | W);
    setBlock(b, 3, 4, 0);
    expect(findCircuit(b)).toBeNull();
  });

  it('tek taraflı uç bağlantı sayılmaz', () => {
    const b = boardWithTerminals();
    for (let c = 1; c <= 6; c++) setBlock(b, 3, c, E | W);
    setBlock(b, 3, 4, E | N); // batıya ucu yok
    expect(findCircuit(b)).toBeNull();
  });

  it('pilin ucu bloğa bakmıyorsa bağlanmaz', () => {
    const b = boardWithTerminals({ r: 3, c: 0, d: N });
    for (let c = 1; c <= 6; c++) setBlock(b, 3, c, E | W);
    expect(findCircuit(b)).toBeNull();
  });

  it('en kısa yolu seçer', () => {
    const b = boardWithTerminals();
    for (let c = 1; c <= 6; c++) setBlock(b, 3, c, N | E | S | W);
    for (let c = 1; c <= 6; c++) setBlock(b, 2, c, N | E | S | W);
    expect(findCircuit(b)).toHaveLength(8);
  });
});

describe('çözümleme ve puan', () => {
  const straightRow = () => {
    const b = boardWithTerminals();
    for (let c = 1; c <= 6; c++) setBlock(b, 3, c, E | W);
    setBlock(b, 0, 0, 0); // yoldan bağımsız blok
    return b;
  };

  it('devre puanı uzunluk² × 10 × kombo', () => {
    expect(circuitScore(6, 1)).toBe(360);
    expect(circuitScore(9, 1)).toBe(810);
    expect(circuitScore(6, 2)).toBe(720);
  });

  it('devreyi temizler, puanlar, pil ve lambayı taşır', () => {
    const res = resolve(straightRow(), 0, 100, 1);
    expect(res.scoreGained).toBe(360);
    expect(res.combo).toBe(1);
    expect(res.circuitLength).toBe(6);
    for (let c = 1; c <= 6; c++) expect(cellAt(res.board, 3, c).kind).not.toBe('block');
    expect(cellAt(res.board, 0, 0).kind).toBe('block');
    const types = res.events.map((e) => e.type);
    expect(types).toEqual(['CIRCUIT_COMPLETE', 'SCORE', 'TERMINALS_MOVED']);
    expect(res.board.filter((c) => c.kind === 'battery')).toHaveLength(1);
    expect(res.board.filter((c) => c.kind === 'lamp')).toHaveLength(1);
    expect(findCircuit(res.board)).toBeNull();
  });

  it('art arda devrede kombo artar, devresiz hamlede sıfırlanır', () => {
    expect(resolve(straightRow(), 2, 0, 1).combo).toBe(3);
    expect(resolve(straightRow(), 2, 0, 1).scoreGained).toBe(360 * 3);
    expect(resolve(boardWithTerminals(), 2, 0, 1).combo).toBe(0);
  });

  it('dolu satırı ve sütunu temizler (hücre başı 10)', () => {
    const b = boardWithTerminals();
    for (let c = 0; c < 8; c++) setBlock(b, 0, c, 0);
    for (let r = 1; r < 8; r++) setBlock(b, r, 5, 0);
    const res = resolve(b, 0, 0, 1);
    expect(res.scoreGained).toBe(15 * 10);
    expect(res.events[0]).toMatchObject({ type: 'LINE_CLEAR', rows: [0], cols: [5] });
    expect(res.board.filter((c) => c.kind === 'block')).toHaveLength(0);
  });

  it('pil ve lamba satırı doldurur ama temizlenmez', () => {
    const b = boardWithTerminals();
    for (let c = 1; c <= 6; c++) setBlock(b, 3, c, 0);
    const res = resolve(b, 0, 0, 1);
    expect(res.scoreGained).toBe(60);
    expect(cellAt(res.board, 3, 0).kind).toBe('battery');
    expect(cellAt(res.board, 3, 7).kind).toBe('lamp');
  });
});

describe('oyun sonu', () => {
  it('hiçbir parça sığmıyorsa biter', () => {
    const b = boardWithTerminals();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (b[idx(r, c)].kind === 'empty' && !(r === 7 && c === 7)) setBlock(b, r, c, 0);
    }
    const domino = piece([{ r: 0, c: 0, wires: 0 }, { r: 0, c: 1, wires: 0 }]);
    const dot = piece([{ r: 0, c: 0, wires: 0 }]);
    expect(isGameOver(b, [domino, null, null])).toBe(true);
    expect(isGameOver(b, [domino, dot, null])).toBe(false);
    expect(isGameOver(b, [null, null, null])).toBe(false);
  });
});

describe('parça üretimi', () => {
  it('çıkmaz uç yok, iç bağlantılar karşılıklı', () => {
    const rng = createRng(123);
    for (let i = 0; i < 2000; i++) {
      const shape = SHAPES[i % SHAPES.length];
      const p = makePiece(shape, i, rng);
      expect(p.cells).toHaveLength(shape.cells.length);
      const at = new Map(p.cells.map((c) => [`${c.r},${c.c}`, c]));
      for (const cell of p.cells) {
        expect(bitCount(cell.wires)).not.toBe(1);
        for (const d of DIRS) {
          const n = step(cell.r, cell.c, d);
          const other = at.get(`${n.r},${n.c}`);
          if (!other) continue;
          expect(Boolean(cell.wires & d)).toBe(Boolean(other.wires & opposite(d)));
        }
      }
    }
  });

  it('pil ve lamba kenarda, içeri bakar, yeterince uzak', () => {
    for (let seed = 0; seed < 200; seed++) {
      const { board, battery, lamp } = placeTerminals(emptyBoard(), createRng(seed));
      expect(cellAt(board, battery.r, battery.c)).toEqual({ kind: 'battery', wires: inwardDir(battery.r, battery.c) });
      expect(cellAt(board, lamp.r, lamp.c)).toEqual({ kind: 'lamp', wires: inwardDir(lamp.r, lamp.c) });
      expect(Math.abs(battery.r - lamp.r) + Math.abs(battery.c - lamp.c)).toBeGreaterThanOrEqual(MIN_TERMINAL_DISTANCE);
    }
  });

  it('neredeyse dolu tahtada bile tepside sığan bir parça olur', () => {
    const b = boardWithTerminals();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (b[idx(r, c)].kind === 'empty' && !(r === 5 && c === 5)) setBlock(b, r, c, 0);
    }
    for (let seed = 0; seed < 50; seed++) {
      const { tray } = generateTray(b, createRng(seed), 1);
      expect(tray).toHaveLength(3);
      expect(isGameOver(b, tray)).toBe(false);
    }
  });
});

/** Tohumlu "oyuncu": her hamlede ilk geçerli yerleştirmeyi rastgele seçer. */
function autoplay(seed: number, playerSeed: number, maxMoves = 300): GameState[] {
  let state = newGame(seed);
  const player = createRng(playerSeed);
  const history = [state];
  for (let m = 0; m < maxMoves && !state.over; m++) {
    const options: [number, number, number][] = [];
    state.tray.forEach((p, i) => {
      if (p) for (const pos of validPlacements(state.board, p)) options.push([i, pos.r, pos.c]);
    });
    const [i, r, c] = player.pick(options);
    const res = applyMove(state, i, r, c);
    expect(res).not.toBeNull();
    state = res!.state;
    history.push(state);
  }
  return history;
}

describe('tam oyun', () => {
  it('aynı tohumla iki oyun birebir aynı ilerler', () => {
    expect(autoplay(2026, 5)).toEqual(autoplay(2026, 5));
  });

  it('farklı tohum farklı tepsi verir', () => {
    expect(newGame(1).tray).not.toEqual(newGame(2).tray);
  });

  it('rastgele oyunlar tutarlı kalır ve sonunda biter', () => {
    for (let seed = 0; seed < 20; seed++) {
      const history = autoplay(seed, seed + 100, 1000);
      const last = history[history.length - 1];
      expect(last.over).toBe(true);
      for (const s of history) {
        expect(s.board.filter((c) => c.kind === 'battery')).toHaveLength(1);
        expect(s.board.filter((c) => c.kind === 'lamp')).toHaveLength(1);
        expect(s.score).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('geçersiz hamle null döner', () => {
    const s = newGame(9);
    expect(applyMove(s, 0, 99, 99)).toBeNull();
    const placed = applyMove(s, 0, ...firstPlacement(s, 0))!;
    expect(applyMove(placed.state, 0, 0, 0)).toBeNull(); // yuva boş
  });

  it('üç parça yerleşince tepsi yenilenir', () => {
    let s = newGame(11);
    const types: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = applyMove(s, i, ...firstPlacement(s, i))!;
      types.push(...res.events.map((e) => e.type));
      s = res.state;
    }
    expect(types).toContain('TRAY_REFILL');
    expect(s.tray.every((p) => p !== null)).toBe(true);
  });

  it('önizleme, bırakınca oluşacak devreyi gösterir', () => {
    const s = newGame(3);
    const board = boardWithTerminals();
    for (let c = 1; c <= 5; c++) setBlock(board, 3, c, E | W);
    const state: GameState = {
      ...s,
      board,
      tray: [piece([{ r: 0, c: 0, wires: E | W }]), null, null],
    };
    expect(previewCircuit(state, 0, 3, 6)).toHaveLength(8);
    expect(previewCircuit(state, 0, 2, 6)).toBeNull();
  });
});

function firstPlacement(s: GameState, i: number): [number, number] {
  const pos = validPlacements(s.board, s.tray[i]!)[0];
  return [pos.r, pos.c];
}

describe('övgü', () => {
  it('eşiklere göre yazı seçer', () => {
    expect(praiseFor(5, 1)).toBeNull();
    expect(praiseFor(6, 1)).toBe('Güzel!');
    expect(praiseFor(9, 1)).toBe('Harika!');
    expect(praiseFor(12, 1)).toBe('Süper Devre!');
    expect(praiseFor(4, 3)).toBe('Durdurulamaz!');
  });
});

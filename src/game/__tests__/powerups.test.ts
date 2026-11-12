import { cellAt, idx } from '../board';
import { applyMove, newGame } from '../engine';
import { fitsAnywhere } from '../placement';
import {
  EMPTY_INVENTORY,
  MAX_OWNED,
  POWERUP_CAP,
  PRICES,
  addPowerups,
  applyLightning,
  applyRotate,
  buyPowerup,
  canHammer,
  canRotate,
  earnedFromMove,
  applyHammer,
  applyShuffle,
  levelCoins,
} from '../powerups';
import { GameEvent, GameState } from '../types';
import { E, N, S, W, boardWithTerminals, piece, setBlock } from './helpers';

describe('güçlendiriciler', () => {
  const base = (): GameState => {
    const board = boardWithTerminals();
    setBlock(board, 5, 5, E | W);
    board[idx(6, 6)] = { kind: 'block', wires: E | W, color: 'blue', locked: true };
    board[idx(6, 2)] = { kind: 'switch', wires: E | W };
    return { ...newGame(4), board };
  };

  it('çekiç sıradan bloğu kırar; kilitli blok, anahtar, pil, lamba ve boş hücre kırılmaz', () => {
    const s = base();
    expect(canHammer(s, 5, 5)).toBe(true);
    for (const [r, c] of [[6, 6], [6, 2], [3, 0], [3, 7], [0, 0]]) expect(canHammer(s, r, c)).toBe(false);
    const res = applyHammer(s, 5, 5)!;
    expect(cellAt(res.state.board, 5, 5).kind).toBe('empty');
    expect(res.events).toEqual([{ type: 'BLOCK_BROKEN', pos: { r: 5, c: 5 } }]);
    expect(res.state.moves).toBe(s.moves);
    expect(applyHammer(s, 6, 6)).toBeNull();
  });

  it('çekiç tahtayı açınca oyun sonundan kurtarır', () => {
    const s = base();
    const board = s.board.slice();
    for (let i = 0; i < 64; i++) if (board[i].kind === 'empty') board[i] = { kind: 'block', wires: 0, color: 'pink' };
    const dot = piece([{ r: 0, c: 0, wires: 0 }]);
    const stuck: GameState = { ...s, board, tray: [dot, null, null], over: true };
    const res = applyHammer(stuck, 0, 0)!;
    expect(res.state.over).toBe(false);
  });

  it('karıştır yeni ve sığan bir tepsi verir, hamle saymaz, tohumlu', () => {
    const s = base();
    const a = applyShuffle(s);
    expect(a.state.tray).not.toEqual(s.tray);
    expect(a.state.tray.some((p) => p && fitsAnywhere(a.state.board, p))).toBe(true);
    expect(a.state.moves).toBe(s.moves);
    expect(applyShuffle(s).state.tray).toEqual(a.state.tray);
    expect(a.events[0].type).toBe('TRAY_REFILL');
  });

  it('Süper Devre ya da Çifte Işık bir çekiç kazandırır', () => {
    const circuit = (length: number, double: boolean): GameEvent => ({
      type: 'CIRCUIT_COMPLETE', path: [], length, combo: 1, double,
    });
    expect(earnedFromMove([circuit(11, false)])).toEqual({});
    expect(earnedFromMove([circuit(12, false)])).toEqual({ hammer: 1 });
    expect(earnedFromMove([circuit(6, true), circuit(7, true)])).toEqual({ hammer: 1 });
  });

  it('envanter üst sınırı aşmaz', () => {
    let inv = EMPTY_INVENTORY;
    for (let i = 0; i < 10; i++) inv = addPowerups(inv, { hammer: 1, shuffle: 1 });
    expect(inv).toEqual({ ...EMPTY_INVENTORY, hammer: POWERUP_CAP, shuffle: POWERUP_CAP });
    // Dükkândan alınmış fazla, kazanımla silinmez
    expect(addPowerups({ ...EMPTY_INVENTORY, hammer: 8 }, { hammer: 1 }).hammer).toBe(8);
  });

  it('normal hamle güçlendirici olayı üretmez', () => {
    const s = newGame(2);
    const p = s.tray.findIndex((x) => x !== null);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const res = applyMove(s, p, r, c);
      if (res) {
        expect(res.events.some((e) => e.type === 'BLOCK_BROKEN')).toBe(false);
        return;
      }
    }
  });

  it('döndür: kablolu blok döner (kilitli dahil); kablosuz, artı, anahtar, pil, lamba dönmez', () => {
    const s = base();
    s.board = s.board.slice();
    const b = s.board as ReturnType<typeof boardWithTerminals>;
    b[idx(1, 1)] = { kind: 'block', wires: 0, color: 'pink' };
    b[idx(1, 2)] = { kind: 'block', wires: N | E | S | W, color: 'pink' };
    expect(canRotate(s, 5, 5)).toBe(true);
    expect(canRotate(s, 6, 6)).toBe(true);
    for (const [r, c] of [[1, 1], [1, 2], [6, 2], [3, 0], [3, 7], [0, 0]]) expect(canRotate(s, r, c)).toBe(false);
    const res = applyRotate(s, 5, 5)!;
    expect(cellAt(res.state.board, 5, 5)).toMatchObject({ kind: 'block', wires: N | S });
    expect(res.events[0]).toEqual({ type: 'BLOCK_ROTATED', pos: { r: 5, c: 5 } });
    expect(res.state.moves).toBe(s.moves);
  });

  it('döndür yolu tamamlarsa devre çözülür: lamba yanar, yol temizlenir, puan gelir', () => {
    const board = boardWithTerminals();
    for (let c = 1; c <= 6; c++) setBlock(board, 3, c, c === 4 ? N | S : E | W);
    const s: GameState = { ...newGame(4), board, score: 0, combo: 0, circuits: 0 };
    const res = applyRotate(s, 3, 4)!;
    expect(res.placed && cellAt(res.placed, 3, 4)).toMatchObject({ wires: E | W });
    expect(res.events.some((e) => e.type === 'CIRCUIT_COMPLETE')).toBe(true);
    expect(res.state.circuits).toBe(1);
    expect(res.state.score).toBeGreaterThan(0);
    expect(cellAt(res.state.board, 3, 4).kind).toBe('empty');
  });

  it('döndür devre kurmazsa kombo bozulmaz', () => {
    const s = { ...base(), combo: 3 };
    expect(applyRotate(s, 5, 5)!.state.combo).toBe(3);
  });

  it('yıldırım bütün blokları kırar (kilitliler dahil); pil, lamba ve anahtar kalır; puan vermez', () => {
    const s = base();
    const res = applyLightning(s)!;
    expect(res.state.board.some((c) => c.kind === 'block')).toBe(false);
    expect(cellAt(res.state.board, 6, 2).kind).toBe('switch');
    expect(cellAt(res.state.board, 3, 0).kind).toBe('battery');
    expect(cellAt(res.state.board, 3, 7).kind).toBe('lamp');
    expect(res.events).toEqual([{ type: 'LIGHTNING', cells: [{ r: 5, c: 5 }, { r: 6, c: 6 }] }]);
    expect(res.state.score).toBe(s.score);
    expect(applyLightning(res.state)).toBeNull();
  });

  it('altın: ilk geçiş yıldıza göre, tekrar oynama az; yeni yıldız ayrıca ödüllenir', () => {
    expect([1, 2, 3].map((st) => levelCoins(0, st))).toEqual([45, 60, 75]);
    expect(levelCoins(3, 3)).toBe(10);
    expect(levelCoins(1, 3)).toBe(40);
  });

  it('fiyatlar: bölümü geçirebilen joker pahalı, tek hamlelik joker ucuz', () => {
    expect(PRICES.shuffle).toBeLessThan(PRICES.hammer);
    expect(PRICES.hammer).toBeLessThan(PRICES.rotate);
    expect(PRICES.rotate).toBeLessThan(PRICES.lightning);
  });

  it('satın alma altını düşer; yetmezse ya da üst sınırdaysa alınamaz', () => {
    expect(buyPowerup(EMPTY_INVENTORY, PRICES.hammer, 'hammer')).toEqual({
      inventory: { ...EMPTY_INVENTORY, hammer: 1 },
      coins: 0,
    });
    expect(buyPowerup(EMPTY_INVENTORY, PRICES.hammer - 1, 'hammer')).toBeNull();
    expect(buyPowerup({ ...EMPTY_INVENTORY, hammer: MAX_OWNED }, 9999, 'hammer')).toBeNull();
  });
});

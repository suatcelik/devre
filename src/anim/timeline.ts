// Olay kuyruğu oynatıcısının zamanlaması (DEVRE_TASKS 3.5.1).
// Faz 1'in olay listesini, her hücrenin ne zaman ne yapacağını söyleyen saf bir plana çevirir.
// Çizim katmanı bu planı tek bir saat (ms) değeriyle oynatır; bu modül arayüzden bağımsızdır.

import { idx } from '../game/board';
import { praiseFor } from '../game/praise';
import type { Board, GameEvent, PieceColor, Pos } from '../game/types';
import {
  CURRENT_START_MS,
  CURRENT_STEP_MS,
  DROP_SQUASH_MS,
  EXPLODE_DELAY_MS,
  EXPLODE_STAGGER_MS,
  EXPLODE_SWELL_MS,
  LAMP_WAVE_MS,
  LIGHTNING_ROW_MS,
  LONG_CIRCUIT,
  PARTICLE_LIFE_MS,
  ROTATE_SPIN_MS,
  SCORE_FLY_MS,
  SCORE_ROLL_MS,
  SWITCH_TURN_GAP_MS,
  SWITCH_TURN_MS,
  TERMINAL_APPEAR_MS,
  TERMINAL_MOVE_GAP_MS,
  TERMINAL_VANISH_MS,
} from './constants';

export interface CellPlan {
  /** Bırakma ezilme-esnemesinin başladığı an */
  squashAt?: number;
  /** Akımın bu hücreye ulaştığı an */
  litAt?: number;
  /** Şişip patladığı an (şişme bu andan başlar) */
  explodeAt?: number;
  /** Eski pil/lamba söndüğü an */
  vanishAt?: number;
  /** Anahtarın 90° dönmeye başladığı an */
  turnAt?: number;
  /** Döndür jokeri: hücre -90°'den yeni yönüne döner (bu an başlar) */
  spinAt?: number;
}

export interface Burst {
  pos: Pos;
  /** Parçacıkların çıktığı an (şişme bitişi) */
  at: number;
  /** Parça rengi; kilitli blok çelik parçacık saçar */
  color: PieceColor | 'steel';
}

export interface ScorePop {
  amount: number;
  /** Puanın uçmaya başladığı an */
  at: number;
  /** Uçuşun başladığı hücre */
  from: Pos;
}

export interface Timeline {
  /** Oynatma sırasında çizilen tahta: parça yerleşmiş, henüz temizlenmemiş. */
  board: Board;
  /** Oynatma bitince geçilecek tahta. */
  finalBoard: Board;
  /** index → hücre planı */
  cells: Map<number, CellPlan>;
  /** Akım yolu ve her adımın zamanı (pil dahil, lamba dahil). Çift lambada en uzun kol. */
  current: { path: Pos[]; times: number[] } | null;
  /** Son yanan lamba (övgü, parlama ve puan buradan) */
  lamp: { pos: Pos; at: number } | null;
  /** Tüm akım kolları ve yanan lambalar (çift lambada iki) */
  currents: { path: Pos[]; times: number[] }[];
  lamps: { pos: Pos; at: number }[];
  /** Aynı hamlede iki lamba birden yandı (Çifte Işık) */
  double: boolean;
  bursts: Burst[];
  /** Yeni pil/lamba ve belirme anı */
  terminals: { battery: Pos; lamp: Pos; lamps: Pos[]; appearAt: number } | null;
  scorePops: ScorePop[];
  praise: { text: string; at: number } | null;
  /** Uzun devrede ekran sarsıntısı anı */
  shakeAt: number | null;
  /** Satır/sütun patlamasının başladığı an */
  lineAt: number | null;
  /** Bu hamlede tepsi yenilendi mi */
  trayRefill: boolean;
  /** Anahtarların döndüğü an (yoksa null) */
  switchAt: number | null;
  circuitLength: number;
  combo: number;
  /** Bu ana kadar giriş kilitli. Yalnızca yerleşen hamlede 0. */
  lockUntil: number;
  /** Tüm görsel olayların bittiği an */
  duration: number;
}

const plan = (cells: Map<number, CellPlan>, p: Pos) => {
  const k = idx(p.r, p.c);
  let entry = cells.get(k);
  if (!entry) {
    entry = {};
    cells.set(k, entry);
  }
  return entry;
};

/**
 * @param placedBoard parça yerleştikten sonraki, çözümlemeden önceki tahta
 * @param finalBoard hamlenin sonundaki tahta
 * @param events applyMove'un döndürdüğü olaylar
 */
export function buildTimeline(placedBoard: Board, finalBoard: Board, events: readonly GameEvent[]): Timeline {
  const cells = new Map<number, CellPlan>();
  const bursts: Burst[] = [];
  const scorePops: ScorePop[] = [];
  let current: Timeline['current'] = null;
  let lamp: Timeline['lamp'] = null;
  const currents: Timeline['currents'] = [];
  const lamps: Timeline['lamps'] = [];
  let double = false;
  let circuitsDone = false;
  let terminals: Timeline['terminals'] = null;
  let praise: Timeline['praise'] = null;
  let shakeAt: number | null = null;
  let lineAt: number | null = null;
  let trayRefill = false;
  let switchAt: number | null = null;
  let circuitLength = 0;
  let combo = 0;

  /** Sıradaki patlama dalgasının başlayabileceği an */
  let cursor = DROP_SQUASH_MS;
  let end = DROP_SQUASH_MS;

  const explode = (positions: Pos[], start: number) => {
    let last = start;
    positions.forEach((p, i) => {
      const cell = placedBoard[idx(p.r, p.c)];
      if (cell.kind !== 'block') return;
      const at = start + i * EXPLODE_STAGGER_MS;
      plan(cells, p).explodeAt = at;
      bursts.push({ pos: p, at: at + EXPLODE_SWELL_MS, color: cell.locked ? 'steel' : cell.color });
      last = at;
    });
    const done = last + EXPLODE_SWELL_MS;
    end = Math.max(end, done + PARTICLE_LIFE_MS);
    return done;
  };

  for (const e of events) {
    switch (e.type) {
      case 'PLACED':
        for (const p of e.cells) plan(cells, p).squashAt = 0;
        break;

      case 'CIRCUIT_COMPLETE': {
        // Aynı hamlenin tüm devreleri birlikte oynatılır: akım pilden kollara ayrılarak ilerler.
        if (circuitsDone) break;
        circuitsDone = true;
        const all = events.filter((x): x is Extract<GameEvent, { type: 'CIRCUIT_COMPLETE' }> => x.type === 'CIRCUIT_COMPLETE');
        double = all.some((x) => x.double);
        combo = e.combo;
        for (const c of all) {
          const times = c.path.map((_, i) => CURRENT_START_MS + i * CURRENT_STEP_MS);
          c.path.forEach((p, i) => {
            const cp = plan(cells, p);
            cp.litAt = cp.litAt === undefined ? times[i] : Math.min(cp.litAt, times[i]);
          });
          currents.push({ path: c.path, times });
          lamps.push({ pos: c.path[c.path.length - 1], at: times[times.length - 1] });
        }
        const longest = all.reduce((a, b) => (b.path.length > a.path.length ? b : a));
        circuitLength = longest.length;
        current = currents[all.indexOf(longest)];
        lamp = lamps[all.indexOf(longest)];
        const lampAt = lamp.at;
        end = Math.max(end, lampAt + LAMP_WAVE_MS);
        if (longest.length >= LONG_CIRCUIT || double) shakeAt = lampAt;
        const text = praiseFor(longest.length, e.combo, double);
        if (text) praise = { text, at: lampAt };
        // Ortak gövde bir kez patlar; hücreler akımın ulaştığı sırayla.
        const seen = new Set<number>();
        const blocks = all
          .flatMap((c) => c.path.slice(1, -1))
          .filter((p) => !seen.has(idx(p.r, p.c)) && seen.add(idx(p.r, p.c)))
          .sort((a, b) => (plan(cells, a).litAt ?? 0) - (plan(cells, b).litAt ?? 0));
        cursor = explode(blocks, lampAt + EXPLODE_DELAY_MS);
        break;
      }

      case 'LINE_CLEAR': {
        // Satır/sütun hücreleri, temizlenen çizginin ortasından dışa doğru patlar.
        const centerOf = (p: Pos) =>
          e.rows.includes(p.r) ? Math.abs(p.c - 3.5) : Math.abs(p.r - 3.5);
        const ordered = [...e.cells].sort((a, b) => centerOf(a) - centerOf(b));
        const start = cursor + (current ? EXPLODE_STAGGER_MS : 0);
        lineAt = start;
        cursor = explode(ordered, start);
        break;
      }

      case 'TRAY_REFILL':
        trayRefill = true;
        break;

      case 'BLOCK_BROKEN':
        // Çekiç: blok hemen şişip patlar (4.10)
        cursor = explode([e.pos], 0);
        break;

      case 'BLOCK_ROTATED':
        // Döndür: blok yeni yönüne döner; devre varsa akım dönüş bitince başlar.
        plan(cells, e.pos).spinAt = 0;
        cursor = Math.max(cursor, ROTATE_SPIN_MS);
        end = Math.max(end, ROTATE_SPIN_MS);
        break;

      case 'LIGHTNING': {
        // Yıldırım: ekran sarsılır, bloklar yukarıdan aşağı satır satır patlar.
        shakeAt = 0;
        praise = { text: 'Yıldırım!', at: 0 };
        let last = 0;
        for (const p of [...e.cells].sort((a, b) => a.r - b.r || a.c - b.c)) {
          last = Math.max(last, explode([p], p.r * LIGHTNING_ROW_MS));
        }
        cursor = last;
        break;
      }

      case 'SWITCHES_TURNED': {
        // Temizleme ve pil/lamba taşıma bittikten sonra anahtarlar döner.
        switchAt = cursor + SWITCH_TURN_GAP_MS;
        for (const p of e.cells) plan(cells, p).turnAt = switchAt;
        end = Math.max(end, switchAt + SWITCH_TURN_MS);
        break;
      }

      case 'SCORE': {
        const from =
          e.reason === 'circuit' && lamp
            ? lamp.pos
            : (bursts.length ? bursts[bursts.length - 1].pos : { r: 3, c: 3 });
        scorePops.push({ amount: e.amount, at: cursor, from });
        // Sayaç, uçan puan vardıktan sonra yuvarlanır; çizelge onunla biter.
        end = Math.max(end, cursor + SCORE_FLY_MS + SCORE_ROLL_MS);
        break;
      }

      case 'TERMINALS_MOVED': {
        const vanishAt = cursor + TERMINAL_MOVE_GAP_MS;
        placedBoard.forEach((c, i) => {
          if (c.kind === 'battery' || c.kind === 'lamp') {
            plan(cells, { r: Math.floor(i / 8), c: i % 8 }).vanishAt = vanishAt;
          }
        });
        const appearAt = vanishAt + TERMINAL_VANISH_MS;
        terminals = { battery: e.battery, lamp: e.lamp, lamps: e.lamps, appearAt };
        cursor = appearAt + TERMINAL_APPEAR_MS;
        end = Math.max(end, cursor);
        break;
      }

      default:
        break;
    }
  }

  const clears = bursts.length > 0 || terminals !== null;
  return {
    board: placedBoard,
    finalBoard,
    cells,
    current,
    lamp,
    currents,
    lamps,
    double,
    bursts,
    terminals,
    scorePops,
    praise,
    shakeAt,
    lineAt,
    trayRefill,
    switchAt,
    circuitLength,
    combo,
    lockUntil: clears ? cursor : 0,
    duration: Math.max(end, cursor),
  };
}

/** Ezilme-esneme eğrisi: k ∈ [0,1] → ölçek. Worklet içinde de çalışır. */
export function squashCurve(k: number, from: number, peak: number, peakAt: number): number {
  'worklet';
  if (k <= 0) return from;
  if (k >= 1) return 1;
  if (k < peakAt) return from + (peak - from) * (k / peakAt);
  return peak + (1 - peak) * ((k - peakAt) / (1 - peakAt));
}

/** Geri taşmalı yumuşak giriş (pil/lamba belirmesi). */
export function backOut(k: number): number {
  'worklet';
  const s = 1.70158;
  const x = k - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
}

// Hamle zaman çizelgesini ses ve titreşimle eşler; animasyonla aynı anlarda çalar.
import { LONG_CIRCUIT, TRAY_STAGGER_MS } from '../anim/constants';
import type { Timeline } from '../anim/timeline';
import { haptic } from './haptics';
import { playNote, playSfx } from './sound';

/** Art arda patlamalarda pop sesleri en az bu kadar aralıklı çalar (ses yığılmasın). */
const POP_MIN_GAP_MS = 55;
/** Övgü jingle'ı lambanın çanından biraz sonra girer. */
const JINGLE_DELAY_MS = 90;

/** Zamanlanmış sesleri başlatır; dönen fonksiyon bekleyenleri iptal eder. */
export function playTimeline(tl: Timeline): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

  playSfx('place');
  haptic('place');

  if (tl.current) {
    // Pentatonik gamda yükselen notalar: uzun devre = yükselen melodi.
    tl.current.times.forEach((t, i) => at(t, () => playNote(i)));
  }
  if (tl.lamp) {
    const strong = tl.circuitLength >= LONG_CIRCUIT || tl.double;
    // Her lamba kendi yandığı anda çınlar (çift lambada iki çan); titreşim sonuncusunda.
    for (const l of tl.lamps) {
      if (l === tl.lamp) continue;
      at(l.at, () => playSfx('lamp'));
    }
    at(tl.lamp.at, () => {
      playSfx('lamp');
      haptic(strong ? 'longCircuit' : 'circuit');
    });
  }
  if (tl.praise) at(tl.praise.at + JINGLE_DELAY_MS, () => playSfx('jingle'));
  if (tl.lineAt !== null) {
    at(tl.lineAt, () => {
      playSfx('line');
      if (!tl.lamp) haptic('line');
    });
  }

  let lastPop = -Infinity;
  for (const t of tl.bursts.map((b) => b.at).sort((a, b) => a - b)) {
    if (t - lastPop < POP_MIN_GAP_MS) continue;
    lastPop = t;
    at(t, () => playSfx('pop'));
  }

  // Anahtarlar dönerken küçük bir "tık"
  if (tl.switchAt !== null) at(tl.switchAt, () => playSfx('pickup'));

  if (tl.trayRefill) {
    for (let i = 0; i < 3; i++) at(80 + i * TRAY_STAGGER_MS, () => playSfx('tray'));
  }

  return () => timers.forEach(clearTimeout);
}

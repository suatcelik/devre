// Devre ses efektlerini ve arka plan müziğini sıfırdan sentezler (DEVRE_TASKS 3.6).
// Dış kaynak yok: tüm sesler bu betikle üretilir, lisans gerekmez.
// Çalıştır: node scripts/generate-sounds.mjs   →  assets/sounds/*.wav

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'sounds');
const SFX_RATE = 32000;
const MUSIC_RATE = 22050;
const TAU = Math.PI * 2;

// ---------- yardımcılar ----------

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "E5" → frekans */
const hz = (name) => midi(12 * (Number(name.slice(1)) + 1) + NOTE[name[0]]);

/** Doğrusal atak + üstel sönüm */
const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));

function render(dur, rate, fn) {
  const n = Math.round(dur * rate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / rate, i);
  return out;
}

function lowpass(samples, cutoff, rate) {
  const a = 1 - Math.exp((-TAU * cutoff) / rate);
  let y = 0;
  return samples.map((x) => (y += a * (x - y)));
}

function normalize(samples, peak) {
  let max = 0;
  for (const v of samples) max = Math.max(max, Math.abs(v));
  const k = max > 0 ? peak / max : 1;
  return samples.map((v) => v * k);
}

/** Tık sesi olmasın diye uçlarda kısa yumuşatma */
function fadeEdges(samples, rate, ms = 3) {
  const n = Math.min(Math.round((ms / 1000) * rate), samples.length >> 1);
  for (let i = 0; i < n; i++) {
    const k = i / n;
    samples[i] *= k;
    samples[samples.length - 1 - i] *= k;
  }
  return samples;
}

function writeWav(name, samples, rate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, `${name}.wav`), buf);
  return buf.length;
}

function sfx(name, dur, fn, peak = 0.85) {
  return writeWav(name, fadeEdges(normalize(render(dur, SFX_RATE, fn), peak), SFX_RATE), SFX_RATE);
}

/** Marimba benzeri tını: temel + 4. kısmi (tahta vuruşu) + 2. kısmi */
function marimba(f, t) {
  return (
    Math.sin(TAU * f * t) * env(t, 0.003, 0.2) +
    0.35 * Math.sin(TAU * 4 * f * t) * env(t, 0.001, 0.025) +
    0.18 * Math.sin(TAU * 2 * f * t) * env(t, 0.002, 0.09)
  );
}

/** Çan: uyumsuz kısmiler, uzun sönüm */
function bell(f, t, length = 1) {
  const partials = [
    [1, 1, 1.1],
    [2.0, 0.5, 0.75],
    [3.01, 0.32, 0.45],
    [4.2, 0.2, 0.3],
    [5.43, 0.12, 0.2],
  ];
  let v = 0;
  for (const [m, a, d] of partials) v += a * Math.sin(TAU * f * m * t) * env(t, 0.002, d * length);
  return v;
}

// ---------- efektler ----------

fs.mkdirSync(OUT, { recursive: true });
const sizes = {};

// Yerleştirme: kısa, tok "tık" — düşen perdeli gövde + çok kısa tıklama
{
  const noise = rng(1);
  const click = lowpass(render(0.12, SFX_RATE, () => noise() * 2 - 1), 3200, SFX_RATE);
  let phase = 0;
  sizes.place = sfx('place', 0.12, (t, i) => {
    const f = 70 + 120 * Math.exp(-t * 30);
    phase += (TAU * f) / SFX_RATE;
    return Math.sin(phase) * env(t, 0.002, 0.04) + 0.45 * click[i] * Math.exp(-t / 0.004);
  });
}

// Tutma: küçük, yükselen pıt
{
  let phase = 0;
  sizes.pickup = sfx('pickup', 0.08, (t) => {
    const f = 700 + 500 * (t / 0.08);
    phase += (TAU * f) / SFX_RATE;
    return (Math.sin(phase) + 0.2 * Math.sin(2 * phase)) * env(t, 0.004, 0.025);
  }, 0.6);
}

// Geçersiz bırakma: iki inen yumuşak ton
sizes.invalid = sfx('invalid', 0.24, (t) => {
  const f = t < 0.1 ? 330 : 247;
  const tt = t < 0.1 ? t : t - 0.1;
  const s = Math.sin(TAU * f * t);
  return (s + 0.25 * Math.sin(3 * TAU * f * t)) * env(tt, 0.004, 0.05);
}, 0.6);

// Akım notaları: C majör pentatonik, C5'ten 3 oktav, yükselen (uzun devre = yükselen melodi)
const PENTA = [0, 2, 4, 7, 9];
for (let i = 0; i < 15; i++) {
  const f = midi(72 + 12 * Math.floor(i / 5) + PENTA[i % 5]);
  sizes[`note${i}`] = sfx(`note_${String(i).padStart(2, '0')}`, 0.45, (t) => marimba(f, t), 0.7);
}

// Patlama: perdesi düşen pop + kısa hışırtı
{
  const noise = rng(2);
  const hiss = lowpass(render(0.14, SFX_RATE, () => noise() * 2 - 1), 5000, SFX_RATE);
  const low = lowpass(hiss, 900, SFX_RATE);
  let phase = 0;
  sizes.pop = sfx('pop', 0.14, (t, i) => {
    const f = 180 + 520 * Math.exp(-t * 45);
    phase += (TAU * f) / SFX_RATE;
    return Math.sin(phase) * env(t, 0.002, 0.03) + 0.5 * (hiss[i] - low[i]) * env(t, 0.001, 0.02);
  }, 0.7);
}

// Lamba: parlak çan + biraz gecikmeli beşli
sizes.lamp = sfx('lamp', 1.6, (t) => {
  const f = hz('E6');
  const second = t > 0.06 ? 0.45 * bell(f * 1.5, t - 0.06, 0.8) : 0;
  return bell(f, t) + second;
});

// Övgü jingle'ı: hızlı arpej ve akor
sizes.jingle = sfx('jingle', 0.95, (t) => {
  const notes = ['C6', 'E6', 'G6', 'C7'];
  let v = 0;
  notes.forEach((n, k) => {
    const start = k * 0.075;
    if (t >= start) v += marimba(hz(n), t - start) * (k === 3 ? 1.2 : 1);
  });
  if (t >= 0.3) v += 0.5 * bell(hz('G6'), t - 0.3, 0.5);
  return v;
}, 0.8);

// Satır/sütun temizleme: yükselen hışırtı
{
  const noise = rng(3);
  const raw = render(0.4, SFX_RATE, () => noise() * 2 - 1);
  let y = 0;
  sizes.line = sfx('line', 0.4, (t, i) => {
    const cutoff = 400 + 5000 * (t / 0.4) ** 1.5;
    const a = 1 - Math.exp((-TAU * cutoff) / SFX_RATE);
    y += a * (raw[i] - y);
    return y * Math.sin((Math.PI * t) / 0.4) ** 2;
  }, 0.55);
}

// Yeni tepsi: kabarcık
{
  let phase = 0;
  sizes.tray = sfx('tray', 0.09, (t) => {
    const f = 380 + 600 * (t / 0.09) ** 0.7;
    phase += (TAU * f) / SFX_RATE;
    return Math.sin(phase) * env(t, 0.005, 0.03);
  }, 0.5);
}

// Oyun sonu: inen hüzünlü üç nota ve uzun pes nota
sizes.gameover = sfx('gameover', 1.3, (t) => {
  const seq = [['G5', 0], ['E5', 0.2], ['C5', 0.4], ['C4', 0.62]];
  let v = 0;
  for (const [n, start] of seq) {
    if (t < start) continue;
    const tt = t - start;
    const vib = 1 + 0.006 * Math.sin(TAU * 5 * tt);
    const long = n === 'C4';
    v += Math.sin(TAU * hz(n) * vib * tt) * env(tt, 0.01, long ? 0.45 : 0.16) * (long ? 1.1 : 0.8);
  }
  return v;
}, 0.7);

// Yıldızlar: tok "çat" vuruşu + her yıldızda daha tiz bir çan (E6, G6, C7)
{
  const noise = rng(4);
  const crack = lowpass(render(0.9, SFX_RATE, () => noise() * 2 - 1), 2600, SFX_RATE);
  ['E6', 'G6', 'C7'].forEach((n, k) => {
    let phase = 0;
    sizes[`star${k + 1}`] = sfx(`star_${k + 1}`, 0.9, (t, i) => {
      const f = 90 + 160 * Math.exp(-t * 40);
      phase += (TAU * f) / SFX_RATE;
      const thump = Math.sin(phase) * env(t, 0.001, 0.05);
      const snap = 0.5 * crack[i] * Math.exp(-t / 0.006);
      const ring = t > 0.02 ? 0.55 * bell(hz(n), t - 0.02, 0.55) : 0;
      return thump + snap + ring;
    }, 0.85);
  });
}

// Konfeti: art arda hafif patlamalar ve parıltı
{
  const noise = rng(5);
  const raw = render(1.1, SFX_RATE, () => noise() * 2 - 1);
  const hi = raw.map((v, i, a) => v - (a[i - 1] ?? 0));
  const bursts = [0, 0.05, 0.11, 0.18];
  sizes.confetti = sfx('confetti', 1.1, (t, i) => {
    let v = 0;
    for (const b of bursts) if (t >= b) v += 0.6 * hi[i] * Math.exp(-(t - b) / 0.03);
    // Parıltı: tiz, rastgele zamanlı minik çanlar
    for (let k = 0; k < 7; k++) {
      const at = 0.15 + k * 0.11;
      if (t >= at) v += 0.12 * Math.sin(TAU * hz(['C7', 'E7', 'G7'][k % 3]) * (t - at)) * env(t - at, 0.002, 0.08);
    }
    return v;
  }, 0.6);
}

// ---------- arka plan müziği: sakin, kusursuz döngü ----------

{
  const BPM = 84;
  const beat = 60 / BPM;
  const bars = 8;
  const dur = bars * 4 * beat;
  const N = Math.round(dur * MUSIC_RATE);
  const buf = new Float32Array(N);
  // Döngü dikişsiz olsun diye kuyruklar başa sarılır.
  const add = (startSec, length, fn) => {
    const s0 = Math.round(startSec * MUSIC_RATE);
    const n = Math.round(length * MUSIC_RATE);
    for (let i = 0; i < n; i++) buf[(s0 + i) % N] += fn(i / MUSIC_RATE);
  };

  const chords = [
    ['C4', 'E4', 'G4', 'C3'],
    ['A3', 'C4', 'E4', 'A2'],
    ['F3', 'A3', 'C4', 'F2'],
    ['G3', 'B3', 'D4', 'G2'],
  ];
  chords.forEach((chord, k) => {
    const start = k * 8 * beat;
    const len = 8 * beat;
    // Yumuşak ped: hafif akortsuz iki sinüs, yavaş giriş-çıkış
    for (const n of chord.slice(0, 3)) {
      const f = hz(n);
      add(start, len + 1.2, (t) => {
        const a = Math.min(t / 0.9, 1) * (t > len ? Math.exp(-(t - len) / 0.4) : 1);
        return 0.11 * a * (Math.sin(TAU * f * t) + 0.7 * Math.sin(TAU * f * 1.003 * t) + 0.15 * Math.sin(TAU * 2 * f * t));
      });
    }
    // Bas: 1. ve 3. vuruşta yumuşak darbe
    const root = hz(chord[3]);
    for (let b = 0; b < 8; b += 2) {
      add(start + b * beat, 1.2, (t) => 0.22 * Math.sin(TAU * root * t) * env(t, 0.01, 0.35));
    }
  });

  // Pentatonik ezgi, sekizlik notalar (null = sus)
  const melody = [
    ['E5', null, 'G5', null, 'A5', null, 'G5', null],
    ['E5', null, 'D5', null, 'C5', null, null, null],
    ['C5', null, 'E5', null, 'A5', null, 'G5', null],
    ['E5', null, null, null, 'D5', null, 'E5', null],
    ['A4', null, 'C5', null, 'D5', null, 'C5', null],
    ['A4', null, null, null, 'C5', null, 'A4', null],
    ['G4', null, 'A4', null, 'D5', null, 'E5', null],
    ['D5', null, null, null, 'G4', null, null, null],
  ];
  const eighth = beat / 2;
  const celesta = (f, t) =>
    (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t) * env(t, 0.002, 0.15)) * env(t, 0.004, 0.45);
  melody.forEach((bar, b) =>
    bar.forEach((n, s) => {
      if (!n) return;
      const at = (b * 8 + s) * eighth;
      const f = hz(n);
      add(at, 1.6, (t) => 0.16 * celesta(f, t));
      // Yumuşak yankı: 3/8 vuruş sonra iki tekrar
      add(at + 3 * eighth, 1.6, (t) => 0.06 * celesta(f, t));
      add(at + 6 * eighth, 1.6, (t) => 0.025 * celesta(f, t));
    }),
  );

  sizes.music = writeWav('music', normalize(buf, 0.7), MUSIC_RATE);
}

const total = Object.values(sizes).reduce((a, b) => a + b, 0);
console.log(`${Object.keys(sizes).length} dosya, toplam ${(total / 1024).toFixed(0)} KB → ${path.relative(ROOT, OUT)}`);

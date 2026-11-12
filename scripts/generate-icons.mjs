// Uygulama ikonlarını ve açılış görselini üretir (DEVRE_TASKS 3.1.2).
// Şeker tarzı: ışın saçan parlak mor zemin, kalın konturlu, cam gibi parlayan Kıvılcım,
// renkli ve kabarık "DEVRE" yazısı. Kıvılcım, oyundaki çizimle (src/ui/Kivilcim.tsx) aynı 100x110 ızgarada.
// Çalıştır: node scripts/generate-icons.mjs   →  assets/*.png

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'assets');
const FONT = path.join(ROOT, 'node_modules/@expo-google-fonts/baloo-2/800ExtraBold/Baloo2_800ExtraBold.ttf');

// Renkler src/theme/colors.ts ile aynı (zemin için birkaç parlak ara ton eklendi)
const C = {
  night: '#151033',
  bgTop: '#2A1B5E',
  bgDeep: '#1E1250',
  violet: '#6B2FD6',
  magenta: '#B44CFF',
  rayLight: '#E3B8FF',
  body: '#FFD23F',
  bodyLight: '#FFF4B0',
  bodyDeep: '#F5A300',
  outline: '#8A4B00',
  face: '#2A1B5E',
  cheek: '#FF8FB0',
};

/** Logo harfleri: D E V R E (src/theme/colors.ts logoTones) ve ana ekrandaki eğimler */
const LETTERS = [
  { ch: 'D', light: '#FF8FB0', base: '#FF5C8A', edge: '#C93A66', rotate: -6, dy: 0 },
  { ch: 'E', light: '#FFB870', base: '#FF9A3D', edge: '#CC6E1A', rotate: 3, dy: -6 },
  { ch: 'V', light: '#FFE27A', base: '#FFD23F', edge: '#C99A12', rotate: -2, dy: 2 },
  { ch: 'R', light: '#7AEBAD', base: '#3DDC84', edge: '#1FA85F', rotate: 4, dy: -4 },
  { ch: 'E', light: '#7ACFFF', base: '#3DB8FF', edge: '#1B86C9', rotate: -4, dy: 2 },
];

const BODY = 'M50 6 C58 26 84 40 84 66 A34 34 0 0 1 16 66 C16 40 42 26 50 6 Z';

const defs = (glowBlur) => `
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.48" r="0.72">
      <stop offset="0" stop-color="${C.magenta}"/>
      <stop offset="0.45" stop-color="${C.violet}"/>
      <stop offset="1" stop-color="${C.bgDeep}"/>
    </radialGradient>
    <radialGradient id="rayFade" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bodyGrad" cx="0.36" cy="0.42" r="0.75">
      <stop offset="0" stop-color="${C.bodyLight}"/>
      <stop offset="0.45" stop-color="${C.body}"/>
      <stop offset="1" stop-color="${C.bodyDeep}"/>
    </radialGradient>
    <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.6" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.35"/>
    </linearGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="${glowBlur}"/>
    </filter>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${glowBlur * 0.6}"/>
    </filter>
    ${LETTERS.map(
      (l, i) => `<linearGradient id="letter${i}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.12" stop-color="${l.light}"/>
      <stop offset="0.62" stop-color="${l.base}"/>
    </linearGradient>`,
    ).join('')}
  </defs>`;

/** Ortadan dışa açılan, kenara doğru sönen ışınlar (şeker oyunlarının ödül ışığı). */
function rays(cx, cy, radius, count = 14, opacity = 0.22) {
  const step = (Math.PI * 2) / count;
  const wedges = Array.from({ length: count }, (_, i) => {
    const a0 = i * step - step * 0.25;
    const a1 = a0 + step * 0.5;
    const p = (a) => `${cx + Math.cos(a) * radius} ${cy + Math.sin(a) * radius}`;
    return `M${cx} ${cy} L${p(a0)} L${p(a1)} Z`;
  }).join(' ');
  return `<g mask="url(#rayMask${Math.round(radius)})">
    <path d="${wedges}" fill="${C.rayLight}" opacity="${opacity}"/>
  </g>`;
}

/** Işın maskesi her yarıçap için ayrı tanımlanır (ışınlar merkezde parlak, kenarda sönük). */
function rayMask(cx, cy, radius) {
  return `<defs><mask id="rayMask${Math.round(radius)}">
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#rayFade)"/></mask></defs>`;
}

/** Dört köşeli parıltı */
function sparkle(x, y, r, color = '#FFFFFF', opacity = 1) {
  const k = r * 0.22;
  return `<path d="M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r}
    Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z" fill="${color}" opacity="${opacity}"/>`;
}

/**
 * Kıvılcım, sevinçli poz, şeker tarzında: kalın koyu kontur, cam parlaklığı, alt gölge.
 * (cx, cy) gövde merkezi, `size` gövde genişliği (px).
 */
function sparky({ cx, cy, size, glow = true, shadow = true }) {
  const k = size / 68; // gövde 16..84 arası = 68 birim
  const tx = cx - 50 * k;
  const ty = cy - 60 * k;
  return `
  <g transform="translate(${tx} ${ty}) scale(${k})">
    ${shadow ? `<ellipse cx="50" cy="104" rx="30" ry="5" fill="#000000" opacity="0.28" filter="url(#soft)"/>` : ''}
    ${glow ? `<path d="${BODY}" fill="${C.body}" filter="url(#glow)" opacity="0.9"/>` : ''}
    <path d="${BODY}" fill="${C.outline}" stroke="${C.outline}" stroke-width="6" stroke-linejoin="round"
      transform="translate(0 2.5)"/>
    <path d="${BODY}" fill="url(#bodyGrad)" stroke="${C.outline}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M24 80 A30 30 0 0 0 76 80" fill="none" stroke="${C.bodyDeep}" stroke-width="5" stroke-linecap="round"
      opacity="0.55"/>
    <ellipse cx="35" cy="44" rx="7.5" ry="12.5" fill="#FFFFFF" opacity="0.85" transform="rotate(18 35 44)"/>
    <circle cx="40.5" cy="30" r="3" fill="#FFFFFF" opacity="0.9"/>
    <ellipse cx="40" cy="66" rx="6" ry="8" fill="${C.face}"/>
    <ellipse cx="60" cy="66" rx="6" ry="8" fill="${C.face}"/>
    <circle cx="42.5" cy="62.5" r="2.6" fill="#FFFFFF"/>
    <circle cx="62.5" cy="62.5" r="2.6" fill="#FFFFFF"/>
    <circle cx="38.5" cy="69" r="1.2" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="58.5" cy="69" r="1.2" fill="#FFFFFF" opacity="0.8"/>
    <path d="M38 78 Q50 98 62 78 Z" fill="${C.face}" stroke="${C.face}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M44 86 Q50 92 56 86 Q50 89 44 86 Z" fill="#FF5C8A"/>
    <ellipse cx="28" cy="78" rx="6" ry="4.5" fill="${C.cheek}" opacity="0.9"/>
    <ellipse cx="72" cy="78" rx="6" ry="4.5" fill="${C.cheek}" opacity="0.9"/>
  </g>`;
}

/** Kabarık, çok renkli "DEVRE" yazısı. (cx, baseline) yazının ortası ve taban çizgisi. */
function logo(cx, baseline, fontSize) {
  const advance = fontSize * 0.6;
  const total = advance * LETTERS.length;
  const outline = fontSize * 0.14;
  const extrude = fontSize * 0.075;
  const text = (ch, x, y, attrs) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="Baloo 2" font-weight="800"
      font-size="${fontSize}" ${attrs}>${ch}</text>`;
  return LETTERS.map((l, i) => {
    const x = cx - total / 2 + advance * (i + 0.5);
    const y = baseline + (l.dy * fontSize) / 92;
    return `<g transform="rotate(${l.rotate} ${x} ${y - fontSize * 0.35})">
      ${text(l.ch, x, y + extrude + outline * 0.4, `fill="${C.night}" stroke="${C.night}" stroke-width="${outline * 2}" stroke-linejoin="round"`)}
      ${text(l.ch, x, y + extrude, `fill="${l.edge}" stroke="${l.edge}" stroke-width="${outline * 0.5}" stroke-linejoin="round"`)}
      ${text(l.ch, x, y, `fill="url(#letter${i})"`)}
    </g>`;
  }).join('');
}

/** Tam zemin: parlak mor, ışınlar, parıltılar, alt kenarda hafif gölge. */
function background(s, { sparkles = true } = {}) {
  const cx = s / 2;
  const cy = s * 0.5;
  const R = s * 0.75;
  const spark = sparkles
    ? [
        [0.17, 0.2, 0.045, 1],
        [0.84, 0.17, 0.03, 0.85],
        [0.86, 0.74, 0.04, 0.9],
        [0.14, 0.76, 0.028, 0.75],
        [0.7, 0.9, 0.02, 0.6],
        [0.3, 0.1, 0.018, 0.6],
      ]
        .map(([x, y, r, o]) => sparkle(x * s, y * s, r * s, '#FFFFFF', o))
        .join('')
    : '';
  return `
  ${rayMask(cx, cy, R)}
  <rect width="${s}" height="${s}" fill="url(#bg)"/>
  ${rays(cx, cy, R, 14, 0.28)}
  <rect width="${s}" height="${s}" fill="url(#vignette)"/>
  ${spark}`;
}

const svgDoc = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

function render(name, svg, width) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: 'Baloo 2' },
  })
    .render()
    .asPng();
  fs.writeFileSync(path.join(ASSETS, name), png);
  return `${name} ${width}px ${(png.length / 1024).toFixed(0)} KB`;
}

const out = [];

// iOS / genel ikon: opak, zemin + Kıvılcım (iOS köşeleri kendisi yuvarlar)
{
  const s = 1024;
  out.push(render('icon.png', svgDoc(s, s, `${defs(14)}${background(s)}${sparky({ cx: s / 2, cy: s * 0.5, size: s * 0.54 })}`), s));
}

// Android uyarlanabilir ikon: zemin ve ön plan ayrı. Ön plan güvenli alanda (ortadaki %66) kalır.
{
  const s = 512;
  out.push(render('android-icon-background.png', svgDoc(s, s, `${defs(7)}${background(s, { sparkles: false })}`), s));
  const fg = `${defs(6)}${sparky({ cx: s / 2, cy: s * 0.5, size: s * 0.38 })}
    ${sparkle(s * 0.3, s * 0.3, s * 0.035)}${sparkle(s * 0.7, s * 0.34, s * 0.025, '#FFFFFF', 0.85)}
    ${sparkle(s * 0.71, s * 0.68, s * 0.03, '#FFFFFF', 0.9)}`;
  out.push(render('android-icon-foreground.png', svgDoc(s, s, fg), s));
}

// Android tek renkli (temalı) ikon: yalnızca saydamlık kullanılır; yüz delik olarak kesilir.
{
  const s = 432;
  const k = (s * 0.42) / 68;
  const tx = s / 2 - 50 * k;
  const ty = s * 0.53 - 60 * k;
  const svg = svgDoc(s, s, `
    <defs><mask id="face"><g transform="translate(${tx} ${ty}) scale(${k})">
      <path d="${BODY}" fill="#FFFFFF"/>
      <ellipse cx="40" cy="66" rx="6" ry="8" fill="#000000"/>
      <ellipse cx="60" cy="66" rx="6" ry="8" fill="#000000"/>
      <path d="M38 78 Q50 98 62 78 Z" fill="#000000"/>
    </g></mask></defs>
    <rect width="${s}" height="${s}" fill="#FFFFFF" mask="url(#face)"/>`);
  out.push(render('android-icon-monochrome.png', svg, s));
}

// Android bildirim simgesi: 96x96, yalnız beyaz ve saydam (expo-notifications eklentisi). Yüz delik olarak kesilir.
{
  const s = 96;
  const k = (s * 0.5) / 68;
  const tx = s / 2 - 50 * k;
  const ty = s * 0.52 - 60 * k;
  const svg = svgDoc(s, s, `
    <defs><mask id="face"><g transform="translate(${tx} ${ty}) scale(${k})">
      <path d="${BODY}" fill="#FFFFFF"/>
      <ellipse cx="40" cy="66" rx="6" ry="8" fill="#000000"/>
      <ellipse cx="60" cy="66" rx="6" ry="8" fill="#000000"/>
      <path d="M38 78 Q50 98 62 78 Z" fill="#000000"/>
    </g></mask></defs>
    <rect width="${s}" height="${s}" fill="#FFFFFF" mask="url(#face)"/>`);
  out.push(render('notification-icon.png', svg, s));
}

// Açılış görseli: saydam zeminde (zemin rengi app.json'da) ışınlar, Kıvılcım ve DEVRE yazısı.
// Android 12+ görseli ortadaki daireyle (çapın ~2/3'ü) kırptığı için her şey o dairenin içinde kalır.
// Oyun içi açılış (src/ui/SplashIntro.tsx) aynı yerleşimle başlar.
{
  const w = 1024;
  const h = 1024;
  const body = `${defs(9)}${rayMask(w / 2, h * 0.43, w * 0.3)}
    ${rays(w / 2, h * 0.43, w * 0.3, 14, 0.22)}
    ${sparkle(w * 0.34, h * 0.31, w * 0.024)}${sparkle(w * 0.67, h * 0.34, w * 0.017, '#FFFFFF', 0.85)}
    ${sparky({ cx: w / 2, cy: h * 0.43, size: w * 0.19 })}
    ${logo(w / 2, h * 0.69, w * 0.145)}`;
  out.push(render('splash-icon.png', svgDoc(w, h, body), w));
}

// Web favicon: küçük boyutta parlama ve ışın yok, gövde daha büyük
{
  const s = 48;
  const svg = svgDoc(s, s, `${defs(1)}<rect width="${s}" height="${s}" rx="10" fill="url(#bg)"/>
    ${sparky({ cx: s / 2, cy: s * 0.5, size: s * 0.62, glow: false, shadow: false })}`);
  out.push(render('favicon.png', svg, s));
}

console.log(out.join('\n'));

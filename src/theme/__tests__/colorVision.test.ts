// Renk körlüğü kontrolü (DEVRE_TASKS 3.2.2): kablolar renge değil parlaklığa dayanmalı.
// Her parça renginin açık ve ana tonu üstünde, her renk görme türünde karşıtlıklar ölçülür.
import { colors, steel, switchColors, tones } from '../colors';
import { RGB, VISIONS, Vision, contrast, hexToRgb, over, simulate } from '../colorVision';

/** WCAG 2.1 SC 1.4.11: grafik öğeler en az 3:1 */
const GRAPHIC_MIN = 3;
/** Akım geçen kablo sönükten bu kadar parlak olmalı (renkten bağımsız ayırt edilebilir adım) */
const LIT_STEP_MIN = 1.5;
/** Kontur, kabloyu parça gövdesinden ayırır */
const OUTLINE_MIN = 2.5;
/** WCAG 2.1 SC 1.4.3: normal metin en az 4.5:1 */
const TEXT_MIN = 4.5;
/**
 * Büyük metin (≥18.66 px kalın) en az 3:1. Düğme yazıları Baloo 2 ExtraBold, en küçüğü 20 px ("Geç"),
 * bu yüzden düğmeler bu eşiğe tabidir. Düğmeye 18 px'ten küçük yazı konursa bu test yetmez.
 */
const LARGE_TEXT_MIN = 3;

// Kilitli blokların çelik gövdesi de kablo taşır (4.6).
const bodies = Object.entries({ ...tones, steel }).flatMap(([name, t]) => [
  [`${name} açık`, hexToRgb(t.light)] as const,
  [`${name} ana`, hexToRgb(t.base)] as const,
]);

function wireLayers(body: RGB) {
  const outline = over(body, hexToRgb(colors.wireOutline), colors.wireOutlineOpacity);
  return {
    outline,
    idle: over(outline, hexToRgb(colors.wireIdle), colors.wireIdleOpacity),
    lit: hexToRgb(colors.wireLit),
  };
}

const seen = (rgb: RGB, v: Vision) => simulate(rgb, v);

describe.each(VISIONS)('%s', (vision) => {
  it.each(bodies)('%s gövdede sönük kablo konturundan en az 3:1 ayrışır', (_, body) => {
    const { outline, idle } = wireLayers(body);
    expect(contrast(seen(idle, vision), seen(outline, vision))).toBeGreaterThanOrEqual(GRAPHIC_MIN);
  });

  it.each(bodies)('%s gövdede akım geçen kablo sönükten belirgin parlak', (_, body) => {
    const { idle, lit } = wireLayers(body);
    expect(contrast(seen(lit, vision), seen(idle, vision))).toBeGreaterThanOrEqual(LIT_STEP_MIN);
  });

  it.each(bodies)('%s gövdede kontur gövdeden ayrışır', (_, body) => {
    const { outline } = wireLayers(body);
    expect(contrast(seen(outline, vision), seen(body, vision))).toBeGreaterThanOrEqual(OUTLINE_MIN);
  });

  // Anahtar (4.6): koyu disk üstünde kablo doğrudan diskle karşıtlık kurar (koyu kontur koyu diskte işlevsiz).
  // Anahtarı boş hücreden ayıran şey parlak halka ve oktur.
  it('anahtar: kablo diskten, halka ve ok plakadan ve boş hücreden ayrışır', () => {
    const disc = hexToRgb(switchColors.disc);
    const { idle, lit } = wireLayers(disc);
    expect(contrast(seen(idle, vision), seen(disc, vision))).toBeGreaterThanOrEqual(GRAPHIC_MIN);
    expect(contrast(seen(lit, vision), seen(idle, vision))).toBeGreaterThanOrEqual(LIT_STEP_MIN);
    for (const mark of [switchColors.ring, switchColors.arrow]) {
      expect(contrast(seen(hexToRgb(mark), vision), seen(hexToRgb(switchColors.plate), vision))).toBeGreaterThanOrEqual(GRAPHIC_MIN);
      expect(contrast(seen(hexToRgb(mark), vision), seen(hexToRgb(colors.emptyCell), vision))).toBeGreaterThanOrEqual(GRAPHIC_MIN);
    }
  });

  it('yanan lamba sönük lambadan en az 3:1 ayrışır', () => {
    expect(contrast(seen(hexToRgb(colors.lampLit), vision), seen(hexToRgb(colors.lampOffGlass), vision)))
      .toBeGreaterThanOrEqual(GRAPHIC_MIN);
  });

  it('boş hücre ile parça gövdeleri parlaklıkla ayrışır', () => {
    const empty = seen(hexToRgb(colors.emptyCell), vision);
    for (const [, body] of bodies) {
      expect(contrast(seen(body, vision), empty)).toBeGreaterThanOrEqual(GRAPHIC_MIN);
    }
  });

  it.each(Object.entries(tones))('%s düğme üstündeki büyük yazı okunur', (_, t) => {
    const text = seen(hexToRgb(colors.textOnButton), vision);
    expect(contrast(text, seen(hexToRgb(t.base), vision))).toBeGreaterThanOrEqual(LARGE_TEXT_MIN);
  });

  it('panel üstündeki ikincil yazı okunur', () => {
    expect(contrast(seen(hexToRgb(colors.textSecondary), vision), seen(hexToRgb(colors.panel), vision)))
      .toBeGreaterThanOrEqual(TEXT_MIN);
  });
});

describe('simülasyon', () => {
  it('normal görme rengi değiştirmez, tam renk körlüğü griye çevirir', () => {
    const pink = hexToRgb(tones.pink.base);
    expect(simulate(pink, 'normal')).toEqual(pink);
    const [r, g, b] = simulate(pink, 'achromatopsia');
    expect(Math.abs(r - g)).toBeLessThan(1e-9);
    expect(Math.abs(g - b)).toBeLessThan(1e-9);
  });

  it('kırmızı ve yeşil körlüğünde pembe ile yeşil parça birbirine yaklaşır (renk tek başına güvenilmez)', () => {
    const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const pink = hexToRgb(tones.pink.base);
    const green = hexToRgb(tones.green.base);
    const normal = dist(pink, green);
    expect(dist(simulate(pink, 'deuteranopia'), simulate(green, 'deuteranopia'))).toBeLessThan(normal);
    expect(dist(simulate(pink, 'protanopia'), simulate(green, 'protanopia'))).toBeLessThan(normal);
  });
});

// Renk görme farklılığı simülasyonu ve karşıtlık ölçümü (DEVRE_TASKS 3.2.2).
// Kablolar renge değil parlaklığa dayanmalı: bu modül bunu sayısal olarak doğrular
// ve cihaz içi simülatör için Skia renk matrislerini üretir.
// Kaynak: Machado, Oliveira, Fernandes (2009), şiddet 1.0 matrisleri (doğrusal RGB).

export type Vision = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export const VISIONS: readonly Vision[] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];

export const VISION_LABELS: Record<Vision, string> = {
  normal: 'Normal',
  protanopia: 'Kırmızı körlüğü',
  deuteranopia: 'Yeşil körlüğü',
  tritanopia: 'Mavi körlüğü',
  achromatopsia: 'Tam renk körlüğü',
};

type M3 = readonly [number, number, number, number, number, number, number, number, number];

const MATRICES: Record<Exclude<Vision, 'normal'>, M3> = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
  achromatopsia: [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722],
};

export type RGB = readonly [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as unknown as RGB;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Rengi verilen görme türüyle görüldüğü hâle çevirir (sRGB 0..1). */
export function simulate(rgb: RGB, vision: Vision): RGB {
  if (vision === 'normal') return rgb;
  const m = MATRICES[vision];
  const [r, g, b] = rgb.map(toLinear);
  return [m[0] * r + m[1] * g + m[2] * b, m[3] * r + m[4] * g + m[5] * b, m[6] * r + m[7] * g + m[8] * b].map(
    (v) => toSrgb(clamp01(v)),
  ) as unknown as RGB;
}

/** `top` rengini `alpha` opaklıkla `bottom` üstüne bindirir (sRGB'de, ekrandaki karışım gibi). */
export function over(bottom: RGB, top: RGB, alpha: number): RGB {
  return bottom.map((b, i) => b * (1 - alpha) + top[i] * alpha) as unknown as RGB;
}

/** WCAG göreli parlaklık */
export function luminance(rgb: RGB): number {
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG karşıtlık oranı (1..21) */
export function contrast(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Skia <ColorMatrix> için 4x5 matris (sRGB üzerinde yaklaşık simülasyon).
 * Cihaz içi önizleme içindir; sayısal doğrulama `simulate` ile doğrusal uzayda yapılır.
 */
export function skiaColorMatrix(vision: Vision): number[] {
  if (vision === 'normal') return [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
  const m = MATRICES[vision];
  return [m[0], m[1], m[2], 0, 0, m[3], m[4], m[5], 0, 0, m[6], m[7], m[8], 0, 0, 0, 0, 0, 1, 0];
}

// Ölçüler tasarımdaki 390 px genişlikli ekranlardan alınmıştır.
// Hücreye bağlı değerler oran olarak tutulur; tahta ekran boyuna göre ölçeklenir.

/** Tasarımın referans ekran genişliği. */
export const DESIGN_WIDTH = 390;

export const board = {
  /** 390 px ekranda hücre boyu */
  cell: 38,
  gap: 4,
  padding: 10,
  border: 3,
  radius: 24,
  /** Panelin alt dış gölgesi */
  dropShadowY: 8,
  insetShadowY: 4,
} as const;

/** Hücre boyuna oranla (cell = 1). */
export const cellRatio = {
  /** Köşe yuvarlaklığı: 9 / 38 */
  radius: 0.24,
  /** Alt kenar gölgesi kayması: 4 / 38 */
  edgeShadow: 0.105,
  /** Üst parlama ovali: sol %14, üst %8, genişlik %72, yükseklik %30, %35 opak */
  gloss: { x: 0.14, y: 0.08, w: 0.72, h: 0.3, opacity: 0.35 },
  /** Üstteki ince iç parlama çizgisi: 2 / 38, %45 opak */
  innerHighlight: 0.053,
  innerHighlightOpacity: 0.45,
  /** Kablo: 5 / 38 kalınlık, 10 / 38 koyu kontur, düğüm yarıçapı 4.5 / 38 */
  wire: 0.13,
  /** Akım geçen kablo daha kalın: renkten bağımsız bir şekil ipucu (3.2.2) */
  wireLit: 0.17,
  wireOutline: 0.26,
  wireNode: 0.118,
  /** Gövde geçişinin açık tondan ana tona bittiği nokta */
  gradientStop: 0.7,
} as const;

export const tray = {
  slotWidth: 100,
  slotHeight: 96,
  /** Tepsideki parçanın tahtadakine göre ölçeği */
  pieceScale: 0.55,
  /** Sürüklenen parça parmağın bu kadar üstünde durur (DEVRE_TASKS 2.3) */
  dragLift: 60,
} as const;

export const hud = {
  statWidth: 84,
  statHeight: 64,
  statRadius: 18,
  progressWidth: 150,
  progressHeight: 12,
} as const;

export const button = {
  primaryHeight: 68,
  secondaryHeight: 56,
  /** Alt kenar kalınlığı; basınca bu kadar aşağı iner (DEVRE_TASKS 3.7) */
  edge: 6,
  iconSize: 52,
  iconEdge: 5,
  /** Minimum dokunma alanı */
  minTouch: 48,
} as const;

export const screenPadding = { home: 24, game: 16 } as const;

// Devre renk paleti: tek kaynak (DEVRE_TASKS 3.2).
// Değerler "Devre: renkli tasarım" tuvalindeki ekranlardan birebir alınmıştır.

import type { PieceColor } from '../game/types';

export const colors = {
  /** Arka plan geçişi: üst → alt */
  bgTop: '#2A1B5E',
  bgBottom: '#151033',

  /** Tahta paneli ve çerçevesi */
  panel: '#3A2A7A',
  panelBorder: '#5B45B0',
  emptyCell: '#2F2168',
  /** Boş hücrenin iç gölgesi: inset 0 3px 0 */
  emptyCellInset: 'rgba(0,0,0,0.25)',
  /** Tahta panelinin iç ve dış gölgeleri */
  panelInsetShadow: 'rgba(0,0,0,0.25)',
  panelDropShadow: 'rgba(0,0,0,0.3)',

  /** Kablolar */
  wireIdle: '#FFF3D6',
  wireIdleOpacity: 0.7,
  wireLit: '#FFFFFF',
  wireLitCore: '#FFFBE0',
  wireGlow: '#FFD23F',
  /**
   * Kablonun altındaki koyu kontur (okunurluk; renge değil parlaklığa dayanır).
   * Tasarımda %55'ti; %70 opak sönük kablonun her parça renginde ve her renk görme türünde
   * konturuna karşı en az 3:1 karşıtlık vermesi için %70'e çıkarıldı (3.2.2).
   */
  wireOutline: '#2A1B5E',
  wireOutlineOpacity: 0.7,

  /** Pil ve lamba */
  batteryBody: '#FFD23F',
  batteryMark: '#2A1B5E',
  lampLit: '#FFFBE0',
  lampRing: '#FFD23F',
  lampFilament: '#C99A12',
  lampOffGlass: '#6E6496',
  lampOffRing: '#8F86BF',
  lampGlow: 'rgba(255,210,63,0.75)',
  /** Sürükleme önizlemesindeki hayalet parçanın opaklığı */
  ghostOpacity: 0.45,
  /** Tepsideki boş yuvanın kesikli çerçevesi */
  slotDashed: '#5B45B0',

  /** Yazı */
  text: '#FFFFFF',
  textSecondary: '#CFC4F5',
  /** Düğme üstündeki koyu yazı */
  textOnButton: '#2A1B5E',
  /** Puan/övgü yazılarının alt gölgesi */
  textShadow: '#151033',
  praiseShadow: '#C93A66',

  /** Yıldızlar */
  starOn: '#FFD23F',
  starOnStroke: '#C99A12',
  starOff: '#55408F',
  starOffStroke: '#3A2A7A',

  /** İlerleme çubuğu */
  progressTrack: '#2F2168',
  progressFillTop: '#FFE27A',
  progressFill: '#FFD23F',

  /** Harita */
  levelLocked: '#4A3A8F',
  levelLockedEdge: '#2F2168',
  skyline: '#1E1548',
  windowOff: '#3A2A7A',
  windowOn: '#FFD23F',

  /** Kıvılcım maskotu */
  sparkBody: '#FFD23F',
  sparkStroke: '#C99A12',
  sparkFace: '#2A1B5E',
  sparkCheek: '#FF8FB0',
  sparkGlow: 'rgba(255,210,63,0.7)',

  /** Rozet (ör. "12 gün seri", güçlendirici sayısı) */
  badge: '#FFFFFF',
} as const;

/**
 * Her parça rengi üç tonla çizilir: üstte açık (geçiş başı), gövde, alt kenar (3B gölge).
 * Düğmeler de aynı üçlüleri kullanır.
 */
export interface Tone {
  light: string;
  base: string;
  edge: string;
}

export const tones: Record<PieceColor, Tone> = {
  pink: { light: '#FF8FB0', base: '#FF5C8A', edge: '#C93A66' },
  orange: { light: '#FFB870', base: '#FF9A3D', edge: '#CC6E1A' },
  yellow: { light: '#FFE27A', base: '#FFD23F', edge: '#C99A12' },
  green: { light: '#7AEBAD', base: '#3DDC84', edge: '#1FA85F' },
  blue: { light: '#7ACFFF', base: '#3DB8FF', edge: '#1B86C9' },
  purple: { light: '#C39BFF', base: '#A56BFF', edge: '#7440CC' },
};

/** Kilitli blok (DEVRE_TASKS 4.6): parça renklerinden ayrışan çelik ton; kafes ve kilit koyu. */
export const steel: Tone = { light: '#C9C3E6', base: '#9C93C9', edge: '#5B45B0' };
export const cage = { frame: '#2A1B5E', rivet: '#E8E4F8', badge: '#2A1B5E', lockIcon: '#FFD23F' } as const;

/** Anahtar (DEVRE_TASKS 4.6): koyu plaka, döner disk, dönüş oku ve bir sonraki yön izi. */
export const switchColors = {
  plate: '#241A55',
  plateEdge: '#151033',
  disc: '#3A2A7A',
  ring: '#A56BFF',
  arrow: '#FFD23F',
  nextWire: '#FFFFFF',
  nextOpacity: 0.32,
} as const;

/** Ana düğme yeşildir (DEVRE_TASKS 3.2). */
export const buttonTones = {
  primary: tones.green,
  daily: tones.yellow,
  secondary: tones.blue,
  icon: tones.purple,
  danger: tones.pink,
  accent: tones.orange,
} as const;

/** Logo harflerinin renk sırası: D E V R E */
export const logoTones: Tone[] = [tones.pink, tones.orange, tones.yellow, tones.green, tones.blue];

// Yazı tipleri (DEVRE_TASKS 3.3). Yükleme 3.3.1'de expo-font ile yapılacak.

export const fonts = {
  /** Başlık ve puan: kalın, yuvarlak */
  display: 'Baloo2_800ExtraBold',
  displaySemi: 'Baloo2_600SemiBold',
  /** Gövde */
  body: 'Nunito_700Bold',
  bodySemi: 'Nunito_600SemiBold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;

/** Tasarımdaki yazı ölçüleri (390 px ekran). */
export const type = {
  logo: 92,
  score: 44,
  praise: 46,
  primaryButton: 30,
  button: 22,
  stat: 26,
  floatingScore: 26,
  levelTitle: 24,
  tagline: 18,
  label: 11,
  levelLabel: 12,
  small: 13,
} as const;

import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

type Variant = 'display' | 'body' | 'label';

const base: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, color: colors.text, includeFontPadding: false },
  body: { fontFamily: fonts.body, color: colors.text },
  label: {
    fontFamily: fonts.bodyHeavy,
    color: colors.textSecondary,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
};

interface Props extends TextProps {
  variant?: Variant;
  size?: number;
  color?: string;
  /** Çizgi film etkisi: koyu alt gölge (DEVRE_TASKS 3.3). */
  shadow?: string | false;
  shadowY?: number;
}

/** Uygulamadaki tüm yazılar bu sarmalayıcıdan geçer (DEVRE_TASKS 3.3.1). */
export function DText({ variant = 'body', size, color, shadow, shadowY = 4, style, ...rest }: Props) {
  const s: TextStyle = {
    ...base[variant],
    ...(size ? { fontSize: size } : null),
    ...(size && variant === 'display' ? { lineHeight: Math.round(size * 1.1) } : null),
    ...(color ? { color } : null),
    ...(shadow
      ? { textShadowColor: shadow, textShadowOffset: { width: 0, height: shadowY }, textShadowRadius: 0.01 }
      : null),
  };
  return <Text allowFontScaling={false} {...rest} style={[s, style]} />;
}

import React, { ReactNode } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';

import { Tone, colors, tones } from '../theme/colors';
import { button as BTN } from '../theme/sizes';
import { DText } from './DText';
import { Icon, IconName } from './Icon';

function candySurface(tone: Tone, edge: number, pressed: boolean): ViewStyle {
  const drop = pressed ? Math.max(1, edge - 4) : edge;
  return {
    backgroundImage: `linear-gradient(180deg, ${tone.light} 0%, ${tone.base} 70%)`,
    boxShadow: `0 ${drop}px 0 ${tone.edge}, inset 0 2px 0 rgba(255,255,255,0.55)`,
    // Basınca 4 px aşağı iner (DEVRE_TASKS 3.7)
    transform: [{ translateY: edge - drop }],
  };
}

interface Props {
  label: string;
  tone: Tone;
  onPress: () => void;
  height?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
  badge?: ReactNode;
  accessibilityHint?: string;
}

/** İri, yuvarlak, alt kenarı koyu (3B basma hissi) düğme. */
export function CandyButton({
  label,
  tone,
  onPress,
  height = BTN.secondaryHeight,
  fontSize = 22,
  style,
  badge,
  accessibilityHint,
}: Props) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint={accessibilityHint} style={[{ width: '100%' }, style]}>
      {({ pressed }) => (
        <View style={[{ height, borderRadius: height / 2, alignItems: 'center', justifyContent: 'center' },
          candySurface(tone, BTN.edge, pressed)]}>
          <DText variant="display" size={fontSize} color={colors.textOnButton}>{label}</DText>
          {badge}
        </View>
      )}
    </Pressable>
  );
}

/** Yuvarlak ikon düğmesi (52 px). Tasarımdaki gibi sağ üstte sayı rozeti alabilir. */
export function RoundIconButton({
  icon,
  tone,
  onPress,
  label,
  size = BTN.iconSize,
  badge,
  disabled = false,
  active = false,
}: {
  icon: IconName;
  tone: Tone;
  onPress: () => void;
  label: string;
  size?: number;
  /** Sağ üstteki sayı (ör. güçlendirici adedi) */
  badge?: number;
  disabled?: boolean;
  /** Seçili/etkin: parlak halka */
  active?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }} hitSlop={4}>
      {({ pressed }) => (
        <View style={{ opacity: disabled ? 0.45 : 1 }}>
          <View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' },
            candySurface(tone, BTN.iconEdge, pressed),
            active && { boxShadow: `0 ${BTN.iconEdge}px 0 ${tone.edge}, 0 0 0 4px ${colors.starOn}, 0 0 16px 4px rgba(255,210,63,0.6)` }]}>
            <Icon name={icon} />
          </View>
          {badge !== undefined && (
            <View style={{ position: 'absolute', right: -6, top: -6, minWidth: 24, height: 24, paddingHorizontal: 6,
              borderRadius: 12, backgroundColor: colors.badge, alignItems: 'center', justifyContent: 'center' }}>
              <DText variant="display" size={14} color={colors.textOnButton}>{badge}</DText>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

/** HUD kutusu: küçük etiket + büyük değer. */
export function StatBox({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`}
      style={{ width: 84, height: 64, borderRadius: 18, backgroundColor: colors.panel, borderWidth: 3,
        borderColor: colors.panelBorder, alignItems: 'center', justifyContent: 'center' }}>
      <DText variant="label" size={11}>{label}</DText>
      <DText variant="display" size={26} numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: 72 }}
        color={alert ? tones.pink.light : undefined}>{value}</DText>
    </View>
  );
}

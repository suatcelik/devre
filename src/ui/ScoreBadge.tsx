// Puan rozeti (DEVRE_TASKS 3.7.1): sonuç panelinde puan sıfırdan sayar; rekorsa etiket çıkar.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, tones } from '../theme/colors';
import { DText } from './DText';
import { formatScore } from './format';

export function ScoreBadge({
  label,
  value,
  record = false,
  delay = 0,
  duration = 900,
  still = false,
}: {
  label: string;
  value: number;
  record?: boolean;
  delay?: number;
  duration?: number;
  still?: boolean;
}) {
  const shown = useSharedValue(still ? value : 0);
  const ribbon = useSharedValue(still ? 1 : 0);
  const [text, setText] = useState(still ? value : 0);

  useEffect(() => {
    if (still) return;
    shown.value = 0;
    shown.value = withDelay(delay, withTiming(value, { duration, easing: Easing.out(Easing.cubic) }));
    if (record) {
      ribbon.value = withDelay(
        delay + duration,
        withSequence(withTiming(1.25, { duration: 120 }), withSpring(1, { damping: 6 })),
      );
    }
  }, [value, record, delay, duration, still, shown, ribbon]);

  useAnimatedReaction(
    () => Math.round(shown.value),
    (v, prev) => {
      if (v !== prev) scheduleOnRN(setText, v);
    },
  );
  const ribbonStyle = useAnimatedStyle(() => ({
    opacity: ribbon.value > 0 ? 1 : 0,
    transform: [{ rotate: '-6deg' }, { scale: ribbon.value }],
  }));

  return (
    <View style={styles.badge} accessible accessibilityLabel={`${label}: ${value}${record ? ', yeni rekor' : ''}`}>
      <DText variant="label" size={12}>{label}</DText>
      <DText variant="display" size={48} shadow={colors.textShadow}>{formatScore(text)}</DText>
      {record && (
        <Animated.View style={[styles.ribbon, ribbonStyle]}>
          <DText variant="display" size={18} color={colors.text}>Yeni rekor!</DText>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 20,
    backgroundColor: colors.emptyCell,
    borderWidth: 3,
    borderColor: colors.panelBorder,
    boxShadow: 'inset 0 4px 0 rgba(0,0,0,0.25)',
  },
  ribbon: {
    position: 'absolute',
    right: -10,
    top: -14,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    backgroundImage: `linear-gradient(180deg, ${tones.pink.light} 0%, ${tones.pink.base} 70%)`,
    boxShadow: `0 4px 0 ${tones.pink.edge}`,
  },
});

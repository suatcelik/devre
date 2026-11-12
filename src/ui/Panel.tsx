import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { colors } from '../theme/colors';

/** Açılış süreleri: karartma ve pencere sakin bir hızla gelir, kapanış biraz daha kısa. */
const SCRIM_IN_MS = 300;
const SCRIM_OUT_MS = 220;
const POP_MS = 420;

/** Oyun sonu paneli yukarıdan düşer (DEVRE_TASKS 3.5 "Oyun sonu"). */
function dropIn() {
  'worklet';
  return {
    initialValues: { transform: [{ translateY: -700 }, { rotate: '-6deg' }] },
    animations: {
      transform: [
        { translateY: withSpring(0, { damping: 13, stiffness: 85 }) },
        { rotate: withDelay(180, withSpring('0deg', { damping: 8, stiffness: 90 })) },
      ],
    },
  };
}

/** Ayarlar, dükkân, mola: hafifçe aşağıdan büyüyerek ve belirerek gelir, küçük bir yaylanmayla oturur. */
function popIn() {
  'worklet';
  const ease = Easing.out(Easing.back(1.3));
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 28 }, { scale: 0.86 }] },
    animations: {
      opacity: withTiming(1, { duration: POP_MS * 0.6 }),
      transform: [
        { translateY: withTiming(0, { duration: POP_MS, easing: ease }) },
        { scale: withTiming(1, { duration: POP_MS, easing: ease }) },
      ],
    },
  };
}

/** Ekranı karartan, yaylanarak açılan yuvarlak köşeli panel (DEVRE_TASKS 3.7). */
export function Panel({ children, label, variant = 'zoom' }: { children: ReactNode; label: string; variant?: 'zoom' | 'drop' }) {
  return (
    <Animated.View entering={FadeIn.duration(SCRIM_IN_MS)} exiting={FadeOut.duration(SCRIM_OUT_MS)} style={styles.scrim}>
      <Animated.View entering={variant === 'drop' ? dropIn : popIn} accessibilityViewIsModal
        accessibilityLabel={label} style={styles.panel}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

export function PanelRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(21,16,51,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    backgroundColor: colors.panel,
    borderWidth: 4,
    borderColor: colors.panelBorder,
    boxShadow: `0 8px 0 rgba(0,0,0,0.3)`,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 16,
  },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
});

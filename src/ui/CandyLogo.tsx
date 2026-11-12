// Şeker tarzı "DEVRE" logosu: her harf ayrı renk, kabarık alt kenar, düşerek gelip arada bir hoplar (3.7.2).
// Ana ekran ve açılış ekranı aynı logoyu kullanır; uygulama ikonundaki yazı (scripts/generate-icons.mjs) da aynı düzende.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, logoTones } from '../theme/colors';
import { type } from '../theme/fonts';
import { DText } from './DText';

/** Harflerin tasarımdaki eğim ve kayması (92 px yazıda). */
const LETTERS = [
  { ch: 'D', rotate: -6, y: 0 },
  { ch: 'E', rotate: 3, y: -6 },
  { ch: 'V', rotate: -2, y: 2 },
  { ch: 'R', rotate: 4, y: -4 },
  { ch: 'E', rotate: -4, y: 2 },
];
const LETTER_STAGGER_MS = 90;
const LETTER_WAVE_EVERY_MS = 3200;

function Letter({ i, size, still, delay }: { i: number; size: number; still: boolean; delay: number }) {
  const l = LETTERS[i];
  const k = size / type.logo;
  const hop = useSharedValue(still ? 0 : -160 * k);
  const pop = useSharedValue(still ? 1 : 0.4);
  useEffect(() => {
    if (still) {
      hop.value = 0;
      pop.value = 1;
      return;
    }
    const at = delay + i * LETTER_STAGGER_MS;
    pop.value = withDelay(at, withSpring(1, { damping: 7, stiffness: 180 }));
    hop.value = withSequence(
      withDelay(at, withSpring(0, { damping: 9, stiffness: 160 })),
      withRepeat(
        withSequence(
          withDelay(LETTER_WAVE_EVERY_MS, withTiming(-14 * k, { duration: 140 })),
          withSpring(0, { damping: 6, stiffness: 220 }),
        ),
        -1,
      ),
    );
  }, [i, still, delay, k, hop, pop]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: l.y * k + hop.value }, { rotate: `${l.rotate}deg` }, { scale: pop.value }],
  }));
  return (
    <Animated.View style={style}>
      {/* Alt kenar: renk koyusu + gece rengi (çizgi film etkisi) */}
      <DText variant="display" size={size} color={colors.textShadow} style={[styles.layer, { top: 10 * k }]}>{l.ch}</DText>
      <DText variant="display" size={size} color={logoTones[i].edge} style={[styles.layer, { top: 6 * k }]}>{l.ch}</DText>
      <DText variant="display" size={size} color={logoTones[i].base}>{l.ch}</DText>
    </Animated.View>
  );
}

export function CandyLogo({ size = type.logo, still = false, delay = 0 }: {
  size?: number;
  /** Hareketi azalt: harfler yerinde durur */
  still?: boolean;
  /** Harflerin düşmeye başlamasından önceki bekleme (ms) */
  delay?: number;
}) {
  return (
    <View style={[styles.row, { gap: 2 * (size / type.logo) }]} accessible accessibilityRole="header" accessibilityLabel="Devre">
      {LETTERS.map((_, i) => (
        <Letter key={i} i={i} size={size} still={still} delay={delay} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  layer: { position: 'absolute', left: 0 },
});

// Açılış ekranı: yerel açılış görselinin (assets/splash-icon.png) canlanan hali.
// Işınlar açılır, Kıvılcım zıplayarak düşer, DEVRE harfleri sırayla hoplar, şeker çubuk dolar.
// Kayıtlı veriler yüklenip en kısa gösterim süresi dolunca ekran solarak kapanır.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, tones } from '../theme/colors';
import { CandyLogo } from '../ui/CandyLogo';
import { DText } from '../ui/DText';
import { Kivilcim } from '../ui/Kivilcim';
import { SparkleField, Sunburst } from '../ui/Sunburst';

/** En kısa gösterim: animasyon yarıda kesilmesin. Hareketi azaltınca daha kısa. */
const MIN_MS = 2100;
const MIN_MS_STILL = 900;
const FADE_MS = 280;
const BAR_W = 220;
const BAR_H = 22;

const SPARKLES = [
  [0.2, 0.26, 26],
  [0.82, 0.3, 18],
  [0.74, 0.16, 14],
  [0.14, 0.5, 14],
  [0.86, 0.52, 22],
] as const;

export function SplashIntro({ ready, reduceMotion, onDone }: {
  /** Kayıtlı veriler yüklendi mi */
  ready: boolean;
  reduceMotion: boolean;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [minElapsed, setMinElapsed] = useState(false);

  const rays = useSharedValue(reduceMotion ? 1 : 0);
  const drop = useSharedValue(reduceMotion ? 0 : -height * 0.6);
  const squash = useSharedValue(1);
  const bar = useSharedValue(0);
  const fade = useSharedValue(1);
  const tagline = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    const min = reduceMotion ? MIN_MS_STILL : MIN_MS;
    if (!reduceMotion) {
      rays.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.4)) });
      drop.value = withDelay(120, withSpring(0, { damping: 10, stiffness: 130 }));
      // Yere değince ezilip toparlanır
      squash.value = withDelay(430, withSequence(
        withTiming(0.82, { duration: 90 }),
        withSpring(1, { damping: 5, stiffness: 260 }),
      ));
      tagline.value = withDelay(1050, withTiming(1, { duration: 300 }));
    }
    bar.value = withTiming(0.85, { duration: min - 200, easing: Easing.out(Easing.cubic) });
    const t = setTimeout(() => setMinElapsed(true), min);
    return () => clearTimeout(t);
  }, [reduceMotion, rays, drop, squash, bar, tagline]);

  useEffect(() => {
    if (!ready || !minElapsed) return;
    bar.set(withTiming(1, { duration: 160 }));
    fade.set(withDelay(160, withTiming(0, { duration: FADE_MS }, (finished) => {
      if (finished) scheduleOnRN(onDone);
    })));
  }, [ready, minElapsed, bar, fade, onDone]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const raysStyle = useAnimatedStyle(() => ({ opacity: rays.value, transform: [{ scale: 0.4 + 0.6 * rays.value }] }));
  const sparkyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }, { scaleY: squash.value }, { scaleX: 2 - squash.value }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: Math.max(8, (BAR_W - 14) * bar.value) }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value }));

  const cy = height * 0.4;
  return (
    <Animated.View style={[styles.root, rootStyle]} accessibilityLabel="Devre yükleniyor">
      <Animated.View style={[StyleSheet.absoluteFill, raysStyle]}>
        <Sunburst cx={width / 2} cy={cy} radius={Math.max(width, height) * 0.62} still={reduceMotion} />
      </Animated.View>
      <SparkleField width={width} height={height} points={SPARKLES} still={reduceMotion} />
      <View style={[styles.center, { top: cy - 95 }]}>
        <Animated.View style={sparkyStyle}>
          <Kivilcim width={130} mood="happy" />
        </Animated.View>
        <View style={styles.logo}>
          <CandyLogo size={78} still={reduceMotion} delay={420} />
        </View>
        <Animated.View style={taglineStyle}>
          <DText size={18} color={colors.textSecondary}>Karanlık şehri aydınlat</DText>
        </Animated.View>
      </View>
      <View style={[styles.barWrap, { bottom: insets.bottom + 64 }]}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]}>
            <View style={styles.gloss} />
          </Animated.View>
        </View>
        <DText variant="label" size={12} style={styles.loading}>Işıklar yanıyor…</DText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bgTop,
    backgroundImage: `radial-gradient(circle at 50% 40%, #4A2A9A 0%, ${colors.bgTop} 55%, ${colors.bgBottom} 100%)`,
  },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 6 },
  logo: { marginTop: 8, marginBottom: 6 },
  barWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 10 },
  track: {
    width: BAR_W,
    height: BAR_H,
    borderRadius: BAR_H / 2,
    padding: 4,
    backgroundColor: colors.progressTrack,
    borderWidth: 3,
    borderColor: colors.panelBorder,
    boxShadow: '0 4px 0 rgba(0,0,0,0.3)',
    justifyContent: 'center',
  },
  fill: {
    height: BAR_H - 14,
    borderRadius: (BAR_H - 14) / 2,
    backgroundImage: `linear-gradient(180deg, ${tones.pink.light} 0%, ${tones.pink.base} 70%)`,
    overflow: 'hidden',
  },
  gloss: { height: 3, marginHorizontal: 4, marginTop: 1, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)' },
  loading: { letterSpacing: 1.2 },
});

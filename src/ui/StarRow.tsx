// Yıldız sırası (DEVRE_TASKS 3.7.1): kazanılan yıldızlar tek tek "çat" diye yerine oturur (3.7.4).
import { BlurMask, Canvas, Group, Path } from '@shopify/react-native-skia';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { STAR_RING_MS, STAR_SLAM_FROM, STAR_SLAM_MS } from '../anim/constants';
import { colors } from '../theme/colors';
import { DText } from './DText';

/** Tasarımdaki yıldız (24x24 ızgara) */
const STAR = 'M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.9z';

export function StarIcon({ size, on }: { size: number; on: boolean }) {
  const pad = size * 0.25;
  const k = size / 24;
  return (
    <Canvas style={{ width: size + 2 * pad, height: size + 2 * pad, margin: -pad }} pointerEvents="none">
      <Group transform={[{ translateX: pad }, { translateY: pad }, { scale: k }]}>
        {on && (
          <Path path={STAR} color={colors.wireGlow} opacity={0.6}>
            <BlurMask blur={3} style="normal" />
          </Path>
        )}
        <Path path={STAR} color={on ? colors.starOn : colors.starOff} />
        <Path path={STAR} color={on ? colors.starOnStroke : colors.starOffStroke} style="stroke" strokeWidth={1.5}
          strokeJoin="round" />
        {on && <Path path="M8.6 8.6 L11 7.2" color="white" opacity={0.7} style="stroke" strokeWidth={1.6} strokeCap="round" />}
      </Group>
    </Canvas>
  );
}

function SlamStar({ size, on, at, still }: { size: number; on: boolean; at: number; still: boolean }) {
  const scale = useSharedValue(on && !still ? STAR_SLAM_FROM : 1);
  const opacity = useSharedValue(on && !still ? 0 : 1);
  const rot = useSharedValue(on && !still ? -28 : 0);
  const ring = useSharedValue(0);

  useEffect(() => {
    if (!on || still) return;
    opacity.value = withDelay(at, withTiming(1, { duration: 60 }));
    scale.value = withDelay(
      at,
      withSequence(
        withTiming(0.8, { duration: STAR_SLAM_MS, easing: Easing.in(Easing.quad) }),
        withSpring(1, { damping: 5, stiffness: 260 }),
      ),
    );
    rot.value = withDelay(at, withTiming(0, { duration: STAR_SLAM_MS, easing: Easing.in(Easing.quad) }));
    ring.value = withDelay(at + STAR_SLAM_MS, withTiming(1, { duration: STAR_RING_MS, easing: Easing.out(Easing.cubic) }));
  }, [on, at, still, scale, opacity, rot, ring]);

  const starStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value > 0 && ring.value < 1 ? 1 - ring.value : 0,
    transform: [{ scale: 0.6 + ring.value * 1.3 }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Boş yuva her zaman görünür; kazanılan yıldız üstüne oturur. */}
      <View style={StyleSheet.absoluteFill}>
        <StarIcon size={size} on={false} />
      </View>
      {on && (
        <>
          <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, ringStyle]} />
          <Animated.View style={[StyleSheet.absoluteFill, starStyle]}>
            <StarIcon size={size} on />
          </Animated.View>
        </>
      )}
    </View>
  );
}

export interface StarSlot {
  label: string;
  met: boolean;
}

/**
 * Üç yıldız; ortadaki daha büyük ve yukarıda.
 * `times[i]`: i. yıldızın oturduğu an (ms); kazanılmayan yıldız için yok sayılır.
 */
export function StarRow({ stars, times, still = false }: { stars: StarSlot[]; times: number[]; still?: boolean }) {
  return (
    <View style={styles.row} accessible
      accessibilityLabel={`${stars.filter((s) => s.met).length} yıldız: ${stars.map((s) => `${s.label} ${s.met ? 'tamam' : 'eksik'}`).join(', ')}`}>
      {stars.map((s, i) => {
        const big = i === 1;
        return (
          <View key={i} style={[styles.col, big && styles.raised]}>
            <SlamStar size={big ? 68 : 52} on={s.met} at={times[i]} still={still} />
            <DText variant="label" size={10} color={s.met ? colors.text : colors.textSecondary}
              style={styles.label} numberOfLines={2}>
              {s.label}
            </DText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10 },
  col: { width: 88, alignItems: 'center', gap: 6 },
  raised: { marginBottom: 14 },
  label: { textAlign: 'center', letterSpacing: 0.4 },
  ring: { position: 'absolute', borderWidth: 4, borderColor: colors.starOn },
});

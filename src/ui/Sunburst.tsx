// Şeker tarzı ödül ışığı: merkezden dışa açılan, kenara doğru sönen, yavaşça dönen ışınlar
// ve göz kırpan dört köşeli parıltılar. Açılış ve tanıtım ekranlarında kullanılır.
import { Canvas, Circle, Group, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Işın renkleri: açık leylak, ortada sıcak sarı parlama */
const RAY = 'rgba(227,184,255,0.34)';
const CORE = 'rgba(255,210,63,0.45)';
const SPIN_MS = 24000;

/** Merkezi (cx, cy), yarıçapı `radius` olan ışın demeti. `still`: dönmez. */
export function Sunburst({ cx, cy, radius, count = 14, still = false, core = true }: {
  cx: number;
  cy: number;
  radius: number;
  count?: number;
  still?: boolean;
  /** Ortadaki sıcak parlama */
  core?: boolean;
}) {
  const path = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const a0 = i * step - step * 0.25;
      const a1 = a0 + step * 0.5;
      b.moveTo(cx, cy);
      b.lineTo(cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius);
      b.lineTo(cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius);
      b.close();
    }
    return b.detach();
  }, [cx, cy, radius, count]);

  const spin = useSharedValue(0);
  useEffect(() => {
    if (still) {
      cancelAnimation(spin);
      return;
    }
    spin.value = withRepeat(withTiming(Math.PI * 2, { duration: SPIN_MS, easing: Easing.linear }), -1);
    return () => cancelAnimation(spin);
  }, [still, spin]);
  const transform = useDerivedValue(() => [{ rotate: spin.value }]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group transform={transform} origin={vec(cx, cy)}>
        <Path path={path}>
          <RadialGradient c={vec(cx, cy)} r={radius} colors={[RAY, 'rgba(227,184,255,0)']} />
        </Path>
      </Group>
      {core && (
        <Circle cx={cx} cy={cy} r={radius * 0.55}>
          <RadialGradient c={vec(cx, cy)} r={radius * 0.55} colors={[CORE, 'rgba(255,210,63,0)']} />
        </Circle>
      )}
    </Canvas>
  );
}

/** Dört köşeli parıltının yolu (merkez 0,0, yarıçap 1). */
const SPARKLE_PATH = 'M0 -1 Q0.22 -0.22 1 0 Q0.22 0.22 0 1 Q-0.22 0.22 -1 0 Q-0.22 -0.22 0 -1 Z';

/** Göz kırpan parıltı: büyüyüp küçülür, hafifçe döner. */
export function Sparkle({ x, y, size, delay = 0, still = false, color = 'white' }: {
  x: number;
  y: number;
  size: number;
  delay?: number;
  still?: boolean;
  color?: string;
}) {
  const t = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) {
      t.value = 1;
      return;
    }
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.out(Easing.back(2)) }),
          withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(t);
  }, [delay, still, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * t.value,
    transform: [{ scale: 0.4 + 0.6 * t.value }, { rotate: `${t.value * 25}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.sparkle, { left: x - size / 2, top: y - size / 2, width: size, height: size }, style]}>
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ translateX: size / 2 }, { translateY: size / 2 }, { scale: size / 2 }]}>
          <Path path={SPARKLE_PATH} color={color} />
        </Group>
      </Canvas>
    </Animated.View>
  );
}

/** Bir sahnenin parıltıları: konumlar kutuya oranla verilir. */
export function SparkleField({ width, height, points, still = false }: {
  width: number;
  height: number;
  /** [x, y, boy(px)] ; x, y 0..1 */
  points: readonly (readonly [number, number, number])[];
  still?: boolean;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {points.map(([px, py, s], i) => (
        <Sparkle key={i} x={px * width} y={py * height} size={s} delay={i * 260} still={still} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sparkle: { position: 'absolute' },
});

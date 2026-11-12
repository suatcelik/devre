// Tahta dışındaki animasyonlar (DEVRE_TASKS 3.5.5–3.5.8).
import React, { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  PRAISE_MS,
  PRAISE_WOBBLE_DEG,
  SCORE_FLY_MS,
  SCORE_ROLL_MS,
  SCREEN_FLASH_IN_MS,
  SCREEN_FLASH_OUT_MS,
  SCREEN_FLASH_PEAK,
  SHAKE_MS,
  SHAKE_PX,
} from '../../anim/constants';
import type { ScorePop } from '../../anim/timeline';
import { BoardLayout, cellOrigin } from '../../render/layout';
import { colors } from '../../theme/colors';
import { DText } from '../../ui/DText';
import { formatScore } from '../../ui/format';

/** Puan sayacı: puanlar gelince yuvarlanarak artar ve hafifçe zıplar (3.5.6). */
export function ScoreCounter({ value, from, delay, playId }: { value: number; from: number; delay: number; playId: number }) {
  const shown = useSharedValue(value);
  const bump = useSharedValue(1);
  const [text, setText] = useState(value);

  useEffect(() => {
    shown.value = from;
    shown.value = withDelay(delay, withTiming(value, { duration: from === value ? 0 : SCORE_ROLL_MS, easing: Easing.out(Easing.cubic) }));
    if (from !== value) {
      bump.value = withDelay(delay, withSequence(withTiming(1.18, { duration: 90 }), withSpring(1, { damping: 7 })));
    }
  }, [value, from, delay, playId, shown, bump]);

  useAnimatedReaction(
    () => Math.round(shown.value),
    (v, prev) => {
      if (v !== prev) scheduleOnRN(setText, v);
    },
  );
  const style = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  return (
    <Animated.View style={style}>
      <DText variant="display" size={44} shadow={colors.textShadow} accessibilityLabel={`Puan ${value}`}>
        {formatScore(text)}
      </DText>
    </Animated.View>
  );
}

const FLY_W = 180;
const FLY_H = 44;

/** Patlayan yerden puan yukarı uçar ve üstteki puana katılır (3.5.6). */
export function FlyingScore({
  pop,
  layout,
  boardOrigin,
  scoreTarget,
}: {
  pop: ScorePop;
  layout: BoardLayout;
  boardOrigin: SharedValue<{ x: number; y: number }>;
  scoreTarget: SharedValue<{ x: number; y: number }>;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(pop.at, withTiming(1, { duration: SCORE_FLY_MS, easing: Easing.linear }));
  }, [p, pop.at]);

  const o = cellOrigin(layout, pop.from.r, pop.from.c);
  const fx = o.x + layout.cell / 2;
  const fy = o.y + layout.cell / 2;
  const style = useAnimatedStyle(() => {
    const k = p.value;
    const sx = boardOrigin.value.x + fx;
    const sy = boardOrigin.value.y + fy - 30;
    const tx = scoreTarget.value.x;
    const ty = scoreTarget.value.y;
    // İlk %30: yerinde büyüyerek yükselir; sonra puana doğru hızlanarak uçar.
    const rise = Math.min(k / 0.3, 1);
    const f = k < 0.3 ? 0 : (k - 0.3) / 0.7;
    const fly = f * f;
    const x = sx + (tx - sx) * fly;
    const y = sy + 30 * (1 - rise) + (ty - sy) * fly;
    return {
      opacity: k <= 0 || k >= 1 ? 0 : 1,
      transform: [
        { translateX: x - FLY_W / 2 },
        { translateY: y - FLY_H / 2 },
        { scale: 0.5 + 0.8 * Math.sin(rise * Math.PI * 0.5) - 0.6 * fly },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.flyer, style]}>
      <DText variant="display" size={32} shadow={colors.textShadow} shadowY={3}>+{formatScore(pop.amount)}</DText>
    </Animated.View>
  );
}

/** Övgü yazısı büyüyerek gelir, sallanır, kaybolur (3.5.7). */
export function Praise({ text, combo, at }: { text: string | null; combo: number; at: number }) {
  const scale = useSharedValue(0);
  const rot = useSharedValue(-4);
  const opacity = useSharedValue(1);
  useEffect(() => {
    scale.value = withDelay(at, withSpring(1, { damping: 7, stiffness: 220 }));
    const w = PRAISE_WOBBLE_DEG;
    rot.value = withDelay(
      at + 120,
      withSequence(
        withTiming(w - 4, { duration: 90 }),
        withTiming(-w - 4, { duration: 120 }),
        withTiming(w / 2 - 4, { duration: 100 }),
        withTiming(-4, { duration: 100 }),
      ),
    );
    opacity.value = withDelay(at + PRAISE_MS, withTiming(0, { duration: 220 }));
  }, [at, scale, rot, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.praise, style]} accessibilityLiveRegion="polite">
      {text && (
        <DText variant="display" size={text.length > 10 ? 34 : 40} color={colors.starOn} shadow={colors.praiseShadow}>
          {text}
        </DText>
      )}
      {combo > 1 && (
        <View style={styles.combo}>
          <DText variant="display" size={18} color={colors.textOnButton}>Kombo x{combo}</DText>
        </View>
      )}
    </Animated.View>
  );
}

/** Kıvılcım devre tamamlanınca zıplar (3.5.8). */
export function Bouncer({ playId, at, children }: { playId: number; at: number | null; children: ReactNode }) {
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  useEffect(() => {
    if (at === null) return;
    scale.value = withDelay(at, withSequence(withTiming(1.3, { duration: 110 }), withSpring(1, { damping: 6 })));
    lift.value = withDelay(at, withSequence(withTiming(-14, { duration: 140 }), withSpring(0, { damping: 7 })));
  }, [playId, at, scale, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }, { scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Lamba yanınca kısa ekran parlaması ve uzun devrede ekran sarsıntısı (3.5.5). */
export function useScreenFx(playId: number | null, lampAt: number | null, shakeAt: number | null, enabled: boolean) {
  const flash = useSharedValue(0);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (playId === null || !enabled) return;
    if (lampAt !== null) {
      flash.value = withDelay(
        lampAt,
        withSequence(
          withTiming(SCREEN_FLASH_PEAK, { duration: SCREEN_FLASH_IN_MS }),
          withTiming(0, { duration: SCREEN_FLASH_OUT_MS }),
        ),
      );
    }
    if (shakeAt !== null) {
      const step = SHAKE_MS / 5;
      shake.value = withDelay(
        shakeAt,
        withSequence(
          withTiming(SHAKE_PX, { duration: step }),
          withTiming(-SHAKE_PX, { duration: step }),
          withTiming(SHAKE_PX * 0.6, { duration: step }),
          withTiming(-SHAKE_PX * 0.6, { duration: step }),
          withTiming(0, { duration: step }),
        ),
      );
    }
  }, [playId, lampAt, shakeAt, enabled, flash, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }, { translateY: shake.value * 0.5 }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  return { shakeStyle, flashStyle };
}

export function ScreenFlash({ style }: { style: ReturnType<typeof useAnimatedStyle> }) {
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, style]} />;
}

const styles = StyleSheet.create({
  flyer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: FLY_W,
    height: FLY_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  praise: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  combo: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.badge,
    justifyContent: 'center',
    boxShadow: '0 3px 0 rgba(0,0,0,0.25)',
  },
  flash: { backgroundColor: colors.lampLit },
});

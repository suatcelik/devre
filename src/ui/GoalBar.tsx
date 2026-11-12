// Oyun ekranındaki hedef çubuğu (DEVRE_TASKS 3.7.3): puanın altında, tasarımdaki gibi
// üç yıldızlı ilerleme çubuğu. Çubuk rekora doğru dolar; yıldızlar oyun sonu hedefleri
// tutturuldukça yanar.
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

import { haptic } from '../audio/haptics';
import { SfxName, playSfx } from '../audio/sound';
import { colors } from '../theme/colors';
import { hud } from '../theme/sizes';
import { StarIcon } from './StarRow';

const STAR = 22;
const STAR_SFX: SfxName[] = ['star1', 'star2', 'star3'];
/** Tasarımdaki yıldız konumları (150 px çubukta 30, 82, 132) */
const STAR_X = [30, 82, 132].map((x) => x / 150);

function GoalStar({ index, on, delay, still }: { index: number; on: boolean; delay: number; still: boolean }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!on) return;
    // Hedef tutturulunca yıldız, puan sayaca vardığı anda sıçrar ve çınlar.
    const t = setTimeout(() => {
      playSfx(STAR_SFX[index]);
      haptic('place');
    }, delay);
    if (!still) {
      scale.value = withDelay(delay, withSequence(withTiming(1.7, { duration: 120 }), withSpring(1, { damping: 5 })));
    }
    return () => clearTimeout(t);
    // Yalnızca yıldız yandığında; gecikme değişimi yeniden çaldırmamalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <StarIcon size={STAR} on={on} />
    </Animated.View>
  );
}

export function GoalBar({
  progress,
  stars,
  labels,
  delay,
  still,
}: {
  /** 0..1 */
  progress: number;
  stars: boolean[];
  labels: string[];
  /** Puan uçup sayaca vardığında dolsun */
  delay: number;
  still: boolean;
}) {
  const fill = useSharedValue(progress);
  useEffect(() => {
    fill.value = still
      ? progress
      : withDelay(delay, withTiming(progress, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [progress, delay, still, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, fill.value)) * 100}%` }));

  const met = stars.filter(Boolean).length;
  return (
    <View style={styles.wrap} accessible
      accessibilityLabel={`Hedef: ${met}/3 yıldız. ${labels.map((l, i) => `${l} ${stars[i] ? 'tamam' : 'eksik'}`).join(', ')}`}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      {stars.map((on, i) => (
        <View key={i} style={[styles.star, { left: STAR_X[i] * hud.progressWidth - STAR / 2 }]}>
          <GoalStar index={i} on={on} delay={delay} still={still} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: hud.progressWidth, height: hud.progressHeight, marginTop: 4 },
  track: {
    width: '100%',
    height: hud.progressHeight,
    borderRadius: hud.progressHeight / 2,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: hud.progressHeight / 2,
    backgroundImage: `linear-gradient(180deg, ${colors.progressFillTop}, ${colors.progressFill})`,
  },
  star: { position: 'absolute', top: -5 },
});

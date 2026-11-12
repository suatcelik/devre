// Altın: parlak sarı jeton, ortasında kıvılcım çizgisi. Para göstergesi ve dükkân fiyatlarında kullanılır.
import { Canvas, Circle, Group, LinearGradient, Path, vec } from '@shopify/react-native-skia';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, tones } from '../theme/colors';
import { DText } from './DText';
import { formatScore } from './format';
import { Icon } from './Icon';

const BOLT = 'M13 5L8.5 12.5h3.5l-1 6.5 5-8h-3.5z';

export function Coin({ size = 24 }: { size?: number }) {
  const r = size / 2;
  const k = size / 24;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Circle cx={r} cy={r + k} r={r - k} color={tones.yellow.edge} />
      <Circle cx={r} cy={r} r={r - k}>
        <LinearGradient start={vec(0, 0)} end={vec(0, size)} colors={[tones.yellow.light, tones.yellow.base]} />
      </Circle>
      <Circle cx={r} cy={r} r={r - 4 * k} color={tones.yellow.edge} style="stroke" strokeWidth={1.5 * k} opacity={0.6} />
      <Group transform={[{ scale: k }]}>
        <Path path={BOLT} color={tones.yellow.edge} />
      </Group>
      <Circle cx={r * 0.62} cy={r * 0.55} r={2 * k} color="white" opacity={0.8} />
    </Canvas>
  );
}

/** Altın göstergesi: koyu hap içinde jeton ve miktar. `onPress` verilirse sağda "+" ile dükkânı açar. */
export function CoinBadge({ coins, onPress }: { coins: number; onPress?: () => void }) {
  const body = (
    <View style={styles.badge}>
      <Coin size={26} />
      <DText variant="display" size={20} style={styles.amount}>{formatScore(coins)}</DText>
      {onPress && (
        <View style={styles.plus}>
          <Icon name="plus" size={16} color={colors.textOnButton} />
        </View>
      )}
    </View>
  );
  if (!onPress) return <View accessible accessibilityLabel={`${coins} altın`}>{body}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${coins} altın. Dükkânı aç`} hitSlop={6}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 40,
    paddingLeft: 6,
    paddingRight: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.panel,
    borderWidth: 3,
    borderColor: colors.panelBorder,
    boxShadow: '0 4px 0 rgba(0,0,0,0.3)',
  },
  amount: { minWidth: 28, paddingRight: 4 },
  plus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: `linear-gradient(180deg, ${tones.green.light} 0%, ${tones.green.base} 70%)`,
    boxShadow: `0 2px 0 ${tones.green.edge}`,
  },
});

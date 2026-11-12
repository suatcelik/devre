import { Canvas, Circle, Group, Oval, Path, Shadow } from '@shopify/react-native-skia';
import React from 'react';

import { colors } from '../theme/colors';

export type Mood = 'idle' | 'happy' | 'surprised' | 'sad';

const BODY = 'M50 6 C58 26 84 40 84 66 A34 34 0 0 1 16 66 C16 40 42 26 50 6 Z';

const LABELS: Record<Mood, string> = {
  idle: 'Kıvılcım bekliyor',
  happy: 'Kıvılcım seviniyor',
  surprised: 'Kıvılcım şaşırdı',
  sad: 'Kıvılcım üzgün',
};

/** Maskot "Kıvılcım": yuvarlak, gözlü bir ışık damlası (DEVRE_TASKS 3.1). 100x110 tasarım ızgarası. */
export function Kivilcim({ width, mood = 'idle' }: { width: number; mood?: Mood }) {
  const k = width / 100;
  const height = 110 * k;
  const pad = 16 * k; // parlama için kenar payı
  const face = colors.sparkFace;
  return (
    <Canvas style={{ width: width + 2 * pad, height: height + 2 * pad, margin: -pad }}
      accessibilityRole="image" accessibilityLabel={LABELS[mood]}>
      <Group transform={[{ translateX: pad }, { translateY: pad }, { scale: k }]}>
        <Path path={BODY} color={colors.sparkBody}>
          <Shadow dx={0} dy={0} blur={12} color={colors.sparkGlow} />
        </Path>
        <Path path={BODY} color={colors.sparkStroke} style="stroke" strokeWidth={3} />
        <Oval x={29} y={39} width={14} height={22} color="white" opacity={0.5} />
        {mood === 'sad' ? (
          <>
            <Path path="M34 68 Q40 63 46 68" style="stroke" strokeWidth={3.5} strokeCap="round" color={face} />
            <Path path="M54 68 Q60 63 66 68" style="stroke" strokeWidth={3.5} strokeCap="round" color={face} />
          </>
        ) : (
          <>
            <Oval x={35} y={mood === 'surprised' ? 58 : 61} width={10} height={mood === 'surprised' ? 16 : 14} color={face} />
            <Oval x={55} y={mood === 'surprised' ? 58 : 61} width={10} height={mood === 'surprised' ? 16 : 14} color={face} />
            <Circle cx={42} cy={65} r={2} color="white" />
            <Circle cx={62} cy={65} r={2} color="white" />
          </>
        )}
        {mood === 'idle' && (
          <Path path="M41 81 Q50 91 59 81" style="stroke" strokeWidth={3} strokeCap="round" color={face} />
        )}
        {mood === 'happy' && <Path path="M39 79 Q50 97 61 79 Z" color={face} />}
        {mood === 'surprised' && <Oval x={45} y={80} width={10} height={12} color={face} />}
        {mood === 'sad' && (
          <Path path="M41 88 Q50 79 59 88" style="stroke" strokeWidth={3} strokeCap="round" color={face} />
        )}
        <Circle cx={29} cy={79} r={4.5} color={colors.sparkCheek} />
        <Circle cx={71} cy={79} r={4.5} color={colors.sparkCheek} />
      </Group>
    </Canvas>
  );
}

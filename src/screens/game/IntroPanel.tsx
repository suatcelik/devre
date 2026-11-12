// Yeni öğe tanıtımı (DEVRE_TASKS 4.6): bölüm başında kısa açıklama ve öğenin kendisi.
import { Canvas } from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { E, S, W } from '../../game/types';
import type { LevelData } from '../../levels';
import { BlockCell, LampCell, SwitchCell } from '../../render/cells';
import { buttonTones, colors, tones } from '../../theme/colors';
import { CandyButton } from '../../ui/CandyButton';
import { DText } from '../../ui/DText';
import { Panel } from '../../ui/Panel';

const CELL = 64;
type Intro = NonNullable<LevelData['intro']>;

/** Tanıtılan öğenin küçük çizimi */
function Sample({ icon }: { icon: Intro['icon'] }) {
  if (icon === 'switch') {
    return (
      <Canvas style={{ width: CELL, height: CELL * 1.12 }}>
        <SwitchCell x={0} y={0} size={CELL} wires={E | W} />
      </Canvas>
    );
  }
  if (icon === 'doubleLamp') {
    const gap = 16;
    return (
      <Canvas style={{ width: CELL * 2 + gap, height: CELL }}>
        <LampCell x={0} y={0} size={CELL} dir={S} lit />
        <LampCell x={CELL + gap} y={0} size={CELL} dir={S} lit />
      </Canvas>
    );
  }
  return (
    <Canvas style={{ width: CELL, height: CELL * 1.12 }}>
      <BlockCell x={0} y={0} size={CELL} tone={tones.blue} wires={E | W} locked />
    </Canvas>
  );
}

const LABELS: Record<Intro['icon'], string> = {
  locked: 'Kilitli blok örneği',
  doubleLamp: 'Yanan iki lamba',
  switch: 'Döner anahtar örneği',
};

export function IntroPanel({ intro, onClose }: { intro: Intro; onClose: () => void }) {
  return (
    <Panel label={intro.title}>
      <DText variant="display" size={30} color={colors.starOn} shadow={colors.praiseShadow} style={styles.center}>
        {intro.title}
      </DText>
      <View style={styles.sample} accessible accessibilityRole="image" accessibilityLabel={LABELS[intro.icon]}>
        <Sample icon={intro.icon} />
      </View>
      <DText size={17} color={colors.textSecondary} style={styles.center}>{intro.text}</DText>
      <CandyButton label="Anladım" tone={buttonTones.primary} height={56} fontSize={24} onPress={onClose} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  sample: { padding: 8 },
});

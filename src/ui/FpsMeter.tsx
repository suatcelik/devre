// Geliştirme FPS göstergesi (DEVRE_TASKS 3.8.1): gerçek telefonda 60 FPS ölçümü için.
// UI iş parçacığı (animasyonlar, Skia) ve JS iş parçacığı (oyun mantığı, React) ayrı ölçülür.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors } from '../theme/colors';
import { DText } from './DText';

const WINDOW_MS = 500;
/** 60 FPS'te bir kare */
const FRAME_BUDGET_MS = 1000 / 60;

interface Stats {
  fps: number;
  worst: number;
  dropped: number;
}

const empty: Stats = { fps: 0, worst: 0, dropped: 0 };

export function FpsMeter() {
  const [ui, setUi] = useState<Stats>(empty);
  const [js, setJs] = useState<Stats>(empty);

  // UI iş parçacığı: her karede çalışan geri çağrı.
  const acc = useSharedValue({ frames: 0, elapsed: 0, worst: 0, dropped: 0 });
  useFrameCallback((info) => {
    const dt = info.timeSincePreviousFrame ?? 0;
    const a = acc.value;
    a.frames += 1;
    a.elapsed += dt;
    a.worst = Math.max(a.worst, dt);
    if (dt > FRAME_BUDGET_MS * 1.5) a.dropped += 1;
    if (a.elapsed >= WINDOW_MS) {
      scheduleOnRN(setUi, { fps: Math.round((a.frames * 1000) / a.elapsed), worst: Math.round(a.worst), dropped: a.dropped });
      acc.value = { frames: 0, elapsed: 0, worst: 0, dropped: 0 };
    } else {
      acc.value = a;
    }
  });

  // JS iş parçacığı: requestAnimationFrame döngüsü.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let elapsed = 0;
    let worst = 0;
    let dropped = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      frames += 1;
      elapsed += dt;
      worst = Math.max(worst, dt);
      if (dt > FRAME_BUDGET_MS * 1.5) dropped += 1;
      if (elapsed >= WINDOW_MS) {
        setJs({ fps: Math.round((frames * 1000) / elapsed), worst: Math.round(worst), dropped });
        frames = 0;
        elapsed = 0;
        worst = 0;
        dropped = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const row = (label: string, s: Stats) => (
    <DText size={11} color={s.fps >= 55 ? colors.text : s.fps >= 45 ? colors.starOn : colors.praiseShadow}>
      {label} {s.fps} fps · en kötü {s.worst} ms · {s.dropped} atlama
    </DText>
  );

  return (
    <View style={styles.box} pointerEvents="none">
      {row('UI', ui)}
      {row('JS', js)}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
});

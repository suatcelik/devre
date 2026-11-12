// Konfeti (DEVRE_TASKS 3.7.4): tek Skia tuvalinde, renk başına tek yol; değerler UI iş parçacığında.
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Easing, SharedValue, useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { CONFETTI_MS } from '../anim/constants';
import { createRng } from '../game/rng';
import { colors, tones } from '../theme/colors';

interface Piece {
  x: number;
  y: number;
  vy: number;
  sway: number;
  swayHz: number;
  phase: number;
  w: number;
  h: number;
  angle: number;
  spin: number;
  flipHz: number;
}

const COLORS = [tones.pink.base, tones.orange.base, tones.yellow.base, tones.green.base, tones.blue.base, tones.purple.base, colors.text];
const FADE_MS = 500;

function ConfettiLayer({ pieces, color, t }: { pieces: Piece[]; color: string; t: SharedValue<number> }) {
  const path = useDerivedValue(() => {
    const b = Skia.PathBuilder.Make();
    const ms = t.value;
    const s = ms / 1000;
    const fade = Math.min(1, Math.max(0, (CONFETTI_MS - ms) / FADE_MS));
    if (ms <= 0 || fade <= 0) return b.detach();
    for (let i = 0; i < pieces.length; i++) {
      const q = pieces[i];
      const cx = q.x + q.sway * Math.sin(q.swayHz * s * Math.PI * 2 + q.phase);
      const cy = q.y + q.vy * s;
      const a = q.angle + q.spin * s;
      // Kağıt dönerken incelir: 3B çırpınma hissi
      const hw = (q.w / 2) * Math.abs(Math.cos(q.flipHz * s * Math.PI * 2 + q.phase)) * fade + 0.5;
      const hh = (q.h / 2) * fade;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      b.moveTo(cx + -hw * c - -hh * sn, cy + -hw * sn + -hh * c);
      b.lineTo(cx + hw * c - -hh * sn, cy + hw * sn + -hh * c);
      b.lineTo(cx + hw * c - hh * sn, cy + hw * sn + hh * c);
      b.lineTo(cx + -hw * c - hh * sn, cy + -hw * sn + hh * c);
      b.close();
    }
    return b.detach();
  });
  return <Path path={path} color={color} />;
}

export function Confetti({ count, delay = 0, seed = 1 }: { count: number; delay?: number; seed?: number }) {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withDelay(delay, withTiming(CONFETTI_MS, { duration: CONFETTI_MS, easing: Easing.linear }));
  }, [delay, t]);

  const layers = useMemo(() => {
    const rng = createRng(seed);
    const byColor: Piece[][] = COLORS.map(() => []);
    for (let i = 0; i < count; i++) {
      byColor[i % COLORS.length].push({
        x: rng.next() * width,
        // Yukarıda kademeli başlar; hepsi aynı anda düşmez.
        y: -20 - rng.next() * height * 0.6,
        vy: height * (0.28 + rng.next() * 0.22),
        sway: 10 + rng.next() * 26,
        swayHz: 0.4 + rng.next() * 0.6,
        phase: rng.next() * Math.PI * 2,
        w: 7 + rng.next() * 5,
        h: 11 + rng.next() * 7,
        angle: rng.next() * Math.PI,
        spin: (rng.next() - 0.5) * 7,
        flipHz: 0.8 + rng.next() * 1.4,
      });
    }
    return byColor;
  }, [count, seed, width, height]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {layers.map((pieces, i) => (
        <ConfettiLayer key={i} pieces={pieces} color={COLORS[i]} t={t} />
      ))}
    </Canvas>
  );
}

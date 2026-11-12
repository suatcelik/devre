// Öğretici el işareti (DEVRE_TASKS 3.7.5): parçayı tepsiden hedefe sürükleyerek gösterir.
import { Canvas, Group, RoundedRect } from '@shopify/react-native-skia';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PICKUP_SCALE } from '../../anim/constants';
import type { Piece } from '../../game/types';
import { BoardLayout } from '../../render/layout';
import { PieceCanvas, pieceCanvasSize } from '../../render/PieceCanvas';
import { colors } from '../../theme/colors';
import { tray as T } from '../../theme/sizes';
import type { TutorialMove } from '../../tutorial/steps';

/** Bir gösterimin süresi ve döngüler arası bekleme */
const LOOP_MS = 2600;
const START_DELAY_MS = 450;

/** Elin işaret parmağı ucu, el çiziminin bu noktasındadır. */
const HAND_W = 56;
const HAND_H = 70;
export const TIP = { x: 18, y: 3 };

/** Basit eldiven el: işaret parmağı yukarıda. Önce kalın koyu kontur, üstüne beyaz dolgu (tek parça siluet). */
const HAND_PARTS: [number, number, number, number, number][] = [
  [12, 1, 13, 36, 6.5], // işaret parmağı
  [24, 20, 11, 20, 5.5], // orta parmak
  [33, 24, 10, 18, 5], // yüzük parmağı
  [8, 28, 37, 32, 12], // avuç
  [1, 34, 14, 12, 6], // başparmak
];

export function HandGraphic() {
  return (
    <Canvas style={{ width: HAND_W, height: HAND_H }}>
      <Group>
        {HAND_PARTS.map(([x, y, w, h, r], i) => (
          <RoundedRect key={`o${i}`} x={x} y={y} width={w} height={h} r={r} color={colors.sparkFace}
            style="stroke" strokeWidth={5} />
        ))}
        {HAND_PARTS.map(([x, y, w, h, r], i) => (
          <RoundedRect key={`f${i}`} x={x} y={y} width={w} height={h} r={r} color="white" />
        ))}
      </Group>
    </Canvas>
  );
}

const clamp01 = (v: number) => {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
};
const smooth = (v: number) => {
  'worklet';
  return v * v * (3 - 2 * v);
};

export function TutorialHand({
  piece,
  move,
  layout,
  boardOrigin,
  measureSlot,
}: {
  piece: Piece;
  move: TutorialMove;
  layout: BoardLayout;
  boardOrigin: SharedValue<{ x: number; y: number }>;
  /** Yuvayı oyun ekranı köküne göre ölçer (sürüklemeyle aynı koordinatlar) */
  measureSlot: (i: number, cb: (x: number, y: number, w: number, h: number) => void) => void;
}) {
  const p = useSharedValue(0);
  const slot = useSharedValue({ x: -1000, y: -1000 });
  const dims = pieceCanvasSize(piece, layout.cell, layout.gap, true);
  const w = dims.width;
  const h = dims.bodyHeight;
  const { inset, pitch } = layout;
  const lift = T.dragLift;
  const tr = move.r;
  const tc = move.c;

  useEffect(() => {
    // Yuva yerleşimi oturduktan sonra ölç, sonra döngüyü başlat.
    const t = setTimeout(() => {
      measureSlot(move.trayIndex, (x, y, sw, sh) => {
        slot.value = { x: x + sw / 2, y: y + sh / 2 };
      });
    }, 60);
    p.value = 0;
    p.value = withDelay(START_DELAY_MS, withRepeat(withTiming(1, { duration: LOOP_MS, easing: Easing.linear }), -1));
    return () => {
      clearTimeout(t);
      cancelAnimation(p);
    };
  }, [move, measureSlot, slot, p]);

  /** Parmağın ekrandaki konumu ve basma durumu */
  const finger = () => {
    'worklet';
    const k = p.value;
    const from = slot.value;
    const tx = boardOrigin.value.x + inset + tc * pitch + w / 2;
    const ty = boardOrigin.value.y + inset + tr * pitch + lift + h;
    const move01 = smooth(clamp01((k - 0.22) / 0.46));
    return {
      x: from.x + (tx - from.x) * move01,
      y: from.y + (ty - from.y) * move01,
      pressed: k > 0.14 && k < 0.72,
      k,
    };
  };

  const handStyle = useAnimatedStyle(() => {
    const f = finger();
    const appear = clamp01(f.k / 0.12);
    const fade = 1 - clamp01((f.k - 0.78) / 0.12);
    const scale = f.pressed ? 0.88 : 1 + 0.15 * (1 - appear);
    return {
      opacity: slot.value.x < -999 ? 0 : appear * fade,
      transform: [{ translateX: f.x - TIP.x }, { translateY: f.y - TIP.y }, { scale }],
    };
  });

  const ghostStyle = useAnimatedStyle(() => {
    const f = finger();
    const visible = f.k > 0.16 && f.k < 0.8;
    return {
      opacity: visible ? 0.8 * (1 - clamp01((f.k - 0.7) / 0.1)) : 0,
      transform: [{ translateX: f.x - w / 2 }, { translateY: f.y - lift - h }, { scale: PICKUP_SCALE }],
    };
  });

  const rippleStyle = useAnimatedStyle(() => {
    const f = finger();
    const r = clamp01((f.k - 0.14) / 0.12);
    return {
      opacity: f.k > 0.14 && f.k < 0.3 ? 0.7 * (1 - r) : 0,
      transform: [{ translateX: f.x - 22 }, { translateY: f.y - 22 }, { scale: 0.4 + r }],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.abs, ghostStyle]}>
        <PieceCanvas piece={piece} cell={layout.cell} gap={layout.gap} lifted />
      </Animated.View>
      <Animated.View style={[styles.abs, styles.ripple, rippleStyle]} />
      <Animated.View style={[styles.abs, handStyle]}>
        <HandGraphic />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  ripple: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: colors.text },
});

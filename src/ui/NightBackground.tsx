// Gece arka planı (DEVRE_TASKS 3.4.4): renk geçişi, yavaşça kayan ve göz kırpan soluk yıldızlar,
// arada bir kayan yıldız, isteğe bağlı yavaşça kayan şehir silüeti.
// Tek Skia tuvali, tek saat; değerler UI iş parçacığında hesaplanır.
import { Canvas, Circle, Group, Line, LinearGradient, Path, Skia } from '@shopify/react-native-skia';
import React, { ReactNode, useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SharedValue, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import {
  SHOOTING_STAR_EVERY_MS,
  SHOOTING_STAR_FIRST_MS,
  SHOOTING_STAR_MS,
  SHOOTING_STAR_TAIL,
  SHOOTING_STAR_TRAVEL,
  SKYLINE_SPEED,
  STAR_LAYERS,
  TWINKLE_DEPTH,
  TWINKLE_GROUPS,
  TWINKLE_PERIOD_MS,
} from '../anim/constants';
import { createRng } from '../game/rng';
import { colors } from '../theme/colors';

type Clock = SharedValue<number>;

interface Star {
  x: number;
  y: number;
  r: number;
}

/** Bir katmanın bir göz kırpma grubu: tek yol, tek opaklık. */
function StarGroup({ stars, speed, opacity, period, phase, clock, width }: {
  stars: Star[];
  speed: number;
  opacity: number;
  period: number;
  phase: number;
  clock: Clock;
  width: number;
}) {
  const span = width + 8;
  const path = useDerivedValue(() => {
    const b = Skia.PathBuilder.Make();
    const shift = (clock.value / 1000) * speed;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      // Sola kayar, ekranın solundan çıkan sağdan girer.
      const x = ((((s.x - shift) % span) + span) % span) - 4;
      b.addCircle(x, s.y, s.r);
    }
    return b.detach();
  });
  const alpha = useDerivedValue(() => {
    const w = 0.5 + 0.5 * Math.sin((clock.value / period) * Math.PI * 2 + phase);
    return opacity * (1 - TWINKLE_DEPTH * w);
  });
  return <Path path={path} color="white" opacity={alpha} />;
}

/** 0..1 arası kararlı sözde rastgele sayı (worklet içinde). */
const hash = (n: number, salt: number) => {
  'worklet';
  const x = Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Arada bir sağ üstten sol aşağı süzülen ince kayan yıldız. */
function ShootingStar({ clock, width, height }: { clock: Clock; width: number; height: number }) {
  const state = useDerivedValue(() => {
    const t = clock.value - SHOOTING_STAR_FIRST_MS;
    const cycle = Math.floor(t / SHOOTING_STAR_EVERY_MS);
    const k = (t - cycle * SHOOTING_STAR_EVERY_MS) / SHOOTING_STAR_MS;
    if (t < 0 || k > 1) return { hx: -99, hy: -99, tx: -99, ty: -99, o: 0 };
    const sx = width * (0.45 + 0.5 * hash(cycle, 1));
    const sy = height * (0.04 + 0.25 * hash(cycle, 2));
    const ang = 0.42 + 0.25 * hash(cycle, 3); // sola-aşağı eğim (radyan)
    const dx = -Math.cos(ang);
    const dy = Math.sin(ang);
    const travel = SHOOTING_STAR_TRAVEL * (1 - (1 - k) * (1 - k));
    const tail = SHOOTING_STAR_TAIL * Math.min(1, k * 3) * (1 - k * 0.5);
    const hx = sx + dx * travel;
    const hy = sy + dy * travel;
    return { hx, hy, tx: hx - dx * tail, ty: hy - dy * tail, o: Math.sin(Math.PI * k) };
  });
  const head = useDerivedValue(() => ({ x: state.value.hx, y: state.value.hy }));
  const tail = useDerivedValue(() => ({ x: state.value.tx, y: state.value.ty }));
  const opacity = useDerivedValue(() => state.value.o);
  const hx = useDerivedValue(() => state.value.hx);
  const hy = useDerivedValue(() => state.value.hy);
  return (
    <Group opacity={opacity}>
      <Line p1={tail} p2={head} strokeWidth={2} strokeCap="round">
        <LinearGradient start={tail} end={head} colors={['rgba(255,255,255,0)', 'rgba(255,251,224,0.9)']} />
      </Line>
      <Circle cx={hx} cy={hy} r={1.8} color={colors.lampLit} />
    </Group>
  );
}

interface Building {
  x: number;
  w: number;
  h: number;
  lit: boolean[];
}

/**
 * Silüet iki kopya yan yana çizilir; kaydırma bir kopya boyu dolunca başa sarar.
 * Binalar, yanan ve sönük pencereler renk başına tek yol: her karede yalnızca üç çizim.
 */
function Skyline({ buildings, tile, base, clock }: { buildings: Building[]; tile: number; base: number; clock: Clock }) {
  const paths = useMemo(() => {
    const body = Skia.PathBuilder.Make();
    const on = Skia.PathBuilder.Make();
    const off = Skia.PathBuilder.Make();
    for (const offset of [0, tile]) {
      for (const b of buildings) {
        body.addRect(Skia.XYWHRect(offset + b.x, base - b.h, b.w, b.h));
        const cols = Math.floor((b.w - 8) / 12);
        b.lit.forEach((lit, j) => {
          const rect = Skia.XYWHRect(offset + b.x + 8 + (j % cols) * 12, base - b.h + 10 + Math.floor(j / cols) * 16, 6, 8);
          (lit ? on : off).addRRect(Skia.RRectXY(rect, 1, 1));
        });
      }
    }
    return { body: body.detach(), on: on.detach(), off: off.detach() };
  }, [buildings, tile, base]);
  const transform = useDerivedValue(() => [{ translateX: -(((clock.value / 1000) * SKYLINE_SPEED) % tile) }]);
  return (
    <Group transform={transform}>
      <Path path={paths.body} color={colors.skyline} />
      <Path path={paths.off} color={colors.windowOff} />
      <Path path={paths.on} color={colors.windowOn} />
    </Group>
  );
}

export function NightBackground({ children, skyline = false, still = false }: {
  children: ReactNode;
  skyline?: boolean;
  /** Hareketi azalt: sahne durağan kalır */
  still?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(0);
  const frame = useFrameCallback((info) => {
    clock.value = info.timeSinceFirstFrame;
  }, !still);
  useEffect(() => {
    frame.setActive(!still);
  }, [still, frame]);

  const scene = useMemo(() => {
    const rng = createRng(7);
    // Silüet varsa yıldızlar onun üstünde kalır.
    const skyTop = skyline ? height * 0.6 : height;
    const layers = STAR_LAYERS.map((layer) => {
      const groups: Star[][] = Array.from({ length: TWINKLE_GROUPS }, () => []);
      for (let i = 0; i < layer.count; i++) {
        groups[i % TWINKLE_GROUPS].push({
          x: rng.next() * width,
          y: rng.next() * skyTop,
          r: layer.rMin + rng.next() * (layer.rMax - layer.rMin),
        });
      }
      return { ...layer, groups };
    });
    const buildings: Building[] = [];
    let x = 0;
    while (x < width) {
      const w = 40 + rng.int(4) * 5;
      const h = 70 + rng.int(8) * 10;
      const rows = Math.floor((h - 10) / 16);
      const lit = Array.from({ length: rows * Math.floor((w - 8) / 12) }, () => rng.next() < 0.18);
      buildings.push({ x, w, h, lit });
      x += w;
    }
    return { layers, buildings, tile: x };
  }, [width, height, skyline]);

  return (
    <View style={styles.root}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {scene.layers.map((layer, li) =>
          layer.groups.map((stars, gi) => (
            <StarGroup key={`${li}-${gi}`} stars={stars} speed={layer.speed} opacity={layer.opacity}
              period={TWINKLE_PERIOD_MS[gi % TWINKLE_PERIOD_MS.length]} phase={li * 1.7 + gi * 2.1}
              clock={clock} width={width} />
          )),
        )}
        {!still && <ShootingStar clock={clock} width={width} height={height} />}
        {skyline && <Skyline buildings={scene.buildings} tile={scene.tile} base={height} clock={clock} />}
      </Canvas>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBottom,
    backgroundImage: `linear-gradient(180deg, ${colors.bgTop} 0%, ${colors.bgBottom} 100%)`,
  },
});

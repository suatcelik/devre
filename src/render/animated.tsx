// Zaman çizelgesini oynatan Skia katmanları (DEVRE_TASKS 3.5.2–3.5.5).
// Hepsi tek bir saat paylaşır (ms); değerler UI iş parçacığında hesaplanır (3.8.2).
import {
  BlurMask,
  Circle,
  Group,
  Path,
  RoundedRect,
  Skia,
  useClock,
  vec,
} from '@shopify/react-native-skia';
import React, { ReactNode, useMemo } from 'react';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';

import {
  BATTERY_PULSE_PERIOD_MS,
  BATTERY_PULSE_SCALE,
  CURRENT_STEP_MS,
  DROP_SQUASH,
  DROP_SQUASH_MS,
  EXPLODE_SWELL_MS,
  EXPLODE_SWELL_SCALE,
  GAMEOVER_GREY_FADE_MS,
  LAMP_WAVE_MS,
  PARTICLES_MAX,
  PARTICLES_MIN,
  PARTICLE_GRAVITY,
  PARTICLE_LIFE_MS,
  PARTICLE_SPEED,
  ROTATE_SPIN_MS,
  SWITCH_TURN_MS,
  TERMINAL_APPEAR_MS,
  TERMINAL_VANISH_MS,
} from '../anim/constants';
import { Burst, CellPlan, backOut, squashCurve } from '../anim/timeline';
import { createRng } from '../game/rng';
import type { Pos } from '../game/types';
import { colors, steel, tones } from '../theme/colors';
import { cellRatio } from '../theme/sizes';
import { BoardLayout, cellOrigin } from './layout';

type Clock = SharedValue<number>;

const clamp01 = (v: number) => {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

/**
 * Bir hücreyi plana göre canlandırır: bırakma ezilmesi, akım ışığı, şişip patlama, sönme.
 * `base` hücrenin normal hâli, `lit` akım geçtiğindeki üst katmandır.
 */
export function AnimatedCell({
  x,
  y,
  size,
  plan,
  t,
  base,
  lit,
}: {
  x: number;
  y: number;
  size: number;
  plan: CellPlan;
  t: Clock;
  base: ReactNode;
  lit?: ReactNode;
}) {
  const { squashAt, litAt, explodeAt, vanishAt, turnAt, spinAt } = plan;
  const transform = useDerivedValue(() => {
    const tt = t.value;
    let s = 1;
    if (squashAt !== undefined) {
      const k = (tt - squashAt) / DROP_SQUASH_MS;
      if (k < 1) s *= squashCurve(k, DROP_SQUASH.from, DROP_SQUASH.peak, DROP_SQUASH.peakAt);
    }
    if (explodeAt !== undefined) {
      const k = (tt - explodeAt) / EXPLODE_SWELL_MS;
      if (k >= 1) s = 0;
      else if (k > 0) s *= 1 + (EXPLODE_SWELL_SCALE - 1) * k;
    }
    if (vanishAt !== undefined) {
      const k = (tt - vanishAt) / TERMINAL_VANISH_MS;
      if (k >= 1) s = 0;
      else if (k > 0) s *= 1 - k;
    }
    // Anahtar: 90° saat yönünde yumuşak dönüş
    let rot = 0;
    if (turnAt !== undefined) {
      const k = clamp01((tt - turnAt) / SWITCH_TURN_MS);
      rot = (Math.PI / 2) * (k * k * (3 - 2 * k));
    }
    // Döndür jokeri: çizilen hücre zaten yeni yönde; -90°'den 0'a döner.
    if (spinAt !== undefined) {
      const k = clamp01((tt - spinAt) / ROTATE_SPIN_MS);
      rot = -(Math.PI / 2) * (1 - k * k * (3 - 2 * k));
    }
    return [{ scale: s }, { rotate: rot }];
  });
  const litOpacity = useDerivedValue(() => (litAt === undefined ? 0 : clamp01((t.value - litAt) / 60)));
  const whiteOpacity = useDerivedValue(() =>
    explodeAt === undefined ? 0 : clamp01((t.value - explodeAt) / EXPLODE_SWELL_MS) * 0.75,
  );
  return (
    <Group transform={transform} origin={vec(x + size / 2, y + size / 2)}>
      {base}
      {lit && <Group opacity={litOpacity}>{lit}</Group>}
      {explodeAt !== undefined && (
        <RoundedRect x={x} y={y} width={size} height={size} r={size * cellRatio.radius} color="white"
          opacity={whiteOpacity} />
      )}
    </Group>
  );
}

/** Pil ve lambanın yeni yerinde geri taşmalı belirmesi. */
export function AppearCell({ x, y, size, at, t, children }: {
  x: number; y: number; size: number; at: number; t: Clock; children: ReactNode;
}) {
  const transform = useDerivedValue(() => {
    const k = (t.value - at) / TERMINAL_APPEAR_MS;
    return [{ scale: k <= 0 ? 0 : k >= 1 ? 1 : backOut(k) }];
  });
  return (
    <Group transform={transform} origin={vec(x + size / 2, y + size / 2)}>
      {children}
    </Group>
  );
}

/** Pil hafifçe nabız gibi atar (DEVRE_TASKS 3.4.2). */
export function Pulse({ x, y, size, children, enabled }: {
  x: number; y: number; size: number; children: ReactNode; enabled: boolean;
}) {
  const clock = useClock();
  const transform = useDerivedValue(() => {
    if (!enabled) return [{ scale: 1 }];
    const phase = (clock.value % BATTERY_PULSE_PERIOD_MS) / BATTERY_PULSE_PERIOD_MS;
    // Kısa vuruş, uzun dinlenme: kalp atışı gibi.
    const beat = phase < 0.3 ? Math.sin((phase / 0.3) * Math.PI) : 0;
    return [{ scale: 1 + BATTERY_PULSE_SCALE * beat }];
  });
  return (
    <Group transform={transform} origin={vec(x + size / 2, y + size / 2)}>
      {children}
    </Group>
  );
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  at: number;
}

/** Tek renkteki parçacıklar tek bir yol olarak çizilir (az çizim çağrısı). */
function ParticleLayer({ parts, color, t, gravity }: { parts: Particle[]; color: string; t: Clock; gravity: number }) {
  const path = useDerivedValue(() => {
    const p = Skia.PathBuilder.Make();
    const tt = t.value;
    for (let i = 0; i < parts.length; i++) {
      const q = parts[i];
      const age = (tt - q.at) / PARTICLE_LIFE_MS;
      if (age < 0 || age >= 1) continue;
      const s = (tt - q.at) / 1000;
      const px = q.x + q.vx * s;
      const py = q.y + q.vy * s + 0.5 * gravity * s * s;
      const half = (q.size * (1 - age * age)) / 2;
      p.addRect(Skia.XYWHRect(px - half, py - half, half * 2, half * 2));
    }
    return p.detach();
  });
  return <Path path={path} color={color} />;
}

/** Patlayan hücre başına 8–12 parçacık: hücrenin renginde kareler + beyaz kıvılcımlar (3.5.4). */
export function Particles({ bursts, layout, t }: { bursts: Burst[]; layout: BoardLayout; t: Clock }) {
  const groups = useMemo(() => {
    const byColor = new Map<string, Particle[]>();
    const add = (color: string, q: Particle) => {
      const list = byColor.get(color) ?? [];
      list.push(q);
      byColor.set(color, list);
    };
    const c = layout.cell;
    // Tohumlu: aynı patlama her çizimde aynı parçacıkları üretir.
    const rng = createRng(bursts.reduce((h, b) => (h * 31 + b.pos.r * 8 + b.pos.c + b.at) >>> 0, 17));
    for (const b of bursts) {
      const { x, y } = cellOrigin(layout, b.pos.r, b.pos.c);
      const n = PARTICLES_MIN + Math.floor(rng.next() * (PARTICLES_MAX - PARTICLES_MIN + 1));
      for (let i = 0; i < n; i++) {
        const angle = rng.next() * Math.PI * 2;
        const speed = (0.4 + rng.next() * 0.8) * PARTICLE_SPEED * c;
        const sparkle = i % 3 === 0;
        add(sparkle ? 'white' : b.color === 'steel' ? steel.base : tones[b.color].base, {
          x: x + c / 2 + (rng.next() - 0.5) * c * 0.5,
          y: y + c / 2 + (rng.next() - 0.5) * c * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - PARTICLE_SPEED * c * 0.6,
          size: c * (sparkle ? 0.1 : 0.14 + rng.next() * 0.1),
          at: b.at,
        });
      }
    }
    return [...byColor.entries()];
  }, [bursts, layout]);
  return (
    <>
      {groups.map(([color, parts]) => (
        <ParticleLayer key={color} parts={parts} color={color} t={t} gravity={PARTICLE_GRAVITY * layout.cell} />
      ))}
    </>
  );
}

/** Akımın ucu: yol boyunca kayan parlak kıvılcım. */
export function CurrentHead({ path, times, layout, t }: {
  path: Pos[]; times: number[]; layout: BoardLayout; t: Clock;
}) {
  const pts = useMemo(
    () => path.map((p) => {
      const o = cellOrigin(layout, p.r, p.c);
      return { x: o.x + layout.cell / 2, y: o.y + layout.cell / 2 };
    }),
    [path, layout],
  );
  const start = times[0];
  const last = times[times.length - 1];
  const cx = useDerivedValue(() => {
    const f = clamp01((t.value - start) / (last - start || 1)) * (pts.length - 1);
    const i = Math.min(Math.floor(f), pts.length - 2);
    const k = f - i;
    return pts[i].x + (pts[i + 1].x - pts[i].x) * k;
  });
  const cy = useDerivedValue(() => {
    const f = clamp01((t.value - start) / (last - start || 1)) * (pts.length - 1);
    const i = Math.min(Math.floor(f), pts.length - 2);
    const k = f - i;
    return pts[i].y + (pts[i + 1].y - pts[i].y) * k;
  });
  const opacity = useDerivedValue(() => (t.value >= start && t.value <= last + CURRENT_STEP_MS ? 1 : 0));
  const r = layout.cell * 0.2;
  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={r * 2.2} color={colors.wireGlow}>
        <BlurMask blur={r * 1.4} style="normal" />
      </Circle>
      <Circle cx={cx} cy={cy} r={r} color={colors.wireLitCore} />
    </Group>
  );
}

/** Lamba yanınca dairesel ışık dalgası (3.5.5). */
export function LampWave({ pos, at, layout, t }: { pos: Pos; at: number; layout: BoardLayout; t: Clock }) {
  const o = cellOrigin(layout, pos.r, pos.c);
  const c = vec(o.x + layout.cell / 2, o.y + layout.cell / 2);
  const maxR = layout.size * 0.9;
  const k = useDerivedValue(() => clamp01((t.value - at) / LAMP_WAVE_MS));
  const r = useDerivedValue(() => layout.cell * 0.5 + (1 - (1 - k.value) * (1 - k.value)) * maxR);
  const ringOpacity = useDerivedValue(() => (k.value <= 0 || k.value >= 1 ? 0 : (1 - k.value) * 0.85));
  const strokeWidth = useDerivedValue(() => layout.cell * 0.3 * (1 - k.value) + 2);
  const glowR = useDerivedValue(() => layout.cell * (0.6 + k.value * 1.2));
  const glowOpacity = useDerivedValue(() => (k.value <= 0 || k.value >= 1 ? 0 : 1 - k.value));
  return (
    <>
      <Circle c={c} r={glowR} color={colors.lampGlow} opacity={glowOpacity}>
        <BlurMask blur={layout.cell * 0.5} style="normal" />
      </Circle>
      <Circle c={c} r={r} color={colors.wireGlow} style="stroke" strokeWidth={strokeWidth} opacity={ringOpacity} />
    </>
  );
}

/** Oyun sonu: blok sırayla grileşir (3.5 "Oyun sonu"). */
export function GreyOut({ x, y, size, at, t }: { x: number; y: number; size: number; at: number; t: Clock }) {
  const opacity = useDerivedValue(() => clamp01((t.value - at) / GAMEOVER_GREY_FADE_MS) * 0.82);
  return (
    <RoundedRect x={x} y={y} width={size} height={size * (1 + cellRatio.edgeShadow)} r={size * cellRatio.radius}
      color={colors.levelLocked} opacity={opacity} />
  );
}

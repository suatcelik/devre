// Skia hücre çizimleri (DEVRE_TASKS 3.4). Hepsi bir <Canvas> içinde kullanılır.
import {
  BlurMask,
  Circle,
  DashPathEffect,
  Group,
  Line,
  LinearGradient,
  Oval,
  Path,
  Rect,
  RoundedRect,
  rect,
  rrect,
  vec,
} from '@shopify/react-native-skia';
import React from 'react';

import { rotateCW } from '../game/board';
import { DIRS, Dir, E, N, S, W, WireDirs } from '../game/types';
import { Tone, cage, colors, steel, switchColors, tones } from '../theme/colors';
import { cellRatio as R } from '../theme/sizes';

interface CellProps {
  x: number;
  y: number;
  size: number;
}

/** Yönün hücre kenarındaki uç noktası. */
function edgePoint(x: number, y: number, size: number, d: Dir) {
  const h = size / 2;
  switch (d) {
    case N:
      return vec(x + h, y);
    case S:
      return vec(x + h, y + size);
    case E:
      return vec(x + size, y + h);
    default:
      return vec(x, y + h);
  }
}

const ROTATION: Record<Dir, number> = { [E]: 0, [S]: Math.PI / 2, [W]: Math.PI, [N]: -Math.PI / 2 };

/**
 * Kablo katmanı: koyu kontur + açık kablo + ortada düğüm (DEVRE_TASKS 3.4).
 * Sönük kablo %70 opak; akım geçince tam beyaz, daha kalın ve sarı parlamalı.
 * Akım bilgisi renge değil parlaklık ve kalınlığa dayanır (3.2.2, bkz. colorVision testleri).
 * Kollar tek yol olarak çizilir: yarı saydam kollar merkezde üst üste binip parlamaz.
 */
export function Wires({ x, y, size, wires, lit }: CellProps & { wires: WireDirs; lit?: boolean }) {
  if (!wires) return null;
  const c = vec(x + size / 2, y + size / 2);
  const arms = DIRS.filter((d) => wires & d)
    .map((d) => {
      const e = edgePoint(x, y, size, d);
      return `M${c.x} ${c.y}L${e.x} ${e.y}`;
    })
    .join('');
  const core = lit ? colors.wireLit : colors.wireIdle;
  const coreOpacity = lit ? 1 : colors.wireIdleOpacity;
  return (
    <Group clip={rect(x, y, size, size)}>
      {lit && (
        <Path path={arms} color={colors.wireGlow} style="stroke" strokeWidth={size * R.wireOutline} strokeCap="round">
          <BlurMask blur={size * 0.12} style="normal" />
        </Path>
      )}
      <Path path={arms} color={colors.wireOutline} opacity={colors.wireOutlineOpacity} style="stroke"
        strokeWidth={size * R.wireOutline} strokeCap="round" />
      <Path path={arms} color={core} opacity={coreOpacity} style="stroke"
        strokeWidth={size * (lit ? R.wireLit : R.wire)} strokeCap="round" />
      <Circle c={c} r={size * R.wireNode} color={core} opacity={coreOpacity} />
    </Group>
  );
}

/** Jöle/cam blok gövdesi: alt kenar gölgesi, renk geçişi, üst ışık çizgisi, parlama ovali. */
function Jelly({ x, y, size, tone }: CellProps & { tone: Tone }) {
  const r = size * R.radius;
  return (
    <>
      <RoundedRect x={x} y={y + size * R.edgeShadow} width={size} height={size} r={r} color={tone.edge} />
      <Group clip={rrect(rect(x, y, size, size), r, r)}>
        <Rect x={x} y={y} width={size} height={size}>
          <LinearGradient start={vec(x, y)} end={vec(x, y + size)} colors={[tone.light, tone.base]}
            positions={[0, R.gradientStop]} />
        </Rect>
        <Rect x={x} y={y} width={size} height={size * R.innerHighlight} color="white"
          opacity={R.innerHighlightOpacity} />
      </Group>
      <Oval x={x + size * R.gloss.x} y={y + size * R.gloss.y} width={size * R.gloss.w}
        height={size * R.gloss.h} color="white" opacity={R.gloss.opacity} />
    </>
  );
}

export function BlockCell({ x, y, size, tone, wires, lit, opacity = 1, locked = false }: CellProps & {
  tone: Tone;
  wires: WireDirs;
  lit?: boolean;
  opacity?: number;
  /** Kilitli blok: çelik gövde, kafes çerçevesi, kilit rozeti (4.6) */
  locked?: boolean;
}) {
  return (
    <Group opacity={opacity}>
      <Jelly x={x} y={y} size={size} tone={locked ? steel : tone} />
      {locked && <Cage x={x} y={y} size={size} />}
      <Wires x={x} y={y} size={size} wires={wires} lit={lit} />
      {locked && <LockBadge x={x} y={y} size={size} />}
    </Group>
  );
}

/** Kafes: içte koyu çerçeve ve köşelerde perçinler. Kablolar üstünden geçer. */
function Cage({ x, y, size }: CellProps) {
  const k = size / 38;
  const inset = 4 * k;
  const rivets = [
    [x + inset + 2 * k, y + inset + 2 * k],
    [x + size - inset - 2 * k, y + inset + 2 * k],
    [x + inset + 2 * k, y + size - inset - 2 * k],
    [x + size - inset - 2 * k, y + size - inset - 2 * k],
  ];
  return (
    <Group>
      <RoundedRect x={x + inset} y={y + inset} width={size - 2 * inset} height={size - 2 * inset} r={size * 0.16}
        color={cage.frame} style="stroke" strokeWidth={2.5 * k} opacity={0.75} />
      {rivets.map(([cx, cy], i) => (
        <Circle key={i} cx={cx} cy={cy} r={1.6 * k} color={cage.rivet} />
      ))}
    </Group>
  );
}

/** Sağ üst köşede küçük kilit rozeti */
function LockBadge({ x, y, size }: CellProps) {
  const k = size / 38;
  const cx = x + size - 8 * k;
  const cy = y + 8 * k;
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={7 * k} color={cage.badge} />
      <Path path={`M${cx - 2.6 * k} ${cy - 0.5 * k}V${cy - 2.4 * k}a${2.6 * k} ${2.6 * k} 0 0 1 ${5.2 * k} 0V${cy - 0.5 * k}`}
        color={cage.lockIcon} style="stroke" strokeWidth={1.4 * k} />
      <RoundedRect x={cx - 3.6 * k} y={cy - 0.8 * k} width={7.2 * k} height={4.8 * k} r={1 * k} color={cage.lockIcon} />
    </Group>
  );
}

/**
 * Anahtar (4.6): koyu plaka üstünde döner disk; kablo o anki yönde, bir sonraki yön soluk kesik çizgi.
 * Köşedeki sarı ok her hamle saat yönünde döneceğini söyler.
 */
export function SwitchCell({ x, y, size, wires, lit }: CellProps & { wires: WireDirs; lit?: boolean }) {
  const k = size / 38;
  const c = vec(x + size / 2, y + size / 2);
  const r = size * R.radius;
  const next = DIRS.filter((d) => rotateCW(wires) & d)
    .map((d) => {
      const e = edgePoint(x, y, size, d);
      return `M${c.x} ${c.y}L${e.x} ${e.y}`;
    })
    .join('');
  // Saat yönünde ok: sağ üst köşede çeyrek yay + uç
  const ax = x + size - 9 * k;
  const ay = y + 9 * k;
  const arrow = `M${ax - 5 * k} ${ay - 3 * k}A${5 * k} ${5 * k} 0 0 1 ${ax + 2 * k} ${ay + 4 * k}`;
  const head = `M${ax - 1 * k} ${ay + 4.5 * k}L${ax + 2.2 * k} ${ay + 4.2 * k}L${ax + 2.6 * k} ${ay + 0.8 * k}`;
  return (
    <Group>
      <RoundedRect x={x} y={y + size * R.edgeShadow} width={size} height={size} r={r} color={switchColors.plateEdge} />
      <RoundedRect x={x} y={y} width={size} height={size} r={r} color={switchColors.plate} />
      <Circle c={c} r={size * 0.42} color={switchColors.disc} />
      <Circle c={c} r={size * 0.42} color={switchColors.ring} style="stroke" strokeWidth={2.5 * k} />
      <Path path={next} color={switchColors.nextWire} opacity={switchColors.nextOpacity} style="stroke"
        strokeWidth={size * R.wire * 0.7} strokeCap="round">
        <DashPathEffect intervals={[3 * k, 3 * k]} />
      </Path>
      <Wires x={x} y={y} size={size} wires={wires} lit={lit} />
      <Path path={arrow} color={switchColors.arrow} style="stroke" strokeWidth={2 * k} strokeCap="round" />
      <Path path={head} color={switchColors.arrow} style="stroke" strokeWidth={2 * k} strokeCap="round" strokeJoin="round" />
    </Group>
  );
}

export function EmptyCell({ x, y, size }: CellProps) {
  const r = size * R.radius;
  return (
    <Group clip={rrect(rect(x, y, size, size), r, r)}>
      <Rect x={x} y={y} width={size} height={size} color={colors.emptyCell} />
      <Rect x={x} y={y} width={size} height={size * 0.08} color={colors.emptyCellInset} />
    </Group>
  );
}

/** Pil: sarı blok üzerinde pil simgesi; ucu içeri bakar. */
export function BatteryCell({ x, y, size, dir, lit }: CellProps & { dir: Dir; lit?: boolean }) {
  const k = size / 38;
  const cx = x + size / 2;
  const cy = y + size / 2;
  return (
    <Group>
      <Jelly x={x} y={y} size={size} tone={tones.yellow} />
      <Group transform={[{ rotate: ROTATION[dir] }]} origin={vec(cx, cy)}>
        {lit && (
          <Line p1={vec(x + 22 * k, cy)} p2={vec(x + size, cy)} color={colors.wireGlow}
            strokeWidth={size * R.wireOutline}>
            <BlurMask blur={size * 0.12} style="normal" />
          </Line>
        )}
        <Line p1={vec(x + 14 * k, y + 9 * k)} p2={vec(x + 14 * k, y + 29 * k)} color={colors.batteryMark}
          strokeWidth={4 * k} strokeCap="round" />
        <Line p1={vec(x + 22 * k, y + 14 * k)} p2={vec(x + 22 * k, y + 24 * k)} color={colors.batteryMark}
          strokeWidth={6 * k} strokeCap="round" />
        <Line p1={vec(x + 22 * k, cy)} p2={vec(x + size, cy)} color={colors.wireLit} strokeWidth={5 * k} />
      </Group>
    </Group>
  );
}

/** Lamba: sönükken gri cam, yanınca ışık saçan sarı halka. */
export function LampCell({ x, y, size, dir, lit }: CellProps & { dir: Dir; lit?: boolean }) {
  const k = size / 38;
  const c = vec(x + size / 2, y + size / 2);
  return (
    <Group>
      <Line p1={c} p2={edgePoint(x, y, size, dir)} color={colors.wireOutline} opacity={colors.wireOutlineOpacity}
        strokeWidth={size * R.wireOutline} />
      <Line p1={c} p2={edgePoint(x, y, size, dir)} color={lit ? colors.wireLit : colors.wireIdle}
        opacity={lit ? 1 : colors.wireIdleOpacity} strokeWidth={size * (lit ? R.wireLit : R.wire)} />
      {lit && (
        <Circle c={c} r={size / 2 + 8 * k} color={colors.lampGlow}>
          <BlurMask blur={11 * k} style="normal" />
        </Circle>
      )}
      <Circle c={c} r={size / 2 - 1.5 * k} color={lit ? colors.lampRing : colors.lampOffRing} />
      <Circle c={c} r={size / 2 - 4 * k} color={lit ? colors.lampLit : colors.lampOffGlass} />
      <Circle c={c} r={10 * k} style="stroke" strokeWidth={3 * k}
        color={lit ? colors.lampFilament : colors.lampOffRing} />
      <Line p1={vec(c.x - 7 * k, c.y - 7 * k)} p2={vec(c.x + 7 * k, c.y + 7 * k)} strokeWidth={3 * k}
        color={lit ? colors.lampFilament : colors.lampOffRing} />
      <Line p1={vec(c.x + 7 * k, c.y - 7 * k)} p2={vec(c.x - 7 * k, c.y + 7 * k)} strokeWidth={3 * k}
        color={lit ? colors.lampFilament : colors.lampOffRing} />
    </Group>
  );
}

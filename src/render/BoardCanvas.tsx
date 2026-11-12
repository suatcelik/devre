import { Canvas, Group, Rect, RoundedRect, rect, rrect } from '@shopify/react-native-skia';
import React, { ReactNode, useEffect, useMemo } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import { GAMEOVER_GREY_FADE_MS, GAMEOVER_GREY_STAGGER_MS } from '../anim/constants';
import type { Timeline } from '../anim/timeline';
import { BOARD_SIZE, Board, Cell, Piece, Pos } from '../game/types';
import { colors, tones } from '../theme/colors';
import { board as B } from '../theme/sizes';
import { AnimatedCell, AppearCell, CurrentHead, GreyOut, LampWave, Particles, Pulse } from './animated';
import { BatteryCell, BlockCell, EmptyCell, LampCell, SwitchCell, Wires } from './cells';
import { BoardLayout, cellOrigin } from './layout';
import { VisionLayer } from './VisionLayer';

export interface Ghost {
  piece: Piece;
  r: number;
  c: number;
}

interface Props {
  board: Board;
  layout: BoardLayout;
  /** Bırakılacak yerin hayalet önizlemesi (yalnızca geçerli konumda verilir). */
  ghost?: Ghost | null;
  /** Bırakınca akım geçecek yol (önizleme). */
  litPath?: Pos[] | null;
  /** Oynatılan hamle animasyonu */
  timeline?: { id: number; tl: Timeline } | null;
  gameOver?: boolean;
  reduceMotion?: boolean;
}

const key = (r: number, c: number) => r * BOARD_SIZE + c;

/** Oyun sonu grileşme süresi: kalan blok sayısına bağlı. */
export function greyOutDuration(board: Board): number {
  const blocks = board.filter((c) => c.kind === 'block').length;
  return blocks * GAMEOVER_GREY_STAGGER_MS + GAMEOVER_GREY_FADE_MS;
}

function staticCell(content: Cell, x: number, y: number, size: number, lit: boolean, reduceMotion: boolean): ReactNode {
  switch (content.kind) {
    case 'empty':
      return null;
    case 'block':
      return (
        <BlockCell x={x} y={y} size={size} tone={tones[content.color]} wires={content.wires} lit={lit}
          locked={content.locked} />
      );
    case 'switch':
      return <SwitchCell x={x} y={y} size={size} wires={content.wires} lit={lit} />;
    case 'battery':
      return (
        <Pulse x={x} y={y} size={size} enabled={!reduceMotion}>
          <BatteryCell x={x} y={y} size={size} dir={content.wires} lit={lit} />
        </Pulse>
      );
    case 'lamp':
      return <LampCell x={x} y={y} size={size} dir={content.wires} lit={lit} />;
  }
}

/** Akım geçtiğinde hücrenin üstüne binen parlak katman. */
function litLayer(content: Cell, x: number, y: number, size: number): ReactNode {
  switch (content.kind) {
    case 'block':
    case 'switch':
      return <Wires x={x} y={y} size={size} wires={content.wires} lit />;
    case 'battery':
      return <BatteryCell x={x} y={y} size={size} dir={content.wires} lit />;
    case 'lamp':
      return <LampCell x={x} y={y} size={size} dir={content.wires} lit />;
    default:
      return null;
  }
}

/** Tahtanın tamamı ve tüm efektleri tek bir Skia Canvas içinde (DEVRE_TASKS 3.8.2). */
export function BoardCanvas({ board, layout, ghost, litPath, timeline, gameOver = false, reduceMotion = false }: Props) {
  const { size, radius, border, cell, scale } = layout;
  const lit = useMemo(() => new Set((litPath ?? []).map((p) => key(p.r, p.c))), [litPath]);

  // Tek saat: hamle animasyonu veya oyun sonu grileşmesi için 0'dan süre sonuna doğrusal akar.
  const t = useSharedValue(0);
  const tl = timeline?.tl ?? null;
  const greying = gameOver && !tl;
  useEffect(() => {
    const duration = tl ? tl.duration : greying ? greyOutDuration(board) : 0;
    t.value = 0;
    if (duration > 0) t.value = withTiming(duration, { duration, easing: Easing.linear });
    // board yalnızca grileşme başında okunur; her tahta değişiminde saati sıfırlamamalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline?.id, greying, t]);

  const scene = tl ? tl.board : board;
  const greyOrder = useMemo(() => {
    const order = new Map<number, number>();
    if (!greying) return order;
    let n = 0;
    board.forEach((c, i) => c.kind === 'block' && order.set(i, n++));
    return order;
  }, [greying, board]);

  const empties: ReactNode[] = [];
  const contents: ReactNode[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const { x, y } = cellOrigin(layout, r, c);
      const k = key(r, c);
      const content = scene[k];
      empties.push(<EmptyCell key={k} x={x} y={y} size={cell} />);
      if (content.kind === 'empty') continue;
      const plan = tl?.cells.get(k);
      if (plan) {
        contents.push(
          <AnimatedCell key={k} x={x} y={y} size={cell} plan={plan} t={t}
            base={staticCell(content, x, y, cell, false, true)}
            lit={plan.litAt !== undefined ? litLayer(content, x, y, cell) : undefined} />,
        );
      } else {
        contents.push(<Group key={k}>{staticCell(content, x, y, cell, lit.has(k), reduceMotion)}</Group>);
      }
      const greyIndex = greyOrder.get(k);
      if (greyIndex !== undefined) {
        contents.push(
          <GreyOut key={`grey${k}`} x={x} y={y} size={cell} at={greyIndex * GAMEOVER_GREY_STAGGER_MS} t={t} />,
        );
      }
    }
  }

  // Yeni pil ve lamba, eskileri sönünce belirir.
  const appear: ReactNode[] = [];
  if (tl?.terminals) {
    for (const p of [tl.terminals.battery, ...tl.terminals.lamps]) {
      const { x, y } = cellOrigin(layout, p.r, p.c);
      appear.push(
        <AppearCell key={`new${key(p.r, p.c)}`} x={x} y={y} size={cell} at={tl.terminals.appearAt} t={t}>
          {staticCell(tl.finalBoard[key(p.r, p.c)], x, y, cell, false, true)}
        </AppearCell>,
      );
    }
  }

  const ghostCells = ghost
    ? ghost.piece.cells.map(({ r, c, wires }) => {
        const { x, y } = cellOrigin(layout, ghost.r + r, ghost.c + c);
        return (
          <BlockCell key={`g${r},${c}`} x={x} y={y} size={cell} tone={tones[ghost.piece.color]} wires={wires}
            lit={lit.has(key(ghost.r + r, ghost.c + c))} opacity={lit.size ? 0.8 : colors.ghostOpacity} />
        );
      })
    : null;

  const half = border / 2;
  return (
    <Canvas style={{ width: size, height: layout.canvasHeight }}>
      <VisionLayer>
      {/* Panel: dış gölge, gövde, iç gölge, kalın çerçeve */}
      <RoundedRect x={0} y={B.dropShadowY * scale} width={size} height={size} r={radius} color={colors.panelDropShadow} />
      <RoundedRect x={0} y={0} width={size} height={size} r={radius} color={colors.panel} />
      <Group clip={rrect(rect(0, 0, size, size), radius, radius)}>
        <Rect x={0} y={0} width={size} height={B.insetShadowY * scale + border} color={colors.panelInsetShadow} />
      </Group>
      <RoundedRect x={half} y={half} width={size - border} height={size - border} r={radius - half}
        color={colors.panelBorder} style="stroke" strokeWidth={border} />
      {empties}
      {contents}
      {appear}
      {ghostCells}
      {tl?.currents.map((c, i) => (
        <CurrentHead key={`c${i}`} path={c.path} times={c.times} layout={layout} t={t} />
      ))}
      {!reduceMotion && tl?.lamps.map((l, i) => (
        <LampWave key={`w${i}`} pos={l.pos} at={l.at} layout={layout} t={t} />
      ))}
      {tl && tl.bursts.length > 0 && <Particles bursts={tl.bursts} layout={layout} t={t} />}
      </VisionLayer>
    </Canvas>
  );
}

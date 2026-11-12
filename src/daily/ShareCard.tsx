// Paylaşım kartı (DEVRE_TASKS 4.9): tahtanın küçük özeti + puan, görsel olarak paylaşılır.
// Tek Skia tuvali; anlık görüntüsü PNG olarak paylaşılır.
import {
  Canvas,
  CanvasRef,
  Circle,
  Group,
  LinearGradient,
  RoundedRect,
  Text,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import React, { RefObject } from 'react';

import { colors, steel, switchColors, tones } from '../theme/colors';
import { formatScore } from '../ui/format';
import { CODE_COLOR } from './boardCode';
import { DailyResult, formatDateTr } from './daily';

export const CARD = { width: 320, height: 430 } as const;

const display = require('@expo-google-fonts/baloo-2/800ExtraBold/Baloo2_800ExtraBold.ttf');
const body = require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf');

/** Mini tahta: kablosuz renkli kareler; pil sarı, lamba parlak, kilitli çelik, anahtar koyu. */
function MiniBoard({ code, x, y, cell, gap }: { code: string; x: number; y: number; cell: number; gap: number }) {
  const size = 8 * cell + 7 * gap;
  return (
    <Group>
      <RoundedRect x={x - 8} y={y - 8} width={size + 16} height={size + 16} r={14} color={colors.panel} />
      <RoundedRect x={x - 8} y={y - 8} width={size + 16} height={size + 16} r={14} color={colors.panelBorder}
        style="stroke" strokeWidth={3} />
      {[...code].map((ch, i) => {
        const cx = x + (i % 8) * (cell + gap);
        const cy = y + Math.floor(i / 8) * (cell + gap);
        if (ch === 'L') {
          return (
            <Group key={i}>
              <Circle cx={cx + cell / 2} cy={cy + cell / 2} r={cell / 2} color={colors.lampRing} />
              <Circle cx={cx + cell / 2} cy={cy + cell / 2} r={cell / 2 - 3} color={colors.lampLit} />
            </Group>
          );
        }
        const color =
          ch === '.' ? colors.emptyCell
            : ch === 'B' ? tones.yellow.base
              : ch === 's' ? steel.base
                : ch === 'w' ? switchColors.ring
                  : tones[CODE_COLOR[ch] ?? 'purple'].base;
        return <RoundedRect key={i} x={cx} y={cy} width={cell} height={cell} r={cell * 0.24} color={color} />;
      })}
    </Group>
  );
}

export function ShareCard({ result, streak, canvasRef }: {
  result: DailyResult;
  streak: number;
  canvasRef?: RefObject<CanvasRef | null>;
}) {
  const logo = useFont(display, 52);
  const big = useFont(display, 46);
  const small = useFont(body, 15);
  const W = CARD.width;
  const center = (font: ReturnType<typeof useFont>, text: string) => (font ? (W - font.measureText(text).width) / 2 : 0);

  const title = 'DEVRE';
  const sub = `Günün Tahtası · ${formatDateTr(result.date)}`;
  const score = formatScore(result.score);
  const stats = `${result.circuits} lamba · en uzun devre ${result.longest}${streak > 1 ? ` · ${streak} gün seri` : ''}`;
  const cell = 26;
  const gap = 4;
  const boardSize = 8 * cell + 7 * gap;

  return (
    <Canvas ref={canvasRef} style={{ width: CARD.width, height: CARD.height }}>
      <RoundedRect x={0} y={0} width={CARD.width} height={CARD.height} r={24}>
        <LinearGradient start={vec(0, 0)} end={vec(0, CARD.height)} colors={[colors.bgTop, colors.bgBottom]} />
      </RoundedRect>
      {/* Birkaç soluk yıldız */}
      {[[26, 30], [292, 46], [40, 300], [286, 270], [160, 18]].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={1.6} color="white" opacity={0.6} />
      ))}
      {logo && <Text x={center(logo, title)} y={64} text={title} font={logo} color={tones.yellow.base} />}
      {small && <Text x={center(small, sub)} y={90} text={sub} font={small} color={colors.textSecondary} />}
      {result.board && <MiniBoard code={result.board} x={(W - boardSize) / 2} y={110} cell={cell} gap={gap} />}
      {big && <Text x={center(big, score)} y={392 - 10} text={score} font={big} color={colors.text} />}
      {small && <Text x={center(small, stats)} y={410} text={stats} font={small} color={colors.textSecondary} />}
    </Canvas>
  );
}

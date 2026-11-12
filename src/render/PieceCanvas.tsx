import { BlurMask, Canvas, Group, RoundedRect } from '@shopify/react-native-skia';
import React from 'react';

import { pieceSize } from '../game/pieces';
import type { Piece } from '../game/types';
import { tones } from '../theme/colors';
import { cellRatio } from '../theme/sizes';
import { BlockCell } from './cells';
import { VisionLayer } from './VisionLayer';

/** Tutulan parçanın gölgesi ne kadar aşağı uzar (hücre boyuna oran). */
const LIFT_SHADOW = 0.32;

/** Parçanın tuval boyu (alt kenar gölgesi dahil). */
export function pieceCanvasSize(piece: Piece, cell: number, gap: number, lifted = false) {
  const { rows, cols } = pieceSize(piece);
  const bodyHeight = rows * cell + (rows - 1) * gap;
  return {
    width: cols * cell + (cols - 1) * gap,
    height: bodyHeight + cell * (lifted ? LIFT_SHADOW + 0.2 : cellRatio.edgeShadow),
    /** Gölge hariç gövde yüksekliği */
    bodyHeight,
  };
}

/** `lifted`: tutulan parça; altındaki yumuşak gölge uzar (DEVRE_TASKS 3.5 "Parçayı tutma"). */
export function PieceCanvas({ piece, cell, gap, lifted = false }: { piece: Piece; cell: number; gap: number; lifted?: boolean }) {
  const { width, height } = pieceCanvasSize(piece, cell, gap, lifted);
  const r = cell * cellRatio.radius;
  return (
    <Canvas style={{ width, height }}>
      <VisionLayer>
      {lifted && (
        <Group opacity={0.45}>
          {piece.cells.map(({ r: row, c }) => (
            <RoundedRect key={`s${row},${c}`} x={c * (cell + gap)} y={row * (cell + gap) + cell * LIFT_SHADOW}
              width={cell} height={cell} r={r} color="#0A061E">
              <BlurMask blur={cell * 0.12} style="normal" />
            </RoundedRect>
          ))}
        </Group>
      )}
      {piece.cells.map(({ r: row, c, wires }) => (
        <BlockCell key={`${row},${c}`} x={c * (cell + gap)} y={row * (cell + gap)} size={cell}
          tone={tones[piece.color]} wires={wires} />
      ))}
      </VisionLayer>
    </Canvas>
  );
}

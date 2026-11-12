import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  EntryAnimationsValues,
  SharedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  DRAG_TILT_MAX_DEG,
  DRAG_TILT_PER_VELOCITY,
  DRAG_TILT_SPRING,
  PICKUP_MS,
  PICKUP_SCALE,
  TRAY_STAGGER_MS,
} from '../../anim/constants';
import { pieceSize } from '../../game/pieces';
import type { Piece } from '../../game/types';
import { BoardLayout, cellUnderPiece, dragTopLeft } from '../../render/layout';
import { PieceCanvas, pieceCanvasSize } from '../../render/PieceCanvas';
import { colors } from '../../theme/colors';
import { tray as T } from '../../theme/sizes';

export type SlotView = React.ComponentRef<typeof View>;
/** Bir görünümü oyun ekranının kök görünümüne göre ölçer (pencereye göre değil). */
export type MeasureInRoot = (view: SlotView, cb: (x: number, y: number, w: number, h: number) => void) => void;

export interface DragGeometry {
  /** Sürüklenen parçanın sol üst köşesi (pencere koordinatı) */
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  dragScale: SharedValue<number>;
  /** Hareket yönüne eğilme (derece) */
  tilt: SharedValue<number>;
  /** Tahta panelinin pencere koordinatı */
  boardOrigin: SharedValue<{ x: number; y: number }>;
}

interface Handlers {
  onStart(index: number): void;
  onHover(index: number, r: number, c: number): void;
  onDrop(index: number, r: number, c: number): void;
}

const TRAY_CELL = 26;
export const TRAY_GAP = 3;

/** Tepside parçayı yuvaya sığdıran hücre boyu (tasarımda 26 px, 3 px boşluk). */
export function trayCell(piece: Piece) {
  const { rows, cols } = pieceSize(piece);
  return Math.min(
    TRAY_CELL,
    (T.slotWidth - 12 - (cols - 1) * TRAY_GAP) / cols,
    (T.slotHeight - 16 - (rows - 1) * TRAY_GAP) / rows,
  );
}

/** Yeni tepsi: parçalar alttan sırayla zıplayarak gelir (DEVRE_TASKS 3.5). */
function bounceIn(delay: number) {
  return (_: EntryAnimationsValues) => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 70 }, { scale: 0.5 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 90 })),
        transform: [
          { translateY: withDelay(delay, withSpring(0, { damping: 10, stiffness: 190 })) },
          { scale: withDelay(delay, withSpring(1, { damping: 8, stiffness: 200 })) },
        ],
      },
    };
  };
}

function TraySlot({
  index,
  piece,
  hidden,
  enabled,
  layout,
  geo,
  handlers,
  reduceMotion,
  onSlotRef,
  measureInRoot,
}: {
  index: number;
  piece: Piece | null;
  hidden: boolean;
  enabled: boolean;
  layout: BoardLayout;
  geo: DragGeometry;
  handlers: Handlers;
  reduceMotion: boolean;
  onSlotRef: (index: number, view: SlotView | null) => void;
  measureInRoot: MeasureInRoot;
}) {
  const lastCell = useSharedValue(-1);
  /** Yuvanın oyun ekranı köküne göre konumu: parmak = yuva konumu + dokunuşun yuvadaki yeri */
  const slotOrigin = useSharedValue({ x: 0, y: 0 });
  const viewRef = useRef<SlotView | null>(null);
  const dims = piece ? pieceCanvasSize(piece, layout.cell, layout.gap) : { width: 0, bodyHeight: 0 };
  const { pitch, inset } = layout;
  const lift = T.dragLift;
  const w = dims.width;
  const h = dims.bodyHeight;
  const { dragX, dragY, dragScale, tilt, boardOrigin } = geo;

  // Parmağın kökteki yeri; parça parmağın üstünde çizilir ve gölge AYNI köşeden hesaplanır.
  const fingerOf = (e: { x: number; y: number }) => {
    'worklet';
    return { x: slotOrigin.value.x + e.x, y: slotOrigin.value.y + e.y };
  };
  const follow = (e: { x: number; y: number }) => {
    'worklet';
    const tl = dragTopLeft(fingerOf(e), w, h, lift);
    dragX.set(tl.x);
    dragY.set(tl.y);
    return cellUnderPiece(tl, boardOrigin.value, inset, pitch);
  };

  const pan = usePanGesture({
    minDistance: 0,
    enabled: enabled && piece !== null,
    onBegin: (e) => {
      'worklet';
      follow(e);
      tilt.set(0);
      dragScale.set(1);
      dragScale.set(withTiming(PICKUP_SCALE, { duration: PICKUP_MS }));
      lastCell.set(-1);
      scheduleOnRN(handlers.onStart, index);
    },
    onUpdate: (e) => {
      'worklet';
      const { r, c } = follow(e);
      if (!reduceMotion) {
        const deg = Math.max(-DRAG_TILT_MAX_DEG, Math.min(DRAG_TILT_MAX_DEG, e.velocityX * DRAG_TILT_PER_VELOCITY));
        tilt.set(withSpring(deg, DRAG_TILT_SPRING));
      }
      const k = (r + 50) * 1000 + (c + 50);
      if (k !== lastCell.get()) {
        lastCell.set(k);
        scheduleOnRN(handlers.onHover, index, r, c);
      }
    },
    onFinalize: (e) => {
      'worklet';
      const { r, c } = follow(e);
      scheduleOnRN(handlers.onDrop, index, r, c);
    },
  });

  const setRef = (v: SlotView | null) => {
    viewRef.current = v;
    onSlotRef(index, v);
  };
  const measureSlot = () => {
    if (viewRef.current) measureInRoot(viewRef.current, (x, y) => (slotOrigin.value = { x, y }));
  };

  if (!piece) {
    return <View ref={setRef} style={[styles.slot, styles.emptySlot]} accessibilityLabel="Boş yuva" />;
  }
  const cell = trayCell(piece);
  return (
    <GestureDetector gesture={pan}>
      <View ref={setRef} onLayout={measureSlot} style={styles.slot} accessible accessibilityRole="button"
        accessibilityLabel={`Parça: ${piece.cells.length} hücreli`}>
        <Animated.View entering={reduceMotion ? undefined : bounceIn(index * TRAY_STAGGER_MS)}
          style={{ opacity: hidden ? 0 : 1 }}>
          <PieceCanvas piece={piece} cell={cell} gap={TRAY_GAP} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export function Tray({
  tray,
  dragIndex,
  enabled,
  layout,
  geo,
  handlers,
  reduceMotion,
  onSlotRef,
  measureInRoot,
}: {
  tray: readonly (Piece | null)[];
  dragIndex: number | null;
  enabled: boolean;
  layout: BoardLayout;
  geo: DragGeometry;
  handlers: Handlers;
  reduceMotion: boolean;
  onSlotRef: (index: number, view: SlotView | null) => void;
  measureInRoot: MeasureInRoot;
}) {
  return (
    <View style={[styles.tray, { width: layout.size }]}>
      {tray.map((piece, i) => (
        <TraySlot key={piece ? piece.id : `empty${i}`} index={i} piece={piece} hidden={dragIndex === i}
          enabled={enabled} layout={layout} geo={geo} handlers={handlers} reduceMotion={reduceMotion}
          onSlotRef={onSlotRef} measureInRoot={measureInRoot} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: colors.panel,
    borderWidth: 3,
    borderColor: colors.panelBorder,
  },
  slot: {
    width: T.slotWidth,
    height: T.slotHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    borderRadius: 18,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.slotDashed,
  },
});

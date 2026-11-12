import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { Piece } from '../../game/types';
import { BoardLayout } from '../../render/layout';
import { PieceCanvas, pieceCanvasSize } from '../../render/PieceCanvas';
import type { DragGeometry } from './Tray';

/**
 * Sürüklenen parça: tahta boyunda, parmağın ~60 px üstünde (DEVRE_TASKS 2.3).
 * Konum, ölçek ve eğim tamamen UI iş parçacığındaki paylaşılan değerlerden gelir.
 */
export function DragLayer({ piece, layout, geo }: { piece: Piece | null; layout: BoardLayout; geo: DragGeometry }) {
  const { dragX, dragY, dragScale, tilt } = geo;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: dragScale.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  if (!piece) return null;
  // Büyütme ve eğilme parça gövdesinin merkezinde: büyüse de merkez, gölgenin hesaplandığı yerde kalır.
  const dims = pieceCanvasSize(piece, layout.cell, layout.gap, true);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.piece, { transformOrigin: [dims.width / 2, dims.bodyHeight / 2, 0] }, style]}>
        <PieceCanvas piece={piece} cell={layout.cell} gap={layout.gap} lifted />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', left: 0, top: 0 },
});

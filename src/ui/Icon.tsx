import { Canvas, Group, Path } from '@shopify/react-native-skia';
import React from 'react';

import { colors } from '../theme/colors';

/** Tasarımdaki 24x24 çizgi ikonları. */
export const ICONS = {
  pause: 'M8 5v14M16 5v14',
  play: 'M8 5l11 7-11 7z',
  home: 'M4 11l8-7 8 7M6 10v10h12V10',
  restart: 'M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5',
  back: 'M15 5l-7 7 7 7',
  settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  trophy: 'M7 4h10v5a5 5 0 01-10 0zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4M12 14v4M8 20h8',
  sound: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11',
  hammer: 'M4 20l9-9M11 6l3-3 7 7-3 3z',
  shuffle: 'M3 7h4l10 10h4M18 14l3 3-3 3M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3',
  lock: 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z',
  /** Yıldırım jokeri */
  bolt: 'M13 2L5 13h6l-1 9 9-12h-6z',
  /** Döndür jokeri: saat yönünde ok */
  rotate: 'M20 12a8 8 0 1 1-2.4-5.7M20 3.5v5h-5',
  /** Dükkân: alışveriş çantası */
  shop: 'M5 8h14l-1.2 12H6.2zM9 8V6.5a3 3 0 016 0V8',
  plus: 'M12 5v14M5 12h14',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, color = colors.textOnButton }: { name: IconName; size?: number; color?: string }) {
  const k = size / 24;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ scale: k }]}>
        <Path path={ICONS[name]} style="stroke" strokeWidth={2.5} strokeCap="round" strokeJoin="round" color={color} />
      </Group>
    </Canvas>
  );
}

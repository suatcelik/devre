// Cihaz içi renk görme simülatörü (DEVRE_TASKS 3.2.2): yalnızca geliştirme sürümünde,
// tahtayı ve parçaları seçilen renk görme türüyle görüldüğü gibi çizer.
import { ColorMatrix, Group, Paint } from '@shopify/react-native-skia';
import React, { ReactNode } from 'react';

import { useGameStore } from '../store/gameStore';
import { skiaColorMatrix } from '../theme/colorVision';

export function VisionLayer({ children }: { children: ReactNode }) {
  const vision = useGameStore((s) => s.visionPreview);
  if (vision === 'normal') return <>{children}</>;
  return (
    <Group layer={<Paint><ColorMatrix matrix={skiaColorMatrix(vision)} /></Paint>}>
      {children}
    </Group>
  );
}

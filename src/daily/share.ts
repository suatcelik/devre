// Paylaşım (DEVRE_TASKS 4.9): kartın anlık görüntüsünü PNG olarak sistem paylaşım menüsüne verir.
// Paylaşım kullanılamazsa (ör. bazı emülatörler) düz metin paylaşımına düşer.
import type { CanvasRef } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { formatScore } from '../ui/format';
import { DailyResult, formatDateTr } from './daily';

export function shareText(result: DailyResult, streak: number): string {
  const seri = streak > 1 ? `, ${streak} gün seri` : '';
  return `Devre · Günün Tahtası ${formatDateTr(result.date)}: ${formatScore(result.score)} puan, ${result.circuits} lamba${seri}.`;
}

export async function shareCard(canvas: CanvasRef | null, result: DailyResult, streak: number): Promise<void> {
  const text = shareText(result, streak);
  try {
    if (canvas && (await Sharing.isAvailableAsync())) {
      const image = await canvas.makeImageSnapshotAsync();
      const file = new File(Paths.cache, `devre-${result.date}.png`);
      if (file.exists) file.delete();
      file.create();
      await file.write(image.encodeToBytes());
      await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: text });
      return;
    }
  } catch {
    // Görsel paylaşılamadı: metinle devam.
  }
  await Share.share({ message: text });
}

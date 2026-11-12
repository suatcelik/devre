// Titreşimler (DEVRE_TASKS 3.6.3): yerleştirmede hafif, devrede orta, uzun devrede başarı deseni.
import * as Haptics from 'expo-haptics';

let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export type HapticKind = 'pickup' | 'place' | 'invalid' | 'circuit' | 'longCircuit' | 'line' | 'gameOver';

export function haptic(kind: HapticKind) {
  if (!enabled) return;
  const run = (): Promise<void> => {
    switch (kind) {
      case 'pickup':
        return Haptics.selectionAsync();
      case 'place':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'invalid':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'circuit':
      case 'line':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'longCircuit':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'gameOver':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  // Titreşim desteklenmeyen cihazda sessizce yok sayılır.
  run().catch(() => undefined);
}

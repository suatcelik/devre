// Övgü yazıları (DEVRE_TASKS 3.5.7). Saf fonksiyon; animasyon katmanı kullanır.

export function praiseFor(circuitLength: number, combo: number, double = false): string | null {
  if (combo >= 3) return 'Durdurulamaz!';
  // Aynı hamlede iki lamba birden (DEVRE_TASKS 4.6, çift lamba)
  if (double) return 'Çifte Işık!';
  if (circuitLength >= 12) return 'Süper Devre!';
  if (circuitLength >= 9) return 'Harika!';
  if (circuitLength >= 6) return 'Güzel!';
  return null;
}

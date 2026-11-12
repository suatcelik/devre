// Macera modu bölüm verisi (DEVRE_TASKS 4.3, 4.4).

export type Goal =
  /** N lamba yak (N devre tamamla) */
  | { type: 'lamps'; count: number }
  /** En az L hücrelik bir devre kur */
  | { type: 'circuit'; length: number }
  /** S puana ulaş */
  | { type: 'score'; points: number }
  /** Tahtadaki N kilitli bloğun hepsini kır (DEVRE_TASKS 4.3, 4.6) */
  | { type: 'locked'; count: number };

export interface LevelData {
  id: number;
  /** Ölçümde kullanılan asıl tohum (testler ve yıldız eşikleri bununla). */
  seed: number;
  /**
   * Botun geçebildiği tohumlar: her denemede bunlardan biri rastgele seçilir, böylece bölüm her açılışta
   * farklı parçalarla gelir ama yine geçilebilir kalır (bkz. pickLevelSeed).
   */
  seeds?: number[];
  /** Hamle sınırı */
  moves: number;
  goal: Goal;
  /** Yıldız eşikleri (puan, kalan hamle bonusu dahil): ★1, ★2, ★3. Yıldız için hedef tamamlanmalı. */
  stars: [number, number, number];
  /**
   * Bölüm haritası: 8 satır, 8 karakter. '.' boş, '#' kablosuz engel bloğu.
   * 'B' pil, 'L' lamba (kenarda, köşe değil; ikisi birlikte verilmeli). Verilmezse tohumdan gelir.
   * Engel pil/lambanın üstüne denk gelirse engel atlanır.
   * Onaltılık rakam (1–9, a–f) kilitli bloktur; değer kablo maskesidir (K=1, D=2, G=4, B=8):
   * 'a' = doğu-batı düz, '5' = kuzey-güney düz, '3' = K+D köşe, 'f' = artı.
   * Kutu çizgisi karakteri anahtardır, başlangıç yönüyle: ─ │ ┌ ┐ └ ┘ (her hamleden sonra 90° saat yönünde döner).
   */
  board?: string[];
  /** Yeni bir öğe ilk kez çıktığında bölüm başında gösterilen kısa tanıtım */
  intro?: { title: string; text: string; icon: 'locked' | 'doubleLamp' | 'switch' };
}

export interface Chapter {
  id: number;
  /** Mahalle adı */
  name: string;
  /** Bu mahalledeki bölüm numaraları (dahil) */
  first: number;
  last: number;
}

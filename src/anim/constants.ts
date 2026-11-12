// Animasyon süreleri ve yay ayarları tek yerde (DEVRE_TASKS "Çalışma kuralları").
// İnce ayar yalnızca buradan yapılır.

/** Parçayı tutma: 1.0 → 1.12 büyüme, 120 ms. */
export const PICKUP_SCALE = 1.12;
export const PICKUP_MS = 120;

/** Sürüklerken hareket yönüne eğilme: en çok 6°. Hız (px/s) bu katsayıyla dereceye çevrilir. */
export const DRAG_TILT_MAX_DEG = 6;
export const DRAG_TILT_PER_VELOCITY = 0.006;
export const DRAG_TILT_SPRING = { damping: 18, stiffness: 220 } as const;

/** Bırakma: yerine oturma ve ezilme-esneme 0.9 → 1.06 → 1.0, 180 ms. */
export const DROP_SQUASH_MS = 180;
export const DROP_SQUASH = { from: 0.9, peak: 1.06, peakAt: 0.45 } as const;

/** Geçersiz bırakma: tepsiye yaylanarak dönüş ve hafif sallanma. */
export const RETURN_SPRING = { damping: 15, stiffness: 170, mass: 0.9 } as const;
export const RETURN_SHAKE_DEG = 7;
export const RETURN_SHAKE_STEP_MS = 55;

/** Devre: akım pilden lambaya ilerler, hücre başı 40 ms. */
export const CURRENT_START_MS = 110;
export const CURRENT_STEP_MS = 40;
/** Lamba yandıktan sonra patlamaların başlaması için bekleme. */
export const EXPLODE_DELAY_MS = 120;
/** Hücre patlaması: 30 ms arayla, önce 1.2'ye şişme. */
export const EXPLODE_STAGGER_MS = 30;
export const EXPLODE_SWELL_MS = 90;
export const EXPLODE_SWELL_SCALE = 1.2;

/** Parçacıklar: hücre başına 8–12, yerçekimiyle düşer, 500 ms'de söner. */
export const PARTICLES_MIN = 8;
export const PARTICLES_MAX = 12;
export const PARTICLE_LIFE_MS = 500;
/** Hücre boyu cinsinden yerçekimi (hücre/s²) ve ilk hız (hücre/s) */
export const PARTICLE_GRAVITY = 26;
export const PARTICLE_SPEED = 4.5;

/** Lamba: dairesel ışık dalgası ve kısa ekran parlaması. */
export const LAMP_WAVE_MS = 520;
export const SCREEN_FLASH_PEAK = 0.32;
export const SCREEN_FLASH_IN_MS = 60;
export const SCREEN_FLASH_OUT_MS = 320;

/** Uzun devre (10+ hücre): 4 px ekran sarsıntısı, 200 ms. */
export const LONG_CIRCUIT = 10;
export const SHAKE_PX = 4;
export const SHAKE_MS = 200;

/** Pil ve lamba yeni yerlerinde belirir. */
export const TERMINAL_MOVE_GAP_MS = 140;
export const TERMINAL_VANISH_MS = 150;
export const TERMINAL_APPEAR_MS = 260;

/** Puan: patlayan yerden yukarı uçar, sonra sayaç yuvarlanarak artar. */
export const SCORE_FLY_MS = 620;
export const SCORE_ROLL_MS = 520;

/** Övgü yazısı: büyüyerek gelir, sallanır, kaybolur. */
export const PRAISE_MS = 1300;
export const PRAISE_WOBBLE_DEG = 6;

/** Yeni tepsi: parçalar alttan sırayla zıplayarak gelir, 60 ms arayla. */
export const TRAY_STAGGER_MS = 60;

/** Oyun sonu: kalan bloklar sırayla grileşir, panel yukarıdan düşer. */
export const GAMEOVER_GREY_STAGGER_MS = 28;
export const GAMEOVER_GREY_FADE_MS = 160;
export const GAMEOVER_PANEL_GAP_MS = 220;

/** Bölüm sonu paneli (DEVRE_TASKS 3.7.4): yıldızlar panel düştükten sonra tek tek "çat" diye oturur. */
export const RESULT_STARS_START_MS = 650;
export const RESULT_STAR_STAGGER_MS = 380;
export const STAR_SLAM_FROM = 2.3;
export const STAR_SLAM_MS = 150;
export const STAR_RING_MS = 380;
/** Puan rozeti sıfırdan sayar. */
export const RESULT_COUNT_START_MS = 450;
export const RESULT_COUNT_MS = 900;

/** Konfeti: yıldızlardan sonra yağar; üç yıldızda daha bol. */
export const CONFETTI_MS = 3400;
export const CONFETTI_COUNT = 70;
export const CONFETTI_COUNT_MAX = 120;

/**
 * Gece arka planı (DEVRE_TASKS 3.4.4): üç derinlik katmanında yavaşça sola kayan yıldızlar.
 * Uzaktaki katman daha küçük, daha soluk ve daha yavaştır (px/s).
 */
export const STAR_LAYERS = [
  { count: 18, speed: 2.5, rMin: 0.6, rMax: 1.0, opacity: 0.35 },
  { count: 12, speed: 6, rMin: 0.9, rMax: 1.4, opacity: 0.55 },
  { count: 6, speed: 11, rMin: 1.3, rMax: 1.9, opacity: 0.8 },
] as const;
/** Göz kırpma: her katman üç gruba ayrılır, gruplar farklı ritimde kısılıp parlar. */
export const TWINKLE_GROUPS = 3;
export const TWINKLE_PERIOD_MS = [2600, 3400, 4300] as const;
export const TWINKLE_DEPTH = 0.55;
/** Kayan yıldız: arada bir, ince ve kısa. */
export const SHOOTING_STAR_EVERY_MS = 11000;
export const SHOOTING_STAR_FIRST_MS = 4000;
export const SHOOTING_STAR_MS = 850;
export const SHOOTING_STAR_TRAVEL = 220;
export const SHOOTING_STAR_TAIL = 80;
/** Şehir silüeti çok yavaş kayar (px/s). */
export const SKYLINE_SPEED = 4;

/** Anahtarlar hamle sonunda 90° döner (DEVRE_TASKS 4.6). */
export const SWITCH_TURN_GAP_MS = 40;
export const SWITCH_TURN_MS = 260;

/** Pilin nabzı (DEVRE_TASKS 3.4.2) */
export const BATTERY_PULSE_PERIOD_MS = 1100;
export const BATTERY_PULSE_SCALE = 0.05;

// Jokerler (4.10)
/** Döndür jokeri: blok 90° yumuşakça döner, sonra akım gelir */
export const ROTATE_SPIN_MS = 260;
/** Yıldırım: bloklar yukarıdan aşağı dalga halinde patlar; satırlar arası gecikme */
export const LIGHTNING_ROW_MS = 70;

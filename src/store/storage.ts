import type { DailyResult } from '../daily/daily';
import { EMPTY_INVENTORY, Inventory } from '../game/powerups';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BEST_KEY = 'devre.bestScore';
const SETTINGS_KEY = 'devre.settings';

export interface Settings {
  /** Sarsıntı ve parlamayı kapatır (DEVRE_TASKS 3.5.9). */
  reduceMotion: boolean;
  /** Ses efektleri ve müzik ayrı kapatılır (DEVRE_TASKS 3.6.1). */
  sound: boolean;
  music: boolean;
  haptics: boolean;
  /** Günlük hatırlatma bildirimi (akşam 19:00) */
  reminders: boolean;
}

export const DEFAULT_SETTINGS: Settings = { reduceMotion: false, sound: true, music: true, haptics: true, reminders: true };

export async function loadBest(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(BEST_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export async function saveBest(score: number): Promise<void> {
  try {
    await AsyncStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Saklanamazsa oyun yine de sürer; en iyi puan yalnızca bu oturumda kalır.
  }
}

const PROGRESS_KEY = 'devre.progress';

/** Macera ilerlemesi: bölüm başına en iyi yıldız ve puan (DEVRE_TASKS 4.5). */
export interface Progress {
  stars: Record<number, number>;
  scores: Record<number, number>;
}

export const EMPTY_PROGRESS: Progress = { stars: {}, scores: {} };

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const p = JSON.parse(raw) as Partial<Progress>;
    return { stars: p.stars ?? {}, scores: p.scores ?? {} };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export async function saveProgress(progress: Progress): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Saklanamazsa ilerleme yalnızca bu oturumda kalır.
  }
}

const TUTORIAL_KEY = 'devre.tutorialDone';

export async function loadTutorialDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TUTORIAL_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function saveTutorialDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, '1');
  } catch {
    // Saklanamazsa öğretici bir sonraki açılışta yeniden gösterilir.
  }
}

/** Kayıtlı ayar yoksa null döner; çağıran sistem ayarını varsayılan alır. */
export async function loadSettings(): Promise<Partial<Settings> | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Settings>) : null;
  } catch {
    return null;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ayar yalnızca bu oturumda geçerli kalır.
  }
}

// ---------- Günün Tahtası geçmişi (4.7, 4.8) ve güçlendiriciler (4.10) ----------

const DAILY_KEY = 'devre.daily';
const POWERUPS_KEY = 'devre.powerups';

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Saklanamazsa yalnızca bu oturumda geçerli kalır.
  }
}

export const loadDailyHistory = () => loadJson<Record<string, DailyResult>>(DAILY_KEY, {});
export const saveDailyHistory = (h: Record<string, DailyResult>) => saveJson(DAILY_KEY, h);
export const loadPowerups = () => loadJson<Inventory>(POWERUPS_KEY, EMPTY_INVENTORY);
export const savePowerups = (inv: Inventory) => saveJson(POWERUPS_KEY, inv);

// ---------- İlk açılış tanıtımı ----------

const ONBOARDED_KEY = 'devre.onboarded';

/** Tanıtım ekranları görüldü mü. Öğreticiyi bitirmiş eski oyunculara tanıtım gösterilmez. */
export async function loadOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function saveOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    // Saklanamazsa tanıtım bir sonraki açılışta yeniden gösterilir.
  }
}

// ---------- Altın (jokerler için) ----------

const COINS_KEY = 'devre.coins';

/** Kayıt yoksa (yeni oyuncu ya da altından önceki sürüm) başlangıç altını verilir. */
export async function loadCoins(start: number): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(COINS_KEY);
    if (raw === null) return start;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : start;
  } catch {
    return start;
  }
}

export async function saveCoins(coins: number): Promise<void> {
  try {
    await AsyncStorage.setItem(COINS_KEY, String(coins));
  } catch {
    // Saklanamazsa altın yalnızca bu oturumda geçerli kalır.
  }
}

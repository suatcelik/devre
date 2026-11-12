// Günün Tahtası ve seri (DEVRE_TASKS 4.7, 4.8). Saf mantık: tarih hesapları, seri, haftalık görünüm.

import type { DailyMove } from '../online/verify';

export interface DailyResult {
  /** "2026-11-11" */
  date: string;
  score: number;
  circuits: number;
  longest: number;
  /** Oyun bitti mi; false ise yarıda bırakıldı (yine de günün denemesi sayılır) */
  finished: boolean;
  /** Son tahtanın kısa yazımı (paylaşım kartı için, bkz. boardCode) */
  board?: string;
  /** Hamle listesi: sunucu bununla puanı yeniden hesaplar (5.4) */
  moves?: DailyMove[];
  /** Sunucuya gönderildi ve doğrulandı mı (5.5: çevrimdışıyken sonra gönderilir) */
  submitted?: boolean;
}

/** Tarih → "YYYY-AA-GG" (yerel saat) */
export function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** "YYYY-AA-GG" → yerel gece yarısı */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/**
 * Seri: bugünden (bugün oynanmadıysa dünden) geriye art arda oynanan gün sayısı.
 * Bugün henüz oynanmadıysa dünkü seri bozulmuş sayılmaz.
 */
export function streak(history: Record<string, DailyResult>, today: string): number {
  let day = history[today] ? today : addDays(today, -1);
  let n = 0;
  while (history[day]) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** En uzun seri (tüm geçmiş) */
export function bestStreak(history: Record<string, DailyResult>): number {
  let best = 0;
  for (const key of Object.keys(history)) {
    if (history[addDays(key, -1)]) continue; // serinin başı değil
    let n = 0;
    for (let day = key; history[day]; day = addDays(day, 1)) n++;
    best = Math.max(best, n);
  }
  return best;
}

export interface WeekDay {
  key: string;
  /** "Pzt" … "Paz" */
  label: string;
  played: boolean;
  score: number | null;
  isToday: boolean;
  isFuture: boolean;
}

const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/** Bugünü içeren haftanın günleri, pazartesiden pazara (4.8 haftalık görünüm). */
export function weekView(history: Record<string, DailyResult>, today: string): WeekDay[] {
  const t = parseKey(today);
  const mondayOffset = (t.getDay() + 6) % 7; // pazartesi = 0
  const monday = addDays(today, -mondayOffset);
  return DAY_LABELS.map((label, i) => {
    const key = addDays(monday, i);
    const h = history[key];
    return { key, label, played: !!h, score: h ? h.score : null, isToday: key === today, isFuture: key > today };
  });
}

/** Bir sonraki Günün Tahtası'na kalan süre: "5 sa 12 dk" */
export function timeUntilTomorrow(now: Date): string {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const minutes = Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
}

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** "2026-11-11" → "11 Kasım 2026" */
export function formatDateTr(key: string): string {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

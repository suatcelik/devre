// Çevrimdışı çalışma (DEVRE_TASKS 5.5): oyun internetsiz tam oynanır; Günün Tahtası sonucu
// bağlantı gelince gönderilir. Saf mantık: hangi sonuçların gönderileceği ve yanıtların işlenmesi.

import { addDays, DailyResult } from '../daily/daily';

/** Sunucu yanıtının sınıfı */
export type SubmitOutcome =
  /** Kabul edildi */
  | 'ok'
  /** Bu gün zaten gönderilmiş (409): yine de gönderilmiş say */
  | 'duplicate'
  /** Reddedildi (geçersiz hamle, eski tarih): bir daha deneme */
  | 'rejected'
  /** Ağ ya da sunucu hatası: sonra yeniden dene */
  | 'retry';

/**
 * Gönderilmeyi bekleyen sonuçlar: henüz gönderilmemiş, hamlesi olan ve günü kapanmış
 * (oyun bitti ya da tarih geçti) sonuçlar. Sunucu en fazla bir gün geriyi kabul ettiği için
 * daha eski olanlar beklemeden çıkarılır.
 */
export function pendingSubmissions(history: Record<string, DailyResult>, today: string): DailyResult[] {
  const oldest = addDays(today, -1);
  return Object.values(history)
    .filter((r) => r.submitted === false && r.moves && r.date >= oldest && (r.finished || r.date < today))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Süresi geçmiş (artık gönderilemeyecek) sonuçlar: tekrar denenmesin diye işaretlenir. */
export function expiredSubmissions(history: Record<string, DailyResult>, today: string): string[] {
  const oldest = addDays(today, -1);
  return Object.values(history)
    .filter((r) => r.submitted === false && r.date < oldest)
    .map((r) => r.date);
}

/**
 * Bekleyenleri sırayla gönderir; yanıtlara göre geçmişi günceller.
 * 'retry' alan ilk gönderimde durur (bağlantı yok demektir).
 */
export async function flushDaily(
  history: Record<string, DailyResult>,
  today: string,
  submit: (r: DailyResult) => Promise<SubmitOutcome>,
): Promise<{ history: Record<string, DailyResult>; sent: number; changed: boolean }> {
  const next = { ...history };
  let changed = false;
  for (const date of expiredSubmissions(history, today)) {
    next[date] = { ...next[date], submitted: true };
    changed = true;
  }
  let sent = 0;
  for (const r of pendingSubmissions(history, today)) {
    const outcome = await submit(r);
    if (outcome === 'retry') break;
    // Kabul, zaten var ya da kalıcı ret: hepsinde artık bekletme yok.
    next[r.date] = { ...next[r.date], submitted: true };
    changed = true;
    if (outcome === 'ok') sent++;
  }
  return { history: next, sent, changed };
}

/** HTTP durum kodunu sınıfa çevirir. */
export function classifyStatus(status: number | null): SubmitOutcome {
  if (status === null) return 'retry';
  if (status >= 200 && status < 300) return 'ok';
  if (status === 409) return 'duplicate';
  if (status === 400 || status === 422) return 'rejected';
  return 'retry';
}

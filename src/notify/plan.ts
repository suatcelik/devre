// Günlük hatırlatma planı: saf mantık, bildirim modülünden bağımsız (test edilebilir).
// Önümüzdeki günlerin her biri için hatırlatma saatinde bir bildirim; bugünün tahtası oynandıysa bugünkü atlanır.
// Uygulama her açıldığında plan yeniden kurulur, böylece seri ve sıradaki bölüm güncel kalır.

import { addDays, streak, type DailyResult } from '../daily/daily';

/** Hatırlatma saati (yerel saat) */
export const REMINDER_HOUR = 19;
export const REMINDER_MINUTE = 0;
/** Kaç gün ilerisi planlanır (uygulama açılmasa da bir hafta boyunca hatırlatır) */
export const PLAN_DAYS = 7;

export interface Reminder {
  date: Date;
  title: string;
  body: string;
}

const GENERIC: readonly { title: string; body: string }[] = [
  { title: 'Günün Tahtası hazır!', body: 'Bugün herkes aynı tahtayı oynuyor. Kıvılcım seni bekliyor!' },
  { title: 'Şehir karanlıkta kaldı', body: 'Birkaç lamba yakmaya ne dersin? Günün Tahtası seni bekliyor.' },
  { title: 'Kıvılcım seni özledi!', body: 'Pilden lambaya bir yol kur, bugünün puanını yaz.' },
  { title: 'Yeni gün, yeni tahta', body: 'Bugünün tahtası açıldı. Arkadaşlarından yüksek puan alabilecek misin?' },
];

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * @param now şu an
 * @param history Günün Tahtası geçmişi (seri ve "bugün oynandı mı" için)
 * @param nextLevelId Macera'da sıradaki bölüm (ara sıra ona çağırır)
 */
export function planReminders(
  now: Date,
  history: Record<string, DailyResult>,
  nextLevelId: number,
  days = PLAN_DAYS,
): Reminder[] {
  const today = dateKey(now);
  const playedToday = !!history[today];
  const out: Reminder[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
    if (date.getTime() <= now.getTime()) continue;
    if (i === 0 && playedToday) continue;
    const key = dateKey(date);
    // O gün akşamına kadar oynamazsa bozulacak seri: bugün için bugünkü seri, sonraki günler için bilinmez.
    const run = i === 0 ? streak(history, addDays(today, -1)) : 0;
    if (run >= 2) {
      out.push({ date, title: `${run} günlük serin tehlikede!`, body: 'Bugünün tahtasını oyna, serin bozulmasın.' });
      continue;
    }
    // Her üç günde bir Macera'ya çağır; diğer günler dönüşümlü genel mesaj.
    const n = Number(key.slice(-2));
    if (n % 3 === 0) {
      out.push({ date, title: `Bölüm ${nextLevelId} seni bekliyor`, body: 'Altın kazan, yeni jokerler al, mahalleyi aydınlat!' });
    } else {
      out.push({ date, ...GENERIC[n % GENERIC.length] });
    }
  }
  return out;
}

import { newGame } from '../../game/engine';
import { encodeBoard } from '../boardCode';
import { DailyResult, addDays, bestStreak, dateKey, streak, formatDateTr, timeUntilTomorrow, weekView } from '../daily';

const played = (...keys: string[]): Record<string, DailyResult> =>
  Object.fromEntries(keys.map((k) => [k, { date: k, score: 100, circuits: 1, longest: 6, finished: true }]));

describe('Günün Tahtası ve seri', () => {
  it('tarih anahtarı ve gün ekleme ay/yıl sınırında doğru', () => {
    expect(dateKey(new Date(2026, 10, 11))).toBe('2026-11-11');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('seri: bugün dahil art arda günler', () => {
    expect(streak(played('2026-11-09', '2026-11-10', '2026-11-11'), '2026-11-11')).toBe(3);
  });

  it('bugün henüz oynanmadıysa dünkü seri bozulmaz', () => {
    expect(streak(played('2026-11-09', '2026-11-10'), '2026-11-11')).toBe(2);
  });

  it('bir gün atlanınca seri sıfırlanır', () => {
    expect(streak(played('2026-11-08', '2026-11-09'), '2026-11-11')).toBe(0);
    expect(streak({}, '2026-11-11')).toBe(0);
  });

  it('en uzun seri tüm geçmişten', () => {
    expect(bestStreak(played('2026-10-01', '2026-10-02', '2026-10-03', '2026-11-10', '2026-11-11'))).toBe(3);
    expect(bestStreak({})).toBe(0);
  });

  it('haftalık görünüm pazartesiden başlar, bugünü ve geleceği işaretler', () => {
    // 2026-11-11 çarşamba
    const week = weekView(played('2026-11-09', '2026-11-11'), '2026-11-11');
    expect(week.map((d) => d.label)).toEqual(['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']);
    expect(week[0].key).toBe('2026-11-09');
    expect(week.map((d) => d.played)).toEqual([true, false, true, false, false, false, false]);
    expect(week[2].isToday).toBe(true);
    expect(week[3].isFuture).toBe(true);
    // Pazar günü haftanın son günü
    expect(weekView({}, '2026-11-15')[6].isToday).toBe(true);
  });

  it('yarına kalan süre', () => {
    expect(timeUntilTomorrow(new Date(2026, 10, 11, 18, 48))).toBe('5 sa 12 dk');
    expect(timeUntilTomorrow(new Date(2026, 10, 11, 23, 30))).toBe('30 dk');
  });
});


describe('paylaşım yardımcıları', () => {
  it('Türkçe tarih', () => {
    expect(formatDateTr('2026-11-11')).toBe('11 Kasım 2026');
    expect(formatDateTr('2027-02-01')).toBe('1 Şubat 2027');
  });

  it('tahta kodu 64 karakter, pil ve lamba görünür', () => {
    const code = encodeBoard(newGame(5).board);
    expect(code).toHaveLength(64);
    expect(code.split('B')).toHaveLength(2);
    expect(code.split('L')).toHaveLength(2);
  });
});

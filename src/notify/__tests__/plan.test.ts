import type { DailyResult } from '../../daily/daily';
import { PLAN_DAYS, REMINDER_HOUR, planReminders } from '../plan';

const played = (date: string): DailyResult => ({ date, score: 100, circuits: 1, longest: 5, finished: true });

describe('günlük hatırlatma planı', () => {
  it('saat geçmediyse bugünden başlar, her gün hatırlatma saatinde, bir hafta', () => {
    const now = new Date(2026, 10, 12, 10, 0);
    const plan = planReminders(now, {}, 5);
    expect(plan).toHaveLength(PLAN_DAYS);
    plan.forEach((r, i) => {
      expect(r.date.getDate()).toBe(12 + i);
      expect(r.date.getHours()).toBe(REMINDER_HOUR);
      expect(r.date.getMinutes()).toBe(0);
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.body.length).toBeGreaterThan(0);
    });
  });

  it('saat geçtiyse ya da bugünün tahtası oynandıysa bugünkü atlanır', () => {
    expect(planReminders(new Date(2026, 10, 12, 20, 0), {}, 5)[0].date.getDate()).toBe(13);
    const history = { '2026-11-12': played('2026-11-12') };
    expect(planReminders(new Date(2026, 10, 12, 9, 0), history, 5)[0].date.getDate()).toBe(13);
  });

  it('seri varsa bugünkü hatırlatma seriyi söyler', () => {
    const history = { '2026-11-10': played('2026-11-10'), '2026-11-11': played('2026-11-11') };
    const [today] = planReminders(new Date(2026, 10, 12, 9, 0), history, 5);
    expect(today.title).toBe('2 günlük serin tehlikede!');
  });

  it('ara sıra Macera\'daki sıradaki bölüme çağırır', () => {
    const plan = planReminders(new Date(2026, 10, 12, 9, 0), {}, 42);
    expect(plan.some((r) => r.title === 'Bölüm 42 seni bekliyor')).toBe(true);
  });

  it('ay sonunu doğru geçer', () => {
    const plan = planReminders(new Date(2026, 10, 29, 9, 0), {}, 1);
    expect(plan.map((r) => r.date.getDate())).toEqual([29, 30, 1, 2, 3, 4, 5]);
  });
});

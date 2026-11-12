import type { DailyResult } from '../../daily/daily';
import { classifyStatus, expiredSubmissions, flushDaily, pendingSubmissions } from '../sync';

const entry = (date: string, extra: Partial<DailyResult> = {}): DailyResult => ({
  date,
  score: 100,
  circuits: 1,
  longest: 6,
  finished: true,
  moves: [{ i: 0, r: 0, c: 0 }],
  submitted: false,
  ...extra,
});

const today = '2026-11-12';

describe('çevrimdışı gönderim kuyruğu', () => {
  it('biten ya da günü geçmiş, gönderilmemiş sonuçlar bekler; bugün süren oyun beklemez', () => {
    const h = {
      '2026-11-12': entry('2026-11-12', { finished: false }),
      '2026-11-11': entry('2026-11-11', { finished: false }),
      '2026-11-10': entry('2026-11-10'),
    };
    expect(pendingSubmissions(h, today).map((r) => r.date)).toEqual(['2026-11-11']);
    expect(pendingSubmissions({ [today]: entry(today) }, today).map((r) => r.date)).toEqual([today]);
  });

  it('gönderilmiş ya da hamlesi olmayan (eski sürüm) sonuçlar beklemez', () => {
    const h = { [today]: entry(today, { submitted: true }), '2026-11-11': entry('2026-11-11', { moves: undefined }) };
    expect(pendingSubmissions(h, today)).toEqual([]);
  });

  it('bir günden eski olanlar süresi geçmiş sayılır ve bir daha denenmez', () => {
    expect(expiredSubmissions({ '2026-11-10': entry('2026-11-10') }, today)).toEqual(['2026-11-10']);
  });

  it('kabul ve zaten-var gönderilmiş işaretlenir; ağ hatasında durur ve sonrakiler bekler', async () => {
    const h = { '2026-11-11': entry('2026-11-11'), '2026-11-12': entry(today) };
    const ok = await flushDaily(h, today, async () => 'ok');
    expect(ok.sent).toBe(2);
    expect(Object.values(ok.history).every((r) => r.submitted)).toBe(true);

    const calls: string[] = [];
    const offline = await flushDaily(h, today, async (r) => {
      calls.push(r.date);
      return 'retry';
    });
    expect(calls).toEqual(['2026-11-11']);
    expect(offline.changed).toBe(false);
    expect(offline.history['2026-11-12'].submitted).toBe(false);

    const dup = await flushDaily({ [today]: entry(today) }, today, async () => 'duplicate');
    expect(dup.history[today].submitted).toBe(true);
    expect(dup.sent).toBe(0);
  });

  it('HTTP durumları', () => {
    expect(classifyStatus(200)).toBe('ok');
    expect(classifyStatus(409)).toBe('duplicate');
    expect(classifyStatus(422)).toBe('rejected');
    expect(classifyStatus(400)).toBe('rejected');
    expect(classifyStatus(401)).toBe('retry');
    expect(classifyStatus(500)).toBe('retry');
    expect(classifyStatus(null)).toBe('retry');
  });
});

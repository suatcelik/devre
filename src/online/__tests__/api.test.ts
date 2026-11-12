import { cleanNickname, onlineConfigured } from '../api';

describe('çevrimiçi istemci', () => {
  it('takma ad: boşluklar sadeleşir; 2–16 karakter; boş bırakılırsa silinir', () => {
    expect(cleanNickname('  Kıvılcım   Avcısı ')).toBe('Kıvılcım Avcısı');
    expect(cleanNickname('')).toBeNull();
    expect(cleanNickname('   ')).toBeNull();
    expect(cleanNickname('A')).toBeUndefined();
    expect(cleanNickname('x'.repeat(17))).toBeUndefined();
    expect(cleanNickname('Ab')).toBe('Ab');
  });

  it('.env yokken çevrimiçi özellikler kapalı (oyun çevrimdışı tam çalışır)', () => {
    expect(onlineConfigured).toBe(false);
  });
});

import { formatScore, withAccusative } from '../format';

describe('biçimlendirme', () => {
  it('binlik ayırıcı', () => {
    expect(formatScore(0)).toBe('0');
    expect(formatScore(2050)).toBe('2.050');
    expect(formatScore(1234567)).toBe('1.234.567');
  });

  it.each([
    [1, "1'i"],
    [2, "2'yi"],
    [3, "3'ü"],
    [4, "4'ü"],
    [5, "5'i"],
    [6, "6'yı"],
    [7, "7'yi"],
    [8, "8'i"],
    [9, "9'u"],
    [10, "10'u"],
    [12, "12'yi"],
    [20, "20'yi"],
    [30, "30'u"],
    [40, "40'ı"],
    [50, "50'yi"],
    [60, "60'ı"],
    [70, "70'i"],
    [80, "80'i"],
    [90, "90'ı"],
    [100, "100'ü"],
    [1000, "1000'i"],
  ])('%i → %s', (n, expected) => {
    expect(withAccusative(n)).toBe(expected);
  });
});

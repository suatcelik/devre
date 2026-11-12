/** 2050 → "2.050" (Türkçe binlik ayırıcı; Intl'e bağlı değil). */
export function formatScore(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Belirtme hâli eki sayının okunuşunun son kelimesine göre seçilir (ünlü uyumu + kaynaştırma):
// 1 bir'i, 2 iki'yi, 3 üç'ü, 6 altı'yı, 9 dokuz'u, 10 on'u, 40 kırk'ı ...
const ONES = ["'i", "'yi", "'ü", "'ü", "'i", "'yı", "'yi", "'i", "'u"]; // 1..9
const TENS = ["'u", "'yi", "'u", "'ı", "'yi", "'ı", "'i", "'i", "'ı"]; // 10..90
const HUNDRED = "'ü"; // yüz, ve bin için "'i"

/** 12 → "12'yi", 40 → "40'ı", 100 → "100'ü" */
export function withAccusative(n: number): string {
  const ones = n % 10;
  const tens = Math.floor(n / 10) % 10;
  let suffix: string;
  if (ones) suffix = ONES[ones - 1];
  else if (tens) suffix = TENS[tens - 1];
  else if (n % 1000 === 0 && n > 0) suffix = "'i";
  else suffix = HUNDRED;
  return `${n}${suffix}`;
}

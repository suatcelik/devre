# Çevrimiçi Kurulum (Supabase)

## Kurulu proje (12 Kasım 2026)

| | |
|---|---|
| Proje | `devre` · ref `oqgxwqlbcrbmrbyvcdhn` · organizasyon "vela" · Frankfurt (eu-central-1) |
| Pano | https://supabase.com/dashboard/project/oqgxwqlbcrbmrbyvcdhn |
| Uygulama bağlantısı | `.env` (git dışı): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Veritabanı parolası | `supabase/.temp/db-password` (git dışı; Expo okumaz). Kaybedilirse panodan sıfırlanabilir. |

Yapılanlar: şema (`db push`), anonim giriş (`config push`), `submit-daily` fonksiyonu (`functions deploy`).
Aşağıdaki adımlar yeni bir proje kurmak ya da değişiklikleri yeniden yüklemek içindir.

Devre'nin çevrimiçi özellikleri (DEVRE_TASKS Faz 5): anonim giriş, takma ad, Günün Tahtası sıralaması,
arkadaş kodu ve hile önleme. **Bu adımlar yapılmadan oyun tamamen çevrimdışı çalışır**; sıralama ekranı
"Sıralama yakında" der.

## 1. Proje

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluşturun (bölge: size yakın, ör. Frankfurt).
2. **Authentication → Sign In / Providers → Anonymous sign-ins** seçeneğini açın.
   Kötüye kullanıma karşı aynı sayfadaki hız sınırlarını (rate limits) varsayılanda bırakın.

## 2. Veritabanı

`supabase/migrations/20261112000000_devre_online.sql` dosyasını uygulayın:

- **Kolay yol:** Supabase panosu → SQL Editor → dosyanın içeriğini yapıştırıp çalıştırın.
- **CLI ile:** `npx supabase link --project-ref <proje-kimliği>` ardından `npx supabase db push`.

Kurulanlar:

| Nesne | Ne işe yarar |
|---|---|
| `profiles` | Her anonim oyuncuya otomatik profil ve 6 karakterlik arkadaş kodu. Yalnız takma ad değiştirilebilir. |
| `daily_scores` | Günün Tahtası puanları. **İstemci yazamaz**; yalnız sunucu fonksiyonu yazar. Günde tek kayıt. |
| `friends` | Arkadaşlıklar; yalnız `add_friend(kod)` ile, iki yönlü eklenir. |
| `daily_leaderboard`, `friends_leaderboard`, `my_daily_rank` | Sıralama sorguları. |

## 3. Sunucu fonksiyonu (hile önleme)

İstemci puanı değil **hamle listesini** gönderir; `submit-daily` fonksiyonu oyunu aynı tohumla baştan
oynatıp puanı kendisi hesaplar (`src/online/verify.ts`).

```bash
npm run build:functions                     # oyun modülünü supabase/functions/_shared/verify.js olarak paketler
npx supabase functions deploy submit-daily  # Supabase'e yükler
```

Oyun kuralları (`src/game`) her değiştiğinde **önce `npm run build:functions`, sonra yeniden dağıtın**.
Unutulursa testlerdeki "sunucu paketi güncel" testi başarısız olur.

## 4. Uygulama

`.env.example` dosyasını `.env` olarak kopyalayıp doldurun (Project Settings → API):

```
EXPO_PUBLIC_SUPABASE_URL=https://<proje-kimliği>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public anahtarı>
```

`service_role` anahtarını **asla** `.env`'e ya da uygulamaya koymayın; o yalnız sunucu fonksiyonunda,
Supabase'in kendi ortam değişkeni olarak bulunur. Ardından `npx expo start --clear` ile yeniden başlatın.

## Çevrimdışı davranış

- Oyun internetsiz tam oynanır.
- Günün Tahtası sonucu oyun bitince gönderilir; bağlantı yoksa kuyrukta bekler ve uygulama
  her öne geldiğinde yeniden denenir.
- Sunucu, saat dilimi farkı için en fazla bir gün eski sonucu kabul eder; daha eski bekleyen
  sonuçlar gönderilmeden kapanır.

## Canlı doğrulama

Kurulumdan sonra canlı projeye karşı uçtan uca sınandı (iki anonim test oyuncusu; sonunda silindi):

- Anonim giriş; profil ve arkadaş kodu otomatik; iki oyuncunun kodu farklı.
- Takma ad güncellenir; arkadaş kodu ve başkasının profili değiştirilemez.
- Devre içeren gerçek bir oyunda (1 lamba, 1.870 puan, 50 hamle) sunucu birebir aynı puanı hesapladı.
- Aynı gün ikinci gönderim 409, geçersiz hamleler 422, eski tarih 400, oturumsuz gönderim 401.
- İstemci `daily_scores` tablosuna doğrudan yazamaz (satır düzeyi güvenlik).
- Arkadaş ekleme (kendini ekleme ve olmayan kod reddedilir), iki yönlü arkadaşlık, iki sıralama.

Henüz denenmeyen: uygulamanın kendisinin (Expo Go) bu projeye bağlanması.

## Bilinmesi gerekenler

- `config push`, `supabase/config.toml` içindeki yerel varsayılanları da projeye gönderdi (ör. e-posta
  doğrulaması kapalı). Oyun yalnız anonim giriş kullandığı için etkisi yok; ileride e-postayla giriş
  eklenirse panodan Authentication ayarları gözden geçirilmeli.
- Kural değişikliğinden sonra: `npm run build:functions` ve `npx supabase functions deploy submit-daily --use-api`.

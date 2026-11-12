# DEVRE — Geliştirme Görev Dosyası

React Native (Expo) ile geliştirilecek, reklamsız ve satın alımsız bulmaca oyunu.
Bu dosya yukarıdan aşağıya sırayla uygulanacak şekilde yazıldı. Her görev tek oturumda bitirilebilecek boyuttadır.

**Öncelik sırası:** Önce oynanış kanıtlanır (Faz 1–2), sonra emeğin büyük kısmı tasarıma harcanır (Faz 3). Faz 3 bu projenin kalbidir; oyunu ayakta tutacak olan odur.

---

## 0. Oyunun özeti

- 8x8 tahta. Kenarda bir **pil** ve bir **lamba** durur.
- Oyuncu alttaki tepsiden 3 parçadan birini sürükleyip tahtaya bırakır. Her parçanın hücrelerinde **kablo** çizgileri vardır.
- Pilden lambaya kesintisiz bir kablo yolu oluşunca **devre tamamlanır**: akım yolu boyunca ilerler, yoldaki hücreler patlar, puan gelir, pil ve lamba yeni yerlere geçer.
- Tepsideki hiçbir parça tahtaya sığmıyorsa oyun biter.
- Süre yok, can yok, bekleme yok, reklam yok.

### Kesinleşmiş kurallar (v1)

| Konu | Karar |
|---|---|
| Tahta | 8x8 |
| Parçalar | 1–4 hücreli; döndürülemez |
| Kablo türleri | düz, köşe, T, artı, boş |
| Tepsi | 3 parça; üçü de yerleşince yenilenir |
| Devre puanı | yol uzunluğu × yol uzunluğu × 10 |
| Kombo | Art arda hamlelerde devre tamamlanırsa çarpan +1 |
| Emniyet supabı | Tam dolan satır/sütun da temizlenir (hücre başı 10 puan) |
| Parça üretimi | Tohumlu (seed) rastgele; en az bir parça her zaman sığar |

### Oynatarak karar verilecekler

- [ ] Emniyet supabı (satır/sütun temizleme) oyunu fazla kolaylaştırıyor mu?
- [ ] Parça döndürme eklenmeli mi?
- [ ] Aynı anda 2 pil / 2 lamba olunca oyun daha mı eğlenceli?
- [ ] Ortalama oyun süresi 3–6 dakika aralığında mı?

---

## Faz 1 — Çekirdek oyun mantığı (ekran yok, saf TypeScript)

Amaç: Kuralların tamamı test edilebilir, arayüzden bağımsız bir modülde çalışsın.

- [x] 1.1 Expo projesi kur (TypeScript, ESLint, Jest).
- [x] 1.2 `src/game/types.ts`: `Cell`, `WireDirs (N/E/S/W)`, `Piece`, `Board`, `GameState`.
- [x] 1.3 `src/game/rng.ts`: tohumlu rastgele sayı üreteci (günlük tahta için şart).
- [x] 1.4 `src/game/pieces.ts`: parça şekilleri kataloğu + her hücreye kablo atayan üretici.
- [x] 1.5 `canPlace(board, piece, row, col)` ve `place(...)`.
- [x] 1.6 `findCircuit(board)`: pilden başlayan BFS; iki komşu hücre ancak karşılıklı kablo uçları varsa bağlıdır. Lambaya ulaşan yolu döndürür.
- [x] 1.7 `resolve(board)`: devre temizleme, satır/sütun temizleme, puan ve kombo hesabı, pil/lamba yer değiştirme. Sonucu **olay listesi** olarak döndür (`PLACED`, `CIRCUIT_COMPLETE {path}`, `LINE_CLEAR`, `SCORE`, `GAME_OVER`). Animasyon katmanı bu olayları oynatacak.
- [x] 1.8 `isGameOver(board, tray)`.
- [x] 1.9 Parça üreticisine adalet kuralı: tepsideki en az bir parça sığmalı; açık kablo uçlarına uyan parçaların gelme olasılığı artırılmalı.
- [x] 1.10 Jest testleri: yerleştirme, bağlantı (her kablo türü), temizleme, puan, oyun sonu, aynı tohum = aynı parça dizisi.

**Bitti sayılır:** Testler geçiyor; aynı tohumla iki oyun birebir aynı ilerliyor.

---

## Faz 2 — Oynanabilir prototip (çirkin ama çalışan)

Amaç: Oyunun eğlenceli olup olmadığını **tasarıma emek harcamadan önce** öğrenmek.

- [x] 2.1 Kütüphaneler: `@shopify/react-native-skia`, `react-native-reanimated`, `react-native-gesture-handler`, `zustand`.
- [x] 2.2 Tahtayı tek bir Skia `Canvas` içinde düz renklerle çiz.
- [x] 2.3 Tepsiden sürükle-bırak. Parça parmağın **üstünde** dursun (parmak parçayı kapatmasın, ~60 px yukarı kaydır).
- [x] 2.4 Bırakılacak yerde hayalet önizleme; geçersiz yerde önizleme yok.
- [x] 2.5 Önizleme sırasında tamamlanacak devreyi önceden parlat (oyuncu ne olacağını bırakmadan görsün).
- [x] 2.6 Puan, en iyi puan, oyun bitti ekranı, yeniden başlat.
- [x] 2.7 En iyi puanı cihazda sakla.
- [ ] 2.8 **Test:** En az 10 kişiye oynat (Bilim Erzurum ziyaretçileri uygun). Kural açıklamadan ver; 30 saniyede çözebiliyorlar mı, ikinci oyunu kendileri başlatıyorlar mı not et.

**Bitti sayılır:** Test edenlerin çoğu kendiliğinden ikinci oyunu açıyor. Açmıyorsa Faz 3'e geçme, kuralları düzelt.

---

## Faz 3 — TASARIM VE "TATLILIK" (en önemli faz)

Hedef his: Candy Crush Saga tarzı; parlak, renkli, dokunası gelen parçalar ve her dokunuşa abartılı, tatmin edici tepki.

> Not: Candy Crush'ın görselleri, karakterleri ve şeker teması kopyalanmaz (telif sorunu ve mağaza reddi olur). Alınacak olan **tasarım ilkeleridir**; kimlik Devre'ye özgü olacak.

### 3.0 O hissi yaratan 6 ilke

1. **Doygun renk, sakin zemin.** Parçalar canlı; arka plan koyu ve yumuşak ki parçalar öne çıksın.
2. **Dokunulabilir parçalar.** Düz kare yok; yuvarlak köşe, üstte parlama, altta gölge ile "jöle/cam" hissi.
3. **Her harekete tepki.** Tutma, bırakma, patlama: her birinde hareket + ses + titreşim.
4. **Büyüyen ödül.** Uzun devre = daha büyük efekt, daha yüksek ses, ekranda övgü yazısı.
5. **İlerleme hissi.** Harita üzerinde bölüm bölüm ilerleme, yıldızlar.
6. **Sevimli bir yüz.** Oyuna kişilik veren özgün bir maskot.

### 3.1 Kimlik: "Karanlık şehri aydınlat"

- **Tema:** Gece vakti bir şehir. Her tamamlanan devre bir lambayı, her bölüm bir mahalleyi aydınlatır. Harita ilerledikçe şehir ışıl ışıl olur.
- **Maskot:** "Kıvılcım" — küçük, yuvarlak, gözleri olan bir ışık damlası. Tepside bekler, devre tamamlanınca sevinir, oyun bitince üzülür.
- [x] 3.1.1 Kıvılcım'ı 4 pozda çiz: bekleme, sevinme, şaşırma, üzülme (SVG veya Rive).
- [x] 3.1.2 Uygulama ikonu: parlak sarı Kıvılcım, mor zemin.

### 3.2 Renk paleti

| Kullanım | Renk |
|---|---|
| Arka plan (üst → alt geçiş) | `#2A1B5E` → `#151033` |
| Tahta paneli | `#3A2A7A`, iç gölgeli |
| Boş hücre | `#2F2168` |
| Parça: pembe | `#FF5C8A` |
| Parça: turuncu | `#FF9A3D` |
| Parça: sarı | `#FFD23F` |
| Parça: yeşil | `#3DDC84` |
| Parça: mavi | `#3DB8FF` |
| Parça: mor | `#A56BFF` |
| Sönük kablo | `#FFF3D6`, %70 opak |
| Akım geçen kablo | `#FFFBE0` + `#FFD23F` dış parlama |
| Ana düğme | `#3DDC84`, alt kenarı `#1FA85F` |
| Yazı | `#FFFFFF`, ikincil `#CFC4F5` |

- Parça rengi yalnızca görseldir, kurala etkisi yoktur (her parça şeklinin sabit bir rengi olur).
- [x] 3.2.1 Renkleri `src/theme/colors.ts` içinde tek yerde tanımla.
- [x] 3.2.2 Renk körlüğü kontrolü: kablolar renge değil **parlaklığa** dayanmalı; simülatörle doğrula.

### 3.3 Yazı tipi

- Başlık ve puan: **Baloo 2** (kalın, yuvarlak). Gövde: **Nunito**. İkisi de ücretsiz ve Türkçe karakterleri destekler.
- Puan ve övgü yazılarında koyu dış çizgi + alt gölge (çizgi film etkisi).
- [x] 3.3.1 Yazı tiplerini `expo-font` ile yükle; `Text` sarmalayıcı bileşeni yaz.

### 3.4 Parçaların çizimi (Skia, kodla; görsel dosyası gerekmez)

Her hücre şu katmanlardan oluşur:

1. Alt gölge: aynı rengin %30 koyusu, 4 px aşağı kaydırılmış.
2. Gövde: yuvarlak köşeli kare (köşe = hücre boyunun %22'si), yukarıdan aşağıya hafif renk geçişi.
3. Üst parlama: üst üçte birde beyaz, %35 opak, yumuşak kenarlı oval.
4. Kablo: 6 px kalın, yuvarlak uçlu; ortasında küçük bir düğüm noktası.
5. Akım varken: kablo beyaza döner, dışına bulanık sarı parlama eklenir.

- [x] 3.4.1 `BlockCell` Skia bileşeni (5 katman).
- [x] 3.4.2 Pil ve lamba için özel hücreler: pil hafifçe nabız gibi atar; lamba sönükken gri cam, yanınca ışık saçar.
- [x] 3.4.3 Tahta paneli: iç gölge, kalın yuvarlak çerçeve.
- [x] 3.4.4 Arka plan: renk geçişi + yavaşça kayan soluk yıldızlar/şehir silüeti.

### 3.5 Animasyonlar (Reanimated + Skia)

| An | Animasyon |
|---|---|
| Parçayı tutma | 1.0 → 1.12 büyüme, gölge uzar, 120 ms |
| Sürükleme | Hareket yönüne hafif eğilme (en çok 6°) |
| Bırakma | Yay ile yerine oturma, ardından ezilme-esneme: 0.9 → 1.06 → 1.0, 180 ms |
| Geçersiz bırakma | Parça tepsiye yaylanarak döner, hafif sallanır |
| Devre tamamlanma | Akım pilden lambaya ilerler, hücre başı 40 ms |
| Hücre patlaması | Akım geçtikten sonra 30 ms arayla: 1.2'ye şişme, sonra parçacıklara dağılma |
| Lamba yanması | Dairesel ışık dalgası, tüm ekrana yayılan kısa parlama |
| Puan | Patlayan yerden sayı yukarı uçar, üstteki puana katılır; puan sayacı yuvarlanarak artar |
| Uzun devre (10+ hücre) | 4 px ekran sarsıntısı, 200 ms |
| Yeni tepsi | Parçalar alttan sırayla zıplayarak gelir, 60 ms arayla |
| Oyun sonu | Kalan bloklar sırayla grileşir, panel yukarıdan düşer |

- [x] 3.5.1 Olay kuyruğu oynatıcısı: Faz 1'deki olay listesini sırayla animasyona çevirir; animasyon sürerken girişi kilitler.
- [x] 3.5.2 Tutma / sürükleme / bırakma animasyonları.
- [x] 3.5.3 Akım ilerlemesi ve sıralı patlama.
- [x] 3.5.4 Parçacık sistemi: patlayan hücre başına 8–12 parçacık (hücrenin renginde küçük kareler + beyaz kıvılcımlar), yerçekimiyle düşer, 500 ms'de söner.
- [x] 3.5.5 Lamba ışık dalgası ve ekran sarsıntısı.
- [x] 3.5.6 Uçan puan ve yuvarlanan sayaç.
- [x] 3.5.7 Övgü yazıları: 6+ hücre "Güzel!", 9+ "Harika!", 12+ "Süper Devre!", kombo x3 "Durdurulamaz!". Yazı büyüyerek gelir, sallanır, kaybolur.
- [x] 3.5.8 Kıvılcım'ın tepkileri olaylara bağlanır.
- [x] 3.5.9 Ayarlara "Hareketi azalt" seçeneği (sarsıntı ve parlamayı kapatır).

### 3.6 Ses ve titreşim

- Yerleştirme: kısa, tok "tık".
- Akım: her hücrede bir nota; notalar pentatonik gamda **yükselir** (uzun devre = yükselen melodi). Tatmin hissinin en ucuz ve en etkili kaynağı budur.
- Lamba: parlak çan sesi. Övgü yazıları: kısa neşeli jingle.
- Arka plan müziği: sakin, döngülü; varsayılan ses düşük, kapatılabilir.
- Titreşim: yerleştirmede hafif, devrede orta, uzun devrede başarı deseni.

- [x] 3.6.1 Ses yöneticisi (`expo-audio`), sesleri önceden yükle, ses/müzik ayrı kapatılabilsin.
- [x] 3.6.2 Ücretsiz (CC0) ses paketlerinden seç (ör. Kenney.nl); lisansları `CREDITS.md` dosyasına yaz.
- [x] 3.6.3 `expo-haptics` ile titreşimler.

### 3.7 Arayüz bileşenleri

- Düğmeler: iri, yuvarlak, alt kenarı koyu (3B basma hissi); basınca 4 px aşağı iner.
- Paneller: yuvarlak köşeli, kalın açık renk çerçeveli, yaylanarak açılır.
- Minimum dokunma alanı 48 px.

- [x] 3.7.1 `CandyButton`, `Panel`, `StarRow`, `ScoreBadge` bileşenleri.
- [x] 3.7.2 Ana ekran: logo (harfler sırayla zıplar), Kıvılcım, "Oyna", "Günün Tahtası", ayarlar.
- [x] 3.7.3 Oyun ekranı yerleşimi: üstte puan + hedef, ortada tahta, altta tepsi.
- [x] 3.7.4 Oyun bitti / bölüm tamamlandı paneli: yıldızlar tek tek "çat" diye yerine oturur, konfeti yağar.
- [x] 3.7.5 İlk açılışta etkileşimli öğretici: el işareti ilk parçayı sürükler; 3 adım, yazı en az.

### 3.8 Performans ve kalite kapısı

- [ ] 3.8.1 Orta seviye bir Android telefonda 60 FPS (patlama anında dahil).
- [x] 3.8.2 Tahta ve parçacıklar tek `Canvas` içinde; animasyon değerleri UI iş parçacığında.
- [ ] 3.8.3 **Sessiz video testi:** 10 saniyelik oyun kaydını sesi kapalı izlet. İzleyen "oynamak istiyorum" demiyorsa Faz 3 bitmemiştir.

---

## Faz 4 — Oyun modları ve bağlılık

- [x] 4.1 **Sonsuz mod** (Faz 2'deki oyun, yeni görsellerle).
- [x] 4.2 **Macera modu (harita):** Gece şehri haritası, yukarı doğru kayan yol üzerinde bölüm düğmeleri. Tamamlanan bölümün mahallesi aydınlanır.
- [x] 4.3 Bölüm hedefleri: "20 hamlede 5 lamba yak", "12 hücrelik devre kur", "tahtadaki tüm kilitli blokları temizle".
- [x] 4.4 Bölüm verisi JSON olarak: tohum, hamle sayısı, hedef, başlangıç engelleri. İlk sürüm için 40 bölüm.
- [x] 4.5 Yıldız sistemi (1–3) ve bölüm kilidi açma.
- [x] 4.6 Yeni öğeleri kademeli tanıt: 1–10 temel, 11–20 kilitli blok, 21–30 çift lamba, 31–40 anahtar (açılıp kapanan kablo).
- [x] 4.7 **Günün Tahtası:** Tarihten üretilen tohum, günde tek deneme, sonuç ekranı.
- [x] 4.8 Seri (streak) sayacı ve haftalık görünüm.
- [x] 4.9 Paylaşım kartı: tahtanın küçük özeti + puan, görsel olarak paylaşılır.
- [x] 4.10 Güçlendiriciler **yalnızca oynayarak kazanılır** (satın alma yok): "Çekiç" (bir bloğu kır), "Karıştır" (tepsiyi yenile). Can sistemi yok.
  - [x] 4.10.1 **Altın ve dükkân** (12 Kasım 2026, kullanıcı isteği): bölüm kazanınca altın (ilk geçiş 30 + yıldız başına 15; tekrar oynama 10 + yeni yıldız başına 15), başlangıçta 100 altın. Altınla dükkândan joker alınır; **gerçek parayla satın alma yok**. Fiyatlar etkiye göre: Karıştır 40, Çekiç 60, Döndür 90, Yıldırım 300. Dükkândan her jokerden en fazla 9; oynayarak kazanım sınırı 5 kaldı.
  - [x] 4.10.2 **Döndür** jokeri: seçilen kablolu bloğu (kilitli dahil) 90° çevirir; yol tamamlanırsa devre normal çözülür. Hamle saymaz.
  - [x] 4.10.3 **Yıldırım** jokeri: tahtadaki bütün blokları kırar, kilitliler dahil; puan vermez. Pil, lamba ve anahtar kalır.
  - [x] 4.10.4 Joker bölüm hedefini tutturursa bölüm kazanılır (yıldız ve altın verilir). Günün Tahtası'nda joker yok (değişmedi).
  - [ ] 4.10.5 Oynayarak karar ver: altın ödülü ve fiyatlar dengeli mi (Yıldırım 4–5 bölüm ediyor)?
- [x] 4.11 **İkinci sezon: 41–80. bölümler** (12 Kasım 2026, kullanıcı isteği). 8 yeni mahalle: Fenerli Rıhtım, Neon Çarşı, Bulut Kulesi, Değirmen Yolu, Kuzey Işıkları, Gökkuşağı Köprüsü, Kristal Mağara, Güneş Meydanı. Yeni öğe yok; engel, kilitli blok, çift lamba ve anahtar karışık. Her aday 24 tohumla botla ölçüldü (bot en az ~4/24 kazanır; mahalle sonları daha zor), tohum botun ortanca puana yakın kazandığı oyundan, ★2 ortanca, ★3 iyi oyun eşiği. Adaylar calibrate.test.ts içinde.
  - [ ] 4.11.1 Oynayarak karar ver: 41–80 zorluk eğrisi (bot zayıf; insanlar ve jokerlerle daha kolay olabilir).
- [x] 4.12 **Günlük hatırlatma bildirimi** (12 Kasım 2026, kullanıcı isteği): yerel bildirim (expo-notifications, sunucu yok). Her akşam 19:00; bugünün tahtası oynandıysa o günkü atlanır; 2+ günlük seride "serin tehlikede", ara sıra sıradaki bölüme çağrı. Bir hafta ileri planlanır, her açılışta yenilenir. İzin öğreticiden sonra bir kez sorulur; Ayarlar → "Günlük hatırlatma" ile kapatılır.
  - [ ] 4.12.1 Cihazda dene: bildirim geliyor mu, simge (assets/notification-icon.png) gerçek derlemede doğru mu.
- [x] 4.13 **Bölüm tekrarında farklı parçalar** (12 Kasım 2026, kullanıcı bildirimi: tekrar oynayınca hep aynı parçalar geliyordu). Her bölüme botun geçebildiği tohum havuzu (en az 8, çoğunda 20–50) eklendi (levels.json `seeds`); her denemede havuzdan, bir öncekinden farklı tohum seçilir. Tamamen rastgele tohum yerine havuz: bazı tohumlarda bölüm neredeyse geçilemez çıkıyordu.

---

## Faz 5 — Çevrimiçi (Supabase)

> Supabase projesi kuruldu (`devre`, Frankfurt) ve canlıda uçtan uca doğrulandı; ayrıntılar `SUPABASE.md`. Uygulamanın Expo Go'dan bağlanması henüz denenmedi.

- [x] 5.1 Anonim giriş; isteğe bağlı takma ad.
- [x] 5.2 Tablolar: `profiles`, `daily_scores (user_id, date, score, longest_circuit)`; satır düzeyi güvenlik kuralları.
- [x] 5.3 Günlük sıralama ve arkadaş kodu ile arkadaş sıralaması.
- [x] 5.4 Hile önlemi: istemci hamle listesini gönderir, sunucu fonksiyonu aynı tohumla oyunu tekrar oynatıp puanı doğrular (Faz 1 modülü sunucuda da çalışır).
- [x] 5.5 Çevrimdışı çalışma: internet yoksa oyun tam oynanır, puan sonra gönderilir.

---

## Faz 6 — Yayın

- [ ] 6.1 Erişilebilirlik: ekran okuyucu etiketleri, yazı boyutu, renk körlüğü modu.
- [ ] 6.2 Türkçe ve İngilizce dil desteği.
- [ ] 6.3 Gizlilik metni (reklam ve takip yok; yalnızca anonim puan verisi).
- [ ] 6.4 Mağaza görselleri ve 20 saniyelik tanıtım videosu (en iyi patlama anlarından).
- [ ] 6.5 Kapalı test (20+ kişi), çökme takibi, ardından yayın.

---

## Önerilen klasör yapısı

```
src/
  game/        saf oyun mantığı (Faz 1), arayüzden bağımsız
  render/      Skia çizimleri: BlockCell, Board, Particles
  anim/        olay kuyruğu oynatıcısı, animasyon sabitleri
  audio/       ses ve titreşim yöneticisi
  ui/          CandyButton, Panel, StarRow ...
  screens/     Home, Game, Map, Daily, Settings
  levels/      bölüm JSON dosyaları
  theme/       colors.ts, fonts.ts, sizes.ts
  store/       zustand durumları
  services/    supabase
```

## Çalışma kuralları

- Animasyon süreleri ve yay ayarları `src/anim/constants.ts` içinde tek yerde durur; ince ayar oradan yapılır.
- Oyun mantığı hiçbir zaman arayüz kodunun içine yazılmaz.
- Her faz sonunda gerçek telefonda denenir; emülatör titreşimi ve performansı doğru göstermez.

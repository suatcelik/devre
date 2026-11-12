# Emeği Geçenler ve Lisanslar

## Sesler

Tüm ses efektleri ve arka plan müziği bu projeye özgüdür. Dış bir ses paketi kullanılmadı;
sesler `scripts/generate-sounds.mjs` betiğiyle sıfırdan sentezlenir ve projeyle aynı haklara tabidir.

Yeniden üretmek için: `node scripts/generate-sounds.mjs` → `assets/sounds/*.wav`

| Dosya | İçerik |
|---|---|
| `place.wav` | Yerleştirme: tok "tık" |
| `pickup.wav` | Parçayı tutma |
| `invalid.wav` | Geçersiz bırakma |
| `note_00–14.wav` | Akım notaları, C majör pentatonik, C5'ten üç oktav |
| `pop.wav` | Hücre patlaması |
| `lamp.wav` | Lamba çanı |
| `jingle.wav` | Övgü yazısı |
| `line.wav` | Satır/sütun temizleme |
| `tray.wav` | Yeni tepsi |
| `gameover.wav` | Oyun sonu |
| `star_1–3.wav` | Yıldızın "çat" diye oturması; her yıldızda daha tiz |
| `confetti.wav` | Konfeti patlaması |
| `music.wav` | Sakin, kusursuz döngülü arka plan müziği (84 BPM, 8 ölçü) |

## Yazı tipleri

- **Baloo 2**: Ek Type, SIL Open Font License 1.1 (`@expo-google-fonts/baloo-2`)
- **Nunito**: Vernon Adams ve katkıda bulunanlar, SIL Open Font License 1.1 (`@expo-google-fonts/nunito`)

## Görseller

Uygulama ikonu, uyarlanabilir Android ikonları, açılış görseli ve favicon projeye özgüdür;
`scripts/generate-icons.mjs` betiğiyle Kıvılcım çiziminden üretilir (`node scripts/generate-icons.mjs`).
Oyun içindeki tüm çizimler (bloklar, Kıvılcım, yıldızlar, konfeti) kodla, Skia ile çizilir.

# QR Kod Görünmüyor - Test Adımları

## 🔍 Adım Adım Kontrol

### 1. Expo Başladı mı?

Terminal'de şunları arayın:
- `Starting Metro Bundler`
- `Metro waiting on exp://...`
- `› Press a │ open Android`
- `› Press i │ open iOS simulator`

### 2. QR Kod Manuel Göster

Expo başladıktan sonra terminal'de:
- `m` tuşuna basın → Manuel QR kod gösterimi
- `d` tuşuna basın → Developer menu açılır

### 3. Web Arayüzünde Gör

Tarayıcınızda açın:
```
http://localhost:8081
```

Bu Expo Dev Tools sayfası - QR kod burada görünecek!

### 4. Tunnel Modu (Alternatif)

```bash
npx expo start --tunnel
```

Bu QR kod gösterir (biraz yavaş olabilir).

## ✅ Kesin Çözüm

### Yöntem 1: Web Arayüzü (En Garantili)

1. `npm start` çalıştırın
2. Tarayıcıda `http://localhost:8081` açın
3. QR kod orada görünecek!

### Yöntem 2: Manuel Komut

```bash
npx expo start --qr-code
```

### Yöntem 3: Expo Go'da URL Gir

1. Expo Go uygulamasını açın
2. "Enter URL manually" seçeneğini seçin
3. Terminal'de görünen `exp://...` URL'ini girin

## 📱 Terminal'de Görünmesi Gerekenler

```
› Metro waiting on exp://192.168.1.59:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

  ████████████████████████████████████████
  ████████████████████████████████████████
  █ ▄▄▄▄▄ █ ▄▄▄ ▄▄  █ ▄▄▄▄▄ █ ████████████
  █ █   █ █ █   █ █  █ █   █ █ ████████████
  ...
```

Eğer bu görünmüyorsa, terminal genişliği yetersiz olabilir.


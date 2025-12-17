# QR Kod Garantili Çözüm

## 🎯 En Garantili Yöntem: Web Arayüzü

### 1. Expo'yu Başlatın

```bash
cd mobile
npm start
```

### 2. Tarayıcıda Açın

Expo başladıktan sonra tarayıcınızda şu adresi açın:

```
http://localhost:8081
```

**QR kod burada kesinlikle görünecek!** ✅

## 📱 Alternatif Yöntemler

### Yöntem 2: Manuel QR Kod (Terminal'de)

Expo başladıktan sonra terminal'de:
- `m` tuşuna basın → QR kod gösterilir
- `d` tuşuna basın → Developer menu

### Yöntem 3: URL ile Bağlanma

1. Expo Go uygulamasını açın
2. "Enter URL manually" seçeneğini seçin
3. Terminal'de şu satırı arayın:
   ```
   › Metro waiting on exp://192.168.1.59:8081
   ```
4. Bu URL'i Expo Go'ya girin

### Yöntem 4: Tunnel Modu (Yavaş ama Garantili)

```bash
cd mobile
npx expo start --tunnel
```

Bu QR kod gösterir (internet gerektirir, yavaş olabilir).

## ✅ Önerilen Çözüm

**Web arayüzü kullanın** - En garantili:
1. `npm start` çalıştırın
2. `http://localhost:8081` tarayıcıda açın
3. QR kod orada görünecek!

## 🔍 Terminal'de Neler Görünmeli

```
› Metro waiting on exp://192.168.1.59:8081
› Scan the QR code above with Expo Go

  ████████████████████████████████████████
  ████████████████████████████████████████
  █ ▄▄▄▄▄ █ ▄▄▄ ▄▄  █ ▄▄▄▄▄ █ ████████████
  ...
```

Eğer bu görünmüyorsa:
- Terminal genişliğini artırın
- Veya web arayüzünü kullanın


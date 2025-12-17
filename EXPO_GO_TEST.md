# 📱 Expo Go ile Test (Sadece Mobil)

## ✅ Expo Go ile Bağlanma

### Yöntem 1: QR Kod ile (Terminal'de)

1. **Expo'yu başlatın:**
   ```bash
   cd mobile
   npm start
   ```

2. **QR Kod Terminal'de:**
   - Terminal penceresini **genişletin** (QR kod geniş alan gerektirir)
   - Terminal'de QR kod ASCII karakterleri görünecek
   - QR kod görünmüyorsa terminal'de `m` tuşuna basın

3. **Expo Go ile tara:**
   - Expo Go uygulamasını açın
   - QR kodu tarayın
   - Uygulama açılacak!

### Yöntem 2: Manuel URL Girme (QR Kod Yoksa)

1. **Expo'yu başlatın:**
   ```bash
   cd mobile
   npm start
   ```

2. **Terminal'de URL'i bulun:**
   ```
   › Metro waiting on exp://192.168.1.59:8081
   ```

3. **Expo Go'da manuel gir:**
   - Expo Go uygulamasını açın
   - "Enter URL manually" seçeneğini seçin
   - `exp://192.168.1.59:8081` yazın (IP adresi sizin IP'niz olacak)
   - Bağlan

### Yöntem 3: Tunnel Modu (Aynı Wi-Fi Gerektirmez)

```bash
cd mobile
npm run tunnel
```

Bu QR kod gösterir ve aynı Wi-Fi'ye gerek kalmaz (internet gerekir).

## 🎯 Hızlı Başlangıç

```bash
cd mobile
npm start
```

Terminal'de şunu göreceksiniz:
```
› Metro waiting on exp://192.168.1.59:8081
› Scan the QR code above with Expo Go

  ████████████████████████████████████████
  ████████████████████████████████████████
  █ ▄▄▄▄▄ █ ▄▄▄ ▄▄  █ ▄▄▄▄▄ █ ████████████
  ...
```

**QR kod yoksa:** Terminal'de `m` tuşuna basın veya manuel URL girin.

## ⚠️ Önemli

- **Backend Gerekli:** Mobil uygulama backend API'ye bağlanır
- **Aynı Wi-Fi:** Normal mod için telefon ve bilgisayar aynı ağda olmalı
- **Tunnel Modu:** Aynı Wi-Fi gerektirmez ama internet gerekir

## 📝 Backend'i Başlatma

Backend'i ayrı terminal'de başlatın:

```bash
cd backend
npm run dev
```

## ✅ Test

1. ✅ Expo başladı
2. ✅ QR kod terminal'de görünüyor (veya manuel URL)
3. ✅ Expo Go'da QR kod tarandı (veya URL girildi)
4. ✅ Uygulama açıldı
5. ✅ Backend çalışıyor


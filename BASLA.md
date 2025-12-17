# 🚀 Expo Go ile Test (Sadece Mobil)

## ⚠️ ÖNEMLİ: Backend Önce Başlamalı!

### Adım 1: Backend'i Başlatın (YENİ TERMINAL)

```bash
cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler\backend
npm run dev
```

**VEYA** `BACKEND_BASLA.bat` dosyasını çift tıklayın.

Backend başladığında şunu göreceksiniz:
```
Server is running on port 3000
Network access: http://192.168.1.59:3000
```

### Adım 2: Mobile'ı Başlatın

**YENİ BİR TERMINAL'de** (veya root'tan):

```bash
cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler
npm start
```

**VEYA** sadece mobile:

```bash
cd mobile
npm start
```

### Sadece Mobile:

```bash
cd mobile
npm start
```

## 🎯 Expo Go ile Bağlanma

### 1. QR Kod (Terminal'de)

Terminal'de QR kod görünecek. Terminal penceresini **genişletin** (QR kod geniş alan gerektirir).

QR kod görünmüyorsa:
- Terminal'de `m` tuşuna basın
- VEYA manuel URL girin (Yöntem 2)

### 2. Manuel URL (QR Kod Yoksa)

1. Terminal'de şu satırı bulun:
   ```
   › Metro waiting on exp://192.168.1.59:8081
   ```

2. Expo Go uygulamasında:
   - "Enter URL manually" seçeneğini seçin
   - `exp://192.168.1.59:8081` yazın
   - Bağlan

### 3. Tunnel Modu (Aynı Wi-Fi Gerektirmez)

```bash
cd mobile
npm run tunnel
```

Bu QR kod gösterir ve aynı Wi-Fi'ye gerek kalmaz.

## ✅ Başarılı Bağlantı

- Expo Go'da uygulama açılacak
- Login/Register ekranları görünecek
- Console'da API bağlantı log'ları görünecek

## ⚠️ Backend Gerekli

Backend'i ayrı terminal'de başlatın:

```bash
cd backend
npm run dev
```

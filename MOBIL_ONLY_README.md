# 📱 Mobil Uygulama - Sadece iOS/Android

Bu proje **sadece mobil uygulama** içindir. Web desteği yoktur.

## ✅ Yapılan Temizlikler

### 1. Package.json
- ✅ `react-dom` kaldırıldı (web için gerekliydi)
- ✅ Web script'leri zaten yoktu

### 2. app.json
- ✅ `platforms: ["ios", "android"]` eklendi (sadece mobil)
- ✅ Web config'i yok

### 3. Backend
- ✅ Zaten sadece REST API (web sayfası yok)
- ✅ CORS mobil uygulama için yapılandırıldı

## 🚫 Web Desteği Yok

- ❌ Web browser'da çalışmaz
- ❌ Web build yapılamaz
- ❌ Web-specific kodlar yok
- ✅ Sadece Expo Go (development)
- ✅ Sadece iOS/Android (production)

## 📱 Desteklenen Platformlar

- ✅ **iOS** - iPhone ve iPad
- ✅ **Android** - Telefon ve tablet
- ❌ **Web** - Desteklenmiyor

## 🔧 Geliştirme

**Expo Go ile test:**
```bash
npm start
```

**QR kodu tarayın** - Expo Go uygulamasında

## 📦 Production Build

**iOS:**
```bash
cd mobile
eas build --platform ios
```

**Android:**
```bash
cd mobile
eas build --platform android
```

Web build yapılamaz!


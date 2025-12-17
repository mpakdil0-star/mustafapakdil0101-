# Kurulum Talimatları

## ⚠️ ÖNEMLİ: Doğru Dizinde Çalıştırın!

Bu proje iki ayrı klasörden oluşur:
- `backend/` - API sunucusu
- `mobile/` - Mobil uygulama

Her birini **kendi klasöründe** çalıştırmanız gerekir.

## 📱 Mobile Uygulama

```bash
cd mobile
npm install  # İlk kurulum için
npm start    # Uygulamayı başlat
```

## 🔧 Backend API

```bash
cd backend
npm install  # İlk kurulum için
npm run dev  # Backend'i başlat
```

## ❌ YANLIŞ KULLANIM

Ana dizinde (`Elektrikçiler`) npm komutları çalıştırmayın!

```bash
# ❌ BÖYLE YAPMAYIN:
cd Elektrikçiler
npm start  # HATA VERİR!

# ✅ BÖYLE YAPIN:
cd Elektrikçiler/mobile
npm start  # DOĞRU!
```


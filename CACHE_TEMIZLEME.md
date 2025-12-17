# 🧹 Cache Temizleme - Metro Bundler

## ❌ Sorun

Mobil uygulamada kod değişiklikleri görünmüyor veya eski hata devam ediyor.

## ✅ Çözüm: Cache Temizleme

### Adım 1: Metro Bundler'ı Durdurun

Metro bundler çalışan terminal'de:
- **Ctrl+C** tuşlarına basın (komut değil, sadece tuşlar!)

### Adım 2: Cache'i Temizleyin

```powershell
cd mobile
npx expo start -c
```

`-c` flag'i cache'i temizler.

### Adım 3: Alternatif - Manuel Cache Temizleme

```powershell
cd mobile
rm -rf node_modules/.cache
rm -rf .expo
npx expo start
```

## 🔄 Backend Cache

Backend için de restart gerekli:
```powershell
cd backend
# Ctrl+C ile durdurun
npm run dev
```

## ✅ Test

Cache temizlendikten sonra:
1. Expo Go'da uygulamayı yeniden yükleyin
2. Jobs tab'ına gidin
3. İlanlar görünmeli, 401 hatası olmamalı


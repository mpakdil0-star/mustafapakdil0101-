# 🚀 Tek Terminal'de Başlatma

## ✅ Kurulum (İlk Kez)

Root dizinde (Elektrikçiler klasörü) çalıştırın:

```bash
npm install
```

Bu `concurrently` paketini yükleyecek.

## 🎯 Kullanım

Artık **tek terminal'de** şunu çalıştırın:

```bash
npm start
```

Bu komut:
1. ✅ Backend'i başlatacak (`backend` klasöründe `npm run dev`)
2. ✅ Mobil uygulamayı başlatacak (`mobile` klasöründe `npm start`)
3. ✅ QR kod terminal'de görünecek

## 📱 Expo Go ile Bağlanın

1. **Expo Go uygulamasını açın** (Telefonda)
2. **QR kodu tarayın** (Terminal'de görünecek)
3. Uygulama açılacak!

## ⚠️ Önemli Notlar

- **Aynı Wi-Fi**: Telefon ve bilgisayar aynı ağda olmalı
- **Backend Gerekli**: Mobil uygulama backend API'ye bağlanır
- **İki Terminal İsteğe Bağlı**: Artık tek terminal yeterli!

## 🔧 Sorun Giderme

### Backend Başlamıyorsa:
- Backend terminal çıktısını kontrol edin
- `cd backend && npm install` çalıştırın

### Mobile Başlamıyorsa:
- Mobile terminal çıktısını kontrol edin
- `cd mobile && npm install` çalıştırın

### QR Kod Görünmüyorsa:
- Terminal'de `mobile` bölümüne bakın
- Expo server'ın başladığını kontrol edin


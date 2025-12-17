# 🚀 QR Kod Çözümü

## ✅ Doğru Kullanım

### Mevcut Terminal'de (Zaten mobile klasöründesiniz):

```bash
npm start
```

**VEYA** root dizine gidin:

```bash
cd ..
npm start
```

## 📱 QR Kod Görünmesi İçin

Expo otomatik olarak QR kod gösterir. Eğer görünmüyorsa:

1. **Terminal'i genişletin** - QR kod geniş alan gerektirir
2. **Expo başladıktan sonra** terminal'de şunları göreceksiniz:
   - `› Metro waiting on exp://...`
   - QR kod ASCII karakterleri
   - `› Scan the QR code above with Expo Go`

## 🎯 İki Terminal Yöntemi (Önerilen)

### Terminal 1 - Mobile (QR kod burada görünecek):
```bash
cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler\mobile
npm start
```

### Terminal 2 - Backend:
```bash
cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler\backend
npm run dev
```

## ⚡ Tek Komut (Root dizinden):

```bash
cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler
npm start
```

Bu her ikisini de başlatır, QR kod terminal'de görünecek.

## 🔍 QR Kod Görünmüyorsa

1. Terminal'de `m` tuşuna basın (manuel QR kod gösterimi)
2. Tarayıcıda `http://localhost:8081` açın (Expo Dev Tools)
3. Terminal genişliğini artırın


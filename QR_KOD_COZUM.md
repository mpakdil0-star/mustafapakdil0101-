# QR Kod Görünmüyor - Çözüm

## ✅ Hızlı Çözüm

### Yöntem 1: Sadece Mobile Başlatın (En Garantili)

```bash
cd mobile
npm start
```

QR kod **kesinlikle** görünecek! Backend'i ayrı terminal'de başlatın.

### Yöntem 2: Batch Dosyası Kullanın

**BASLA.bat** dosyasını çift tıklayın - Her ikisi de başlar.

**SADECE_MOBILE.bat** dosyasını çift tıklayın - Sadece mobile başlar (QR kod için).

### Yöntem 3: Manuel Komutlar

```bash
# Terminal 1 - Mobile (QR kod burada görünecek)
cd mobile
npm start

# Terminal 2 - Backend (Ayrı terminal)
cd backend
npm run dev
```

## 🔍 Kontrol

Terminal'de şunları arayın:
- `› Metro waiting on exp://...`
- QR kod ASCII karakterleri
- `› Scan the QR code above with Expo Go`

## ⚠️ Sorun Devam Ediyorsa

1. **Terminal genişliği**: Terminal penceresini genişletin
2. **Expo temizle**: `cd mobile && npx expo start --clear`
3. **Manuel QR**: Expo başladıktan sonra terminal'de `m` tuşuna basın

## 📱 Alternatif: Expo Dev Tools

Expo başladıktan sonra:
- Terminal'de `d` tuşuna basın (development menu)
- Veya tarayıcıda `http://localhost:8081` açın
- QR kodu orada görebilirsiniz

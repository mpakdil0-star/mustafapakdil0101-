# Mobil Uygulama Test Rehberi

## 📱 Sadece Mobil Uygulama (Web Yok)

Bu uygulama sadece mobil platformlar için tasarlandı:
- ✅ Android (Expo Go)
- ✅ iOS (Expo Go)
- ❌ Web (devre dışı)

## 🚀 Expo Go ile Test

### 1. Backend'i Başlatın (Gerekli)

Backend API'ye bağlanmak için backend çalışmalı:

```bash
cd backend
npm run dev
```

Backend başladığında göreceksiniz:
```
Server is running on port 3000
Network access: http://192.168.1.59:3000
```

### 2. Mobil Uygulamayı Başlatın

```bash
cd mobile
npm start
```

### 3. Expo Go ile Bağlanın

- **Android**: Expo Go uygulamasını açın → QR kodu tarayın
- **iOS**: Expo Go uygulamasını açın → QR kodu tarayın

Terminal'de `a` (Android) veya `i` (iOS) tuşuna basabilirsiniz.

## ✅ Önemli Notlar

1. **Backend Gerekli**: Mobil uygulama backend API'ye bağlanır
2. **Aynı Wi-Fi**: Telefon ve bilgisayar aynı ağda olmalı
3. **IP Adresi**: `192.168.1.59` (değişirse `mobile/constants/api.ts` güncelleyin)

## 🔧 Sorun Giderme

### Network Error Alıyorsanız:

1. Backend çalışıyor mu? (`http://localhost:3000/health`)
2. IP adresi doğru mu? (`ipconfig` ile kontrol)
3. Aynı Wi-Fi ağında mısınız?
4. Firewall port 3000'i engelliyor mu?

### Backend Başlamıyorsa:

- Terminal'de hata mesajlarını kontrol edin
- `npm install` çalıştırın
- `npm run prisma:generate` çalıştırın

## 📝 Test Adımları

1. ✅ Backend başlatıldı
2. ✅ Mobile Expo server başlatıldı
3. ✅ Expo Go'da QR kod tarandı
4. ✅ Uygulama açıldı
5. ✅ Login/Register ekranları görünüyor


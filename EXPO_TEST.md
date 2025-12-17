# Expo Go ile Test Etme Rehberi

## ⚠️ ÖNEMLİ: Doğru Dizinde Çalıştırın!

Mobil uygulamayı başlatmak için **mutlaka `mobile` klasöründe** olmalısınız:

```bash
cd mobile
npm start
```

## 📱 Adım Adım Test

### 1. Backend'i Başlatın (Ayrı Terminal)
```bash
cd backend
npm run dev
```

Backend başladığında şunu görmelisiniz:
```
Server is running on port 3000
Network access: http://192.168.1.59:3000
```

### 2. Mobile Uygulamayı Başlatın (Ayrı Terminal)
```bash
cd mobile
npm start
```

Expo dev server başlayacak ve QR kod gösterecek.

### 3. Expo Go ile Bağlanın
- **Android**: Expo Go uygulamasını açın ve QR kodu tarayın
- **iOS**: Expo Go uygulamasını açın ve QR kodu tarayın
- **Emulator**: Terminal'de `a` tuşuna basın (Android) veya `i` tuşuna basın (iOS)

## 🔍 Sorun Giderme

### Backend'e Bağlanamıyorsa:
1. Backend çalışıyor mu? (`http://localhost:3000/health` test edin)
2. IP adresi doğru mu? (`ipconfig` ile kontrol edin)
3. Aynı Wi-Fi ağında mısınız?
4. Firewall port 3000'i engelliyor mu?

### Network Error Alıyorsanız:
- Expo console'da `API_BASE_URL` değerini kontrol edin
- Backend terminal'inde hata var mı bakın
- `http://192.168.1.59:3000/health` telefonunuzun tarayıcısından çalışıyor mu test edin

## ✅ Başarılı Bağlantı

Bağlantı başarılıysa:
- Expo Go'da uygulama açılacak
- Login/Register ekranları görünecek
- Console'da `API_BASE_URL` log'u görünecek

## 📝 Not

Database kurulumu yapmadıysanız kayıt/giriş çalışmaz. Database kurulumu için:
- `backend/DOCKER_SETUP.md` dosyasına bakın
- Veya `backend/QUICK_START.md` dosyasına bakın


# Backend Başlatma (Sadece Mobil İçin)

## ⚠️ ÖNEMLİ

Mobil uygulama backend API'ye bağlanır. Backend çalışmadan mobil uygulama çalışmaz!

## 🚀 Backend'i Başlatın

### Adım 1: Terminal Açın

Yeni bir PowerShell veya CMD terminal açın.

### Adım 2: Backend Klasörüne Gidin

```bash
cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler\backend
```

### Adım 3: Backend'i Başlatın

```bash
npm run dev
```

### Adım 4: Başarı Mesajını Kontrol Edin

Terminal'de şunu görmelisiniz:
```
Server is running on port 3000
Network access: http://192.168.1.59:3000
```

## ✅ Test

Backend başladıktan sonra test edin:

**Bilgisayar tarayıcısından:**
```
http://localhost:3000/health
```

**Telefon tarayıcısından:**
```
http://192.168.1.59:3000/health
```

Başarılı yanıt:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "..."
}
```

## 🔧 Sorun Varsa

1. **Port 3000 kullanımda mı?**
   ```bash
   netstat -ano | findstr :3000
   ```

2. **TypeScript hatası mı?**
   - Terminal'deki hata mesajını kontrol edin
   - `npm install` çalıştırın

3. **Database hatası mı?**
   - Backend database olmadan da başlar
   - Kayıt/giriş için database gerekir (opsiyonel)

## 📱 Mobil Uygulama

Backend başladıktan sonra mobil uygulamayı başlatın:

```bash
cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler\mobile
npm start
```

Expo Go ile QR kodu tarayın!


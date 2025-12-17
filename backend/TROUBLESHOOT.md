# Backend Sorun Giderme

## ❌ Backend Başlamıyor - Çözüm Adımları

### 1. Terminal'de Manuel Başlatın

Yeni bir terminal açın ve şunu çalıştırın:

```bash
cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler\backend
npm run dev
```

**Hata mesajlarını kontrol edin!**

### 2. TypeScript Hatalarını Düzeltin

Eğer TypeScript hatası varsa:
```bash
npm install
npm run prisma:generate
```

### 3. Port 3000 Kullanımda mı?

```bash
netstat -ano | findstr :3000
```

Eğer port kullanımdaysa, başka bir process'i kapatın.

### 4. Database Hatası

Backend database olmadan da başlamalı. Eğer database hatası alıyorsanız, `.env` dosyasını kontrol edin.

### 5. Bağımlılıklar Eksik mi?

```bash
npm install
```

## ✅ Backend Başarıyla Başladığında

Terminal'de şunu göreceksiniz:
```
Server is running on port 3000
Network access: http://192.168.1.59:3000
```

## 🔧 Hızlı Test

Backend başladıktan sonra:

**Bilgisayardan:**
```bash
curl http://localhost:3000/health
```

**Telefondan (Tarayıcı):**
```
http://192.168.1.59:3000/health
```

Başarılı yanıt:
```json
{
  "success": true,
  "message": "API is running"
}
```

## 📝 Önemli Notlar

1. **Backend ve Mobile ayrı terminal'lerde çalışmalı**
2. **Backend `npm run dev` ile başlatılmalı** (TypeScript için)
3. **Mobile `npm start` ile başlatılmalı** (Expo için)


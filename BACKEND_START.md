# Backend Başlatma Rehberi

## ⚠️ ÖNEMLİ: Backend Çalışmıyor!

Backend port 3000'de çalışmıyor. Şu adımları izleyin:

## ✅ Doğru Başlatma Adımları

### 1. Yeni Bir Terminal Açın

**Backend Terminal:**
```bash
cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler\backend
npm run dev
```

**Mobile Terminal (Ayrı):**
```bash
cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler\mobile
npm start
```

### 2. Backend Başarıyla Başladığında Göreceksiniz:

```
Server is running on port 3000
Server accessible at http://0.0.0.0:3000
Local access: http://localhost:3000
Network access: http://192.168.1.59:3000
Environment: development
API Version: v1
```

### 3. Test Edin

**Bilgisayardan:**
```bash
curl http://localhost:3000/health
```

**Telefonunuzdan (Tarayıcı):**
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

## ❌ Sorun Giderme

### Backend Başlamıyorsa:

1. **Port 3000 kullanımda mı?**
   ```bash
   netstat -ano | findstr :3000
   ```

2. **Database hatası mı?**
   - Backend database olmadan da başlar
   - Database hatası sadece kayıt/giriş işlemlerinde olur

3. **TypeScript hatası mı?**
   - `npm install` çalıştırın
   - `npm run prisma:generate` çalıştırın

### Network Error Alıyorsanız:

1. ✅ Backend çalışıyor mu? (`http://localhost:3000/health`)
2. ✅ IP adresi doğru mu? (`192.168.1.59`)
3. ✅ Telefon ve bilgisayar aynı Wi-Fi'de mi?
4. ✅ Firewall port 3000'i engelliyor mu?

## 🔧 Windows Firewall İzin

Eğer firewall engelliyorsa:

1. Windows Defender Firewall → Advanced Settings
2. Inbound Rules → New Rule
3. Port → TCP → 3000 → Allow
4. Apply to: All profiles


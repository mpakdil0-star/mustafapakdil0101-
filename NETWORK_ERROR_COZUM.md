# ❌ Network Error Çözümü

## 🔴 Sorun: Backend Çalışmıyor

Backend port 3000'de dinlemiyor. Bu yüzden mobil uygulama backend'e bağlanamıyor.

## ✅ Çözüm Adımları

### 1. Backend'i Manuel Başlatın (ÖNEMLİ)

**YENİ BİR TERMINAL açın** ve şunu çalıştırın:

```bash
cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler\backend
npm run dev
```

### 2. Backend Başarıyla Başladığında Göreceksiniz:

```
Server is running on port 3000
Network access: http://192.168.1.59:3000
```

### 3. Test Edin

**Telefonunuzun tarayıcısından:**
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

## 🔧 Backend Başlamıyorsa

### Hata Mesajlarını Kontrol Edin

Terminal'de hata mesajı varsa:
1. Hata mesajını bana gönderin
2. VEYA şunları deneyin:

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

### TypeScript Hatası mı?

Backend TypeScript kullanıyor. Hata varsa terminal'de göreceksiniz.

### Database Hatası mı?

Backend database olmadan da başlar. Database hatası sadece kayıt/giriş işlemlerinde olur.

## ✅ Doğru Başlatma Sırası

1. **Terminal 1 - Backend:**
   ```bash
   cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler\backend
   npm run dev
   ```

2. **Terminal 2 - Mobile (veya root'tan npm start):**
   ```bash
   cd C:\Users\hp\OneDrive\Desktop\Elektrikçiler
   npm start
   ```

3. **Backend başladıktan sonra** mobile bağlanabilecek!

## 📱 Kontrol Listesi

- [ ] Backend çalışıyor mu? (`http://localhost:3000/health`)
- [ ] IP adresi doğru mu? (`192.168.1.59`)
- [ ] Telefon ve bilgisayar aynı Wi-Fi'de mi?
- [ ] Firewall port 3000'i engelliyor mu?

## ⚡ Hızlı Test

Backend terminal'inde şunu görüyor musunuz?
```
Server is running on port 3000
```

**Görüyorsanız:** Backend çalışıyor ✅
**Görmüyorsanız:** Backend başlamamış ❌


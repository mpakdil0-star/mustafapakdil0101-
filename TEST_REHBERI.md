# 🧪 Test Rehberi

## 📱 Mobil Uygulama Testi

### 1. Uygulamayı Başlatma

**Backend ve Mobile birlikte başlatma:**
```powershell
# Root dizinde
npm start
```

Bu komut:
- Backend'i port 3000'de başlatır
- Mobile (Expo) Metro bundler'ı başlatır
- QR kod gösterir

### 2. Expo Go ile Test

1. **Telefonda Expo Go uygulamasını açın**
2. **QR kodu tarayın** (terminalde görünecek)
3. **Uygulama yüklenecek ve açılacak**

### 3. Test Senaryoları

#### A. Login/Register Testi

1. **Uygulama açıldığında** login ekranı görünmeli
2. **Herhangi bir email/şifre ile** giriş yapabilirsiniz (mock mode aktif)
3. Giriş başarılı olursa **ana sayfaya** yönlendirilirsiniz

#### B. Jobs Ekranı Testi

1. **Alt menüden "İş İlanları" sekmesine** gidin
2. **İş ilanları listelenmeli** (eğer database'de varsa)
3. **Pull-to-refresh** yaparak yenileyebilirsiniz
4. **Loading state** gösterilmeli

**Not:** Eğer database bağlantısı yoksa veya iş ilanı yoksa:
- "İş İlanı Yok" mesajı görünecek
- Empty state gösterilecek

#### C. Backend Bağlantı Testi

**Mock Mode:** 
- Database olmadan test için aktif
- `mobile/services/authService.ts` dosyasında `MOCK_MODE = true`

**Gerçek Backend Testi:**
1. Backend çalışıyor mu kontrol edin:
   ```
   http://localhost:3000/api/v1/health
   ```
2. Browser'da açın veya Postman ile test edin

### 4. Olası Hatalar ve Çözümler

#### ❌ "Network Error" veya "Connection Refused"

**Çözüm:**
1. Backend çalışıyor mu kontrol edin
2. `mobile/constants/api.ts` dosyasındaki `LOCAL_IP` değerini kontrol edin
3. Telefon ve bilgisayar aynı Wi-Fi ağında mı?
4. Firewall port 3000'i engelliyor mu?

#### ❌ "401 Unauthorized"

**Çözüm:**
1. Login yapıldı mı kontrol edin
2. Token geçerli mi kontrol edin
3. Mock mode aktifse normal (database bağlantısı yok)

#### ❌ Beyaz Ekran

**Çözüm:**
1. Metro bundler'ı durdurup cache temizleyin:
   ```bash
   cd mobile
   npx expo start -c
   ```
2. Expo Go'yu kapatıp yeniden açın
3. Telefonu sallayıp "Show Element Inspector" açın
4. Browser console'da hataları kontrol edin

#### ❌ "Jobs array is empty"

**Çözüm:**
1. Database'de iş ilanı var mı kontrol edin
2. Backend'de job oluşturmayı deneyin (Postman ile)
3. Mock mode aktifse bu normal (database bağlantısı yok)

### 5. Test Checklist

- [ ] Backend çalışıyor (port 3000)
- [ ] Metro bundler çalışıyor
- [ ] QR kod görünüyor
- [ ] Expo Go'da uygulama açılıyor
- [ ] Login ekranı görünüyor
- [ ] Login başarılı oluyor
- [ ] Ana sayfa görünüyor
- [ ] Jobs sekmesine gidebiliyorum
- [ ] Jobs ekranı yükleniyor (loading gösteriliyor)
- [ ] İş ilanları listeleniyor veya empty state görünüyor
- [ ] Pull-to-refresh çalışıyor

### 6. İleri Seviye Test

**Database ile Test:**
1. Supabase'de proje oluşturun
2. `.env` dosyasını yapılandırın
3. Migrations çalıştırın:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   ```
4. Backend'i başlatın
5. Mock mode'u kapatın (`authService.ts` içinde `MOCK_MODE = false`)
6. Gerçek API ile test edin

**Postman ile Backend Testi:**
1. İş ilanı oluşturun
2. Teklif oluşturun
3. Mobil uygulamada görünüyor mu kontrol edin

### 7. Debug İpuçları

- **Remote Debugging:** Telefonu sallayıp "Debug Remote JS" açın
- **Console Logs:** Browser console'da API çağrılarını görebilirsiniz
- **Network Tab:** API isteklerini kontrol edin
- **Redux DevTools:** State değişikliklerini takip edin

## ✅ Başarılı Test Kriterleri

1. ✅ Uygulama açılıyor
2. ✅ Login ekranı görünüyor
3. ✅ Login başarılı
4. ✅ Jobs ekranına gidebiliyoruz
5. ✅ Jobs ekranı yükleniyor
6. ✅ Hata mesajı yok (console'da)
7. ✅ Pull-to-refresh çalışıyor

Test başarılı! 🎉


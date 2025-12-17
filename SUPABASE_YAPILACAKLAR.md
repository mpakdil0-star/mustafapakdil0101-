# ✅ Supabase Kurulumu - Yapılacaklar Listesi

## 📋 Adım Adım

### ✅ Adım 1: Supabase'de Hesap Oluşturun

1. Tarayıcıda Supabase açıldı (otomatik açıldı)
2. **"Start your project"** veya **"Sign In"** butonuna tıklayın
3. GitHub, Google veya Email ile giriş yapın

### ⏳ Adım 2: Proje Oluşturun

1. Dashboard'da **"New Project"** butonuna tıklayın
2. Formu doldurun:
   - **Organization:** Varsayılan organizasyonu seçin (yoksa oluşturun)
   - **Name:** `elektrikciler`
   - **Database Password:** Güçlü bir şifre girin (ÖNEMLİ: Kaydedin!)
   - **Region:** En yakın bölgeyi seçin
   - **Pricing Plan:** Free (ücretsiz)
3. **"Create new project"** butonuna tıklayın
4. Proje oluşturulmasını bekleyin (1-2 dakika)

### ⏳ Adım 3: Connection String'i Alın

1. Sol menüden **"Settings"** (⚙️ ikonu) tıklayın
2. **"Database"** sekmesine tıklayın
3. **"Connection string"** bölümünü bulun
4. **"URI"** sekmesine tıklayın
5. Connection string şuna benzer olacak:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
6. **Connection string'i kopyalayın**

### ⏳ Adım 4: .env Dosyasını Güncelleyin

Connection string'i aldıktan sonra:

1. `ENV_OLUSTUR.bat` dosyasını çift tıklayın
2. Connection string'i yapıştırın
3. Enter'a basın

VEYA manuel olarak:

1. `backend/.env` dosyasını açın
2. Şu satırı ekleyin/güncelleyin:
   ```env
   DATABASE_URL=[YAPISTIRDIĞINIZ_CONNECTION_STRING]
   ```
3. Dosyayı kaydedin

### ⏳ Adım 5: Migration Çalıştırın

Terminal'de:
```bash
cd backend
npm run prisma:migrate
```

### ⏳ Adım 6: Backend'i Yeniden Başlatın

```bash
npm run dev
```

## 🎯 Hızlı Yol

**ENV_OLUSTUR.bat** dosyasını çift tıklayın - Otomatik olarak .env oluşturur ve migration çalıştırır!

## ✅ Tamamlandığında

- ✅ Database bağlantısı başarılı
- ✅ Login/Register çalışacak
- ✅ 500 hatası kaybolacak


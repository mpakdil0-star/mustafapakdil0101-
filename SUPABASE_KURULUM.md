# 🚀 Supabase Database Kurulumu (Adım Adım)

## ⚠️ ÖNEMLİ: Bu Adımları Sırayla Yapın

### Adım 1: Supabase Hesabı Oluşturun

1. Tarayıcınızda açın: **https://supabase.com**
2. Sağ üstte **"Start your project"** veya **"Sign In"** tıklayın
3. GitHub, Google veya Email ile giriş yapın (ücretsiz)

### Adım 2: Yeni Proje Oluşturun

1. Dashboard'da **"New Project"** butonuna tıklayın
2. Aşağıdaki bilgileri doldurun:
   - **Name:** `elektrikciler`
   - **Database Password:** Güçlü bir şifre belirleyin (kaydedin!)
   - **Region:** En yakın bölgeyi seçin (örn: `West EU (Ireland)`)
3. **"Create new project"** tıklayın
4. Proje oluşturulmasını bekleyin (1-2 dakika)

### Adım 3: Connection String'i Alın

1. Sol menüden **"Settings"** (⚙️) tıklayın
2. **"Database"** sekmesine tıklayın
3. **"Connection string"** bölümünü bulun
4. **"URI"** sekmesine tıklayın
5. Şuna benzer bir string göreceksiniz:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. Bu string'i **kopyalayın**

### Adım 4: .env Dosyasını Güncelleyin

1. `backend/.env` dosyasını açın (yoksa oluşturun)
2. Şu satırı ekleyin:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
3. `[YOUR-PASSWORD]` yerine gerçek şifrenizi yazın
4. Dosyayı kaydedin

### Adım 5: Migration Çalıştırın

Terminal'de:
```bash
cd backend
npm run prisma:migrate
```

### Adım 6: Backend'i Yeniden Başlatın

```bash
npm run dev
```

## ✅ Hazır!

Artık database hazır ve login/register çalışacak!

## 📝 Notlar

- **Şifre unutmayın:** Database şifresini güvenli bir yerde saklayın
- **Connection String:** `.env` dosyasında saklanır, kimseyle paylaşmayın
- **Ücretsiz:** Supabase free tier'ı test için yeterli

## 🔧 Sorun Giderme

### Migration hatası alıyorsanız:
- Connection string doğru mu kontrol edin
- Şifre doğru mu kontrol edin
- Supabase projeniz hazır mı kontrol edin

### Backend hata veriyorsa:
- `.env` dosyası doğru yerde mi? (`backend/.env`)
- Connection string tam mı kopyalanmış?
- Migration başarılı oldu mu?


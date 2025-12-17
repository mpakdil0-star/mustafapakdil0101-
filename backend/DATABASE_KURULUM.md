# 🗄️ PostgreSQL Database Kurulumu (Supabase)

## 📋 Adım 1: Supabase Hesabı Oluşturma

1. **Supabase'e gidin**: https://supabase.com
2. **"Start your project"** veya **"Sign Up"** butonuna tıklayın
3. GitHub hesabınızla giriş yapın (önerilir) veya email ile kayıt olun

## 📋 Adım 2: Yeni Proje Oluşturma

1. **"New Project"** butonuna tıklayın
2. Proje bilgilerini doldurun:
   - **Name**: `elektrikciler` (veya istediğiniz isim)
   - **Database Password**: Güçlü bir şifre oluşturun (kaydedin!)
   - **Region**: En yakın bölgeyi seçin (örn: `West Europe`)
   - **Pricing Plan**: Free plan'ı seçin (başlangıç için yeterli)

3. **"Create new project"** butonuna tıklayın
4. Proje oluşturulmasını bekleyin (1-2 dakika)

## 📋 Adım 3: Connection String'i Alma

1. Proje oluşturulduktan sonra, sol menüden **"Settings"** (⚙️) seçin
2. **"Database"** sekmesine gidin
3. **"Connection string"** bölümüne inin
4. **"Connection pooling"** seçeneğini seçin (Transaction mode önerilir)
5. Connection string'i kopyalayın, şu formatta olmalı:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
   ```

## 📋 Adım 4: .env Dosyasını Oluşturma

1. `backend` klasörüne gidin
2. `.env.example` dosyasını `.env` olarak kopyalayın (veya yeni oluşturun)
3. Connection string'i `DATABASE_URL` olarak ekleyin

**Örnek .env dosyası:**
```env
# Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# JWT Secrets (Güçlü şifreler oluşturun!)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis (Opsiyonel - şimdilik localhost)
REDIS_URL="redis://localhost:6379"
REDIS_TTL=3600

# CORS
FRONTEND_URL="http://localhost:8081"

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/webp,application/pdf"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=1000
```

## 📋 Adım 5: Database Migrations Çalıştırma

```bash
cd backend
npm install
npx prisma migrate dev --name init
```

Bu komut:
- Prisma schema'yı database'e uygular
- Tüm tabloları oluşturur
- İlişkileri kurar

## 📋 Adım 6: Prisma Client Oluşturma

```bash
npx prisma generate
```

## 📋 Adım 7: Backend'i Başlatma

```bash
npm run dev
```

Backend başarıyla başladıysa, terminalde şunu göreceksiniz:
```
Server is running on port 3000
Server accessible at http://0.0.0.0:3000
```

## ✅ Test Etme

1. Postman veya browser'da şu URL'yi açın:
   ```
   http://localhost:3000/api/v1/health
   ```
   
2. Eğer response gelirse, database bağlantısı başarılıdır!

## 🔧 Troubleshooting

### Connection String Hatası
- Password'ü doğru girdiğinizden emin olun
- Connection pooling modunu kullandığınızı kontrol edin
- Region'ın doğru olduğundan emin olun

### Migration Hatası
- `DATABASE_URL` doğru mu kontrol edin
- Supabase projenizin aktif olduğundan emin olun
- Database şifresinin doğru olduğundan emin olun

### Port Zaten Kullanılıyor
- Port 3000 başka bir uygulama tarafından kullanılıyor olabilir
- `.env` dosyasında `PORT=3001` gibi farklı bir port kullanabilirsiniz


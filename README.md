# ⚡ Elektrikçiler - Mobil Uygulama Platformu

Elektrikçiler ve vatandaşları bir araya getiren profesyonel mobil uygulama platformu.

## 📱 Özellikler

- ✅ Kullanıcı kayıt ve giriş sistemi
- ✅ İş ilanı oluşturma ve yönetimi
- ✅ Teklif verme ve kabul/reddetme
- ✅ Mesajlaşma sistemi
- ✅ Profil yönetimi
- ✅ Değerlendirme ve yorumlar

## 🚀 Kurulum

### Gereksinimler

- Node.js 20.19+ veya 22.12+
- npm veya yarn
- Expo Go uygulaması (mobil cihazda)
- PostgreSQL database (Supabase önerilir)

### Hızlı Başlangıç

1. **Tüm bağımlılıkları yükleyin:**
   ```bash
   npm run install:all
   ```

2. **Backend ve Mobile'ı birlikte başlatın:**
   ```bash
   npm start
   ```

3. **Expo Go'da QR kodu tarayın**

### Ayrı Başlatma

**Backend:**
```bash
cd backend
npm run dev
```

**Mobile:**
```bash
cd mobile
npm start
```

## 📁 Proje Yapısı

```
Elektrikçiler/
├── backend/          # Node.js + Express + Prisma API
│   ├── src/
│   │   ├── config/   # Database, env config
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── prisma/       # Database schema
│
└── mobile/           # React Native + Expo Router
    ├── app/          # Expo Router screens
    ├── components/   # Reusable components
    ├── constants/    # Colors, spacing, API endpoints
    ├── services/     # API services
    ├── store/        # Redux store
    └── utils/        # Helper functions
```

## 🔧 Yapılandırma

### Database Kurulumu

Detaylı kurulum için: `backend/DATABASE_KURULUM.md`

1. Supabase'de proje oluşturun
2. Connection string'i alın
3. `backend/.env` dosyasını oluşturun:
   ```env
   DATABASE_URL="postgresql://..."
   JWT_SECRET="your-secret-key"
   JWT_REFRESH_SECRET="your-refresh-secret-key"
   ```

4. Migrations çalıştırın:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npx prisma generate
   ```

### API URL Yapılandırması

`mobile/constants/api.ts` dosyasında IP adresinizi güncelleyin:
```typescript
const LOCAL_IP = '192.168.1.59'; // Bilgisayarınızın IP adresi
```

## 📱 Mobil Uygulama

**Sadece iOS ve Android** desteği. Web desteği yoktur.

- Expo Router ile file-based routing
- Redux Toolkit ile state management
- TypeScript ile type safety
- Expo Go ile test (development)

## 🧪 Test

Detaylı test rehberi: `TEST_REHBERI.md`

**Hızlı Test:**
1. Backend'i başlatın
2. Mobile'ı başlatın
3. Expo Go'da QR kodu tarayın
4. Login ekranında herhangi bir email/şifre ile giriş yapın

## 📚 Dokümantasyon

- `backend/DATABASE_KURULUM.md` - Database kurulum rehberi
- `backend/KURULUM_VE_TEST.md` - API test rehberi
- `TEST_REHBERI.md` - Genel test rehberi
- `NETWORK_HATA_COZUM.md` - Network sorunları çözümü

## 🔐 Güvenlik

- JWT tabanlı authentication
- Secure token storage (Expo Secure Store)
- Password hashing (bcrypt)
- Rate limiting
- CORS yapılandırması

## 📝 Notlar

- Bu uygulama **sadece mobil** (iOS/Android) içindir
- Web desteği yoktur
- Development için Expo Go kullanılır
- Production için native build gerekir

## 🛠️ Teknolojiler

**Backend:**
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication

**Mobile:**
- React Native
- Expo SDK 54
- Expo Router
- Redux Toolkit
- TypeScript

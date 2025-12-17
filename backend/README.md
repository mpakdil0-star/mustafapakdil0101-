# Elektrikçiler Backend API

Node.js + Express + TypeScript + Prisma backend API

## Kurulum

```bash
npm install
```

## Environment Variables

`.env` dosyası oluşturun ve gerekli değişkenleri ekleyin:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/elektrikciler
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
PORT=3000
```

## Database Setup

```bash
# Prisma client'ı generate et
npm run prisma:generate

# Migration oluştur ve uygula
npm run prisma:migrate

# Prisma Studio'yu aç (optional)
npm run prisma:studio
```

## Çalıştırma

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

- `POST /api/v1/auth/register` - Kullanıcı kaydı
- `POST /api/v1/auth/login` - Giriş
- `POST /api/v1/auth/refresh-token` - Token yenileme
- `GET /api/v1/auth/me` - Kullanıcı bilgisi
- `GET /health` - Health check


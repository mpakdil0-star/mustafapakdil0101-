# 🚀 Kurulum ve Test Rehberi

## 📋 1. PostgreSQL Database Kurulumu

Detaylı kurulum için: `DATABASE_KURULUM.md` dosyasına bakın.

**Özet:**
1. Supabase'de proje oluşturun
2. Connection string'i alın
3. `.env` dosyasını oluşturun

## 📋 2. .env Dosyası Oluşturma

`backend` klasöründe `.env` dosyası oluşturun:

```env
# Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis (Opsiyonel)
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

## 📋 3. Database Migrations

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
```

## 📋 4. Backend'i Başlatma

```bash
npm run dev
```

Backend başarıyla başladıysa:
```
Server is running on port 3000
Server accessible at http://0.0.0.0:3000
```

## 📋 5. API Endpoints Test Etme

### Authentication

**Register (Citizen):**
```bash
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "vatandas@example.com",
  "password": "123456",
  "fullName": "Vatandaş Adı",
  "phone": "05551234567",
  "userType": "CITIZEN"
}
```

**Register (Electrician):**
```bash
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "elektrikci@example.com",
  "password": "123456",
  "fullName": "Elektrikçi Adı",
  "phone": "05551234568",
  "userType": "ELECTRICIAN"
}
```

**Login:**
```bash
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "vatandas@example.com",
  "password": "123456"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Jobs (İş İlanları)

**Create Job (Citizen):**
```bash
POST http://localhost:3000/api/v1/jobs
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "Ev Elektrik Arızası",
  "description": "Evde elektrik kesintisi var, acil müdahale gerekiyor.",
  "category": "Electrical Repair",
  "location": {
    "address": "Test Mahallesi, Test Sokak No:1",
    "city": "İstanbul",
    "district": "Kadıköy",
    "neighborhood": "Acıbadem",
    "latitude": 40.9888,
    "longitude": 29.0225
  },
  "urgencyLevel": "HIGH",
  "estimatedBudget": 500,
  "budgetRange": {
    "min": 300,
    "max": 700
  }
}
```

**Get All Jobs:**
```bash
GET http://localhost:3000/api/v1/jobs?status=OPEN&page=1&limit=20
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Get Job by ID:**
```bash
GET http://localhost:3000/api/v1/jobs/{jobId}
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Get My Jobs:**
```bash
GET http://localhost:3000/api/v1/jobs/my-jobs
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Update Job:**
```bash
PUT http://localhost:3000/api/v1/jobs/{jobId}
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "title": "Güncellenmiş Başlık",
  "description": "Güncellenmiş açıklama"
}
```

**Delete Job:**
```bash
DELETE http://localhost:3000/api/v1/jobs/{jobId}
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Bids (Teklifler)

**Create Bid (Electrician):**
```bash
POST http://localhost:3000/api/v1/bids
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "jobPostId": "job-id-here",
  "amount": 450,
  "estimatedDuration": 2,
  "estimatedStartDate": "2024-01-15T10:00:00Z",
  "message": "Ben bu işi 2 saatte tamamlayabilirim. Uygun fiyatla hizmet veriyorum."
}
```

**Get Job Bids:**
```bash
GET http://localhost:3000/api/v1/jobs/{jobId}/bids
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Get My Bids:**
```bash
GET http://localhost:3000/api/v1/bids/my-bids
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Accept Bid (Citizen):**
```bash
POST http://localhost:3000/api/v1/bids/{bidId}/accept
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Reject Bid (Citizen):**
```bash
POST http://localhost:3000/api/v1/bids/{bidId}/reject
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Withdraw Bid (Electrician):**
```bash
POST http://localhost:3000/api/v1/bids/{bidId}/withdraw
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Update Bid:**
```bash
PUT http://localhost:3000/api/v1/bids/{bidId}
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "amount": 400,
  "message": "Güncellenmiş mesaj"
}
```

## ✅ Test Senaryoları

1. **Citizen hesabı oluşturun**
2. **Electrician hesabı oluşturun**
3. **Citizen olarak login yapın ve job oluşturun**
4. **Electrician olarak login yapın ve job'a bid yapın**
5. **Citizen olarak bid'leri görüntüleyin**
6. **Citizen olarak bir bid'i kabul edin**
7. **Job status'ünün IN_PROGRESS olduğunu kontrol edin**

## 🔍 Hata Kontrolü

- Database bağlantı hatası: `.env` dosyasında `DATABASE_URL` kontrol edin
- Authentication hatası: Token'ın geçerli olduğundan emin olun
- 403 Forbidden: User type kontrolü yapın (CITIZEN vs ELECTRICIAN)


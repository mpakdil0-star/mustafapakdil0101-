# 🚀 Hızlı Başlangıç - Tüm Adımlar

## 1️⃣ Database Kurulumu (ZORUNLU)

### Seçenek A: Docker (Önerilen)

1. Docker Desktop'ı indirin: https://www.docker.com/products/docker-desktop/
2. Docker Desktop'ı başlatın
3. Terminal'de çalıştırın:
   ```bash
   docker run --name elektrikciler-db -e POSTGRES_USER=elektrikciler -e POSTGRES_PASSWORD=elektrikciler123 -e POSTGRES_DB=elektrikciler -p 5432:5432 -d postgres:15
   ```
4. `backend/.env` dosyasına ekleyin:
   ```env
   DATABASE_URL=postgresql://elektrikciler:elektrikciler123@localhost:5432/elektrikciler?schema=public
   ```
5. Migration çalıştırın:
   ```bash
   cd backend
   npm run prisma:migrate
   ```

### Seçenek B: Supabase (Cloud - Ücretsiz)

1. https://supabase.com → Hesap oluşturun
2. Yeni proje oluşturun
3. Settings → Database → Connection string'i kopyalayın
4. `backend/.env` dosyasına ekleyin:
   ```env
   DATABASE_URL=[SUPABASE_CONNECTION_STRING]
   ```
5. Migration çalıştırın:
   ```bash
   cd backend
   npm run prisma:migrate
   ```

## 2️⃣ Backend Başlatma

```bash
cd backend
npm run dev
```

Başarılı olduğunda göreceksiniz:
```
Server is running on port 3000
```

## 3️⃣ Mobile Başlatma

**Yeni terminal:**
```bash
cd mobile
npm start
```

VEYA root'tan:
```bash
npm start
```

## 4️⃣ Expo Go ile Bağlanma

1. Expo Go uygulamasını açın
2. QR kodu tarayın
3. VEYA manuel URL: `exp://192.168.1.59:8081`

## ✅ Test

- Login/Register çalışacak
- Database bağlantısı başarılı
- Uygulama çalışıyor!


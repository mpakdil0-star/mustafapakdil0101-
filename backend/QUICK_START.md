# Hızlı Başlangıç Rehberi

## 📋 Önkoşullar

1. **PostgreSQL Database** (3 seçenek):
   - Docker ile (Önerilen - En Hızlı)
   - Yerel PostgreSQL kurulumu
   - Cloud Database (Supabase, Railway, vb.)

## 🐳 Docker ile Hızlı Başlangıç (Önerilen)

```bash
# PostgreSQL container'ı başlat
docker run --name elektrikciler-db \
  -e POSTGRES_USER=elektrikciler \
  -e POSTGRES_PASSWORD=elektrikciler123 \
  -e POSTGRES_DB=elektrikciler \
  -p 5432:5432 \
  -d postgres:15

# .env dosyasını güncelle
DATABASE_URL=postgresql://elektrikciler:elektrikciler123@localhost:5432/elektrikciler?schema=public

# Migration'ları çalıştır
npm run prisma:migrate

# Backend'i başlat
npm run dev
```

## 🔧 Manuel Kurulum

1. PostgreSQL kurun ve çalıştırın
2. Database oluşturun:
```sql
CREATE DATABASE elektrikciler;
```

3. `.env` dosyasını güncelleyin:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/elektrikciler?schema=public
```

4. Migration'ları çalıştırın:
```bash
npm run prisma:migrate
```

5. Backend'i başlatın:
```bash
npm run dev
```

## ✅ Test

Backend başarıyla çalıştıysa:
- Health check: http://localhost:3000/health
- Network access: http://192.168.1.59:3000/health

Expo Go'dan test edebilirsiniz!


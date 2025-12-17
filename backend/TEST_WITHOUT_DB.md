# Database Olmadan Test Etme

## ⚠️ Not

Backend database olmadan da başlayacak ancak:
- ❌ Kayıt/Giriş çalışmaz
- ❌ Veri işlemleri yapılamaz
- ✅ Health check endpoint çalışır
- ✅ API yapısı test edilebilir

## Hızlı Test için Database Kurulumu

### Seçenek 1: Docker (En Hızlı)

```bash
docker run --name elektrikciler-db \
  -e POSTGRES_USER=elektrikciler \
  -e POSTGRES_PASSWORD=elektrikciler123 \
  -e POSTGRES_DB=elektrikciler \
  -p 5432:5432 \
  -d postgres:15
```

Sonra `.env` dosyasına ekleyin:
```env
DATABASE_URL=postgresql://elektrikciler:elektrikciler123@localhost:5432/elektrikciler?schema=public
```

Migration çalıştırın:
```bash
npm run prisma:migrate
```

### Seçenek 2: Supabase (Cloud - Ücretsiz)

1. https://supabase.com adresinden ücretsiz hesap oluşturun
2. Yeni proje oluşturun
3. Database URL'i alın
4. `.env` dosyasına ekleyin
5. Migration çalıştırın

## Backend Başlatma

```bash
cd backend
npm run dev
```

Server şu adreslerde erişilebilir olacak:
- Local: http://localhost:3000
- Network: http://192.168.1.59:3000


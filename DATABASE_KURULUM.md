# 🗄️ Database Kurulumu (Zorunlu)

## ❌ Sorun

Backend database'e bağlanamıyor. Login/Register için database **zorunlu**.

## ✅ Hızlı Çözüm: Docker ile PostgreSQL

### Adım 1: Docker Kontrol

Docker Desktop'ın yüklü ve çalışıyor olduğundan emin olun:
- https://www.docker.com/products/docker-desktop/

### Adım 2: PostgreSQL Container Başlat

```bash
docker run --name elektrikciler-db \
  -e POSTGRES_USER=elektrikciler \
  -e POSTGRES_PASSWORD=elektrikciler123 \
  -e POSTGRES_DB=elektrikciler \
  -p 5432:5432 \
  -d postgres:15
```

### Adım 3: .env Dosyasını Güncelle

`backend/.env` dosyasını açın ve şunu ekleyin:

```env
DATABASE_URL=postgresql://elektrikciler:elektrikciler123@localhost:5432/elektrikciler?schema=public
```

### Adım 4: Migration Çalıştır

```bash
cd backend
npm run prisma:migrate
```

### Adım 5: Backend'i Yeniden Başlat

```bash
npm run dev
```

## ✅ Test

Backend başladıktan sonra:
- Login/Register çalışacak
- Database bağlantısı başarılı olacak

## 🔧 Docker Komutları

### Container'ı Durdur:
```bash
docker stop elektrikciler-db
```

### Container'ı Başlat:
```bash
docker start elektrikciler-db
```

### Container'ı Sil (veriler silinir):
```bash
docker rm -f elektrikciler-db
```

## 📝 Alternatif: Yerel PostgreSQL

PostgreSQL'i bilgisayarınıza kurun:
- https://www.postgresql.org/download/windows/

Sonra database oluşturun ve `.env` dosyasını yapılandırın.


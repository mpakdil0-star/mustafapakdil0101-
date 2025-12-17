# Docker ile Hızlı Database Kurulumu

## PostgreSQL Docker Container

Test için hızlıca PostgreSQL çalıştırmak için:

```bash
docker run --name elektrikciler-db \
  -e POSTGRES_USER=elektrikciler \
  -e POSTGRES_PASSWORD=elektrikciler123 \
  -e POSTGRES_DB=elektrikciler \
  -p 5432:5432 \
  -d postgres:15
```

Sonra `.env` dosyasını güncelleyin:
```env
DATABASE_URL=postgresql://elektrikciler:elektrikciler123@localhost:5432/elektrikciler?schema=public
```

Migration çalıştırın:
```bash
npm run prisma:migrate
```

## Alternatif: PostgreSQL Yerel Kurulum

Windows için PostgreSQL indirin ve kurun:
https://www.postgresql.org/download/windows/

Sonra database oluşturun ve `.env` dosyasını yapılandırın.


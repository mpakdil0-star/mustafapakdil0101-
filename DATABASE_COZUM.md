# 🗄️ Database Kurulumu - Hızlı Çözüm

## ❌ Sorun

**500 Hatası:** Database'e bağlanılamıyor. Login/Register için database **zorunlu**.

## ✅ Çözüm Seçenekleri

### Seçenek 1: Docker ile PostgreSQL (Önerilen - En Hızlı)

#### Adım 1: Docker Desktop'ı İndirin ve Kurun
- https://www.docker.com/products/docker-desktop/
- İndirin, kurun ve Docker Desktop'ı başlatın

#### Adım 2: Database Container'ı Başlatın

**Terminal'de çalıştırın:**
```bash
docker run --name elektrikciler-db \
  -e POSTGRES_USER=elektrikciler \
  -e POSTGRES_PASSWORD=elektrikciler123 \
  -e POSTGRES_DB=elektrikciler \
  -p 5432:5432 \
  -d postgres:15
```

**VEYA** `DATABASE_BASLA.bat` dosyasını çift tıklayın (Docker yüklüyse).

#### Adım 3: .env Dosyasını Güncelleyin

`backend/.env` dosyasını açın ve şunu ekleyin:

```env
DATABASE_URL=postgresql://elektrikciler:elektrikciler123@localhost:5432/elektrikciler?schema=public
```

#### Adım 4: Migration Çalıştırın

```bash
cd backend
npm run prisma:migrate
```

#### Adım 5: Backend'i Yeniden Başlatın

```bash
npm run dev
```

---

### Seçenek 2: Supabase (Cloud - Ücretsiz - Önerilen)

#### Adım 1: Supabase Hesabı Oluşturun
- https://supabase.com adresine gidin
- Ücretsiz hesap oluşturun

#### Adım 2: Yeni Proje Oluşturun
- "New Project" tıklayın
- Proje adı: `elektrikciler`
- Database şifresi belirleyin
- Region seçin (en yakın)

#### Adım 3: Connection String'i Alın
- Proje açıldıktan sonra: Settings → Database
- "Connection string" bölümünde "URI" seçin
- Connection string'i kopyalayın

#### Adım 4: .env Dosyasını Güncelleyin

`backend/.env` dosyasını açın:

```env
DATABASE_URL=postgresql://postgres:[ŞİFRENİZ]@db.[PROJE-ID].supabase.co:5432/postgres
```

**Not:** `[ŞİFRENİZ]` ve `[PROJE-ID]` yerine gerçek değerleri yazın.

#### Adım 5: Migration Çalıştırın

```bash
cd backend
npm run prisma:migrate
```

#### Adım 6: Backend'i Yeniden Başlatın

```bash
npm run dev
```

---

### Seçenek 3: Yerel PostgreSQL Kurulumu

#### Adım 1: PostgreSQL İndirin
- https://www.postgresql.org/download/windows/
- İndirin ve kurun

#### Adım 2: Database Oluşturun

PostgreSQL'e bağlanın (pgAdmin veya psql):

```sql
CREATE DATABASE elektrikciler;
CREATE USER elektrikciler WITH PASSWORD 'elektrikciler123';
GRANT ALL PRIVILEGES ON DATABASE elektrikciler TO elektrikciler;
```

#### Adım 3: .env Dosyasını Güncelleyin

```env
DATABASE_URL=postgresql://elektrikciler:elektrikciler123@localhost:5432/elektrikciler?schema=public
```

#### Adım 4: Migration Çalıştırın

```bash
cd backend
npm run prisma:migrate
```

---

## ✅ Hangi Seçeneği Seçmeliyim?

- **Test için:** Docker (En hızlı)
- **Hızlı başlangıç:** Supabase (Kurulum yok)
- **Production benzeri:** Yerel PostgreSQL

## 🔧 Docker Komutları

### Container'ı Başlat:
```bash
docker start elektrikciler-db
```

### Container'ı Durdur:
```bash
docker stop elektrikciler-db
```

### Container'ı Sil (Veriler silinir):
```bash
docker rm -f elektrikciler-db
```

## ✅ Test

Database kurulumundan sonra:
- Backend'i yeniden başlatın
- Login/Register çalışacak
- 500 hatası kaybolacak


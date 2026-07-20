# Supabase Yerel Kurulum ve Migrasyon

## Ön koşullar

- Docker Desktop çalışıyor olmalı.
- Supabase CLI kurulmuş olmalı.
- Komutlar repo kökünden çalıştırılmalı.
- Production projesine uygulamadan önce development projesi kullanılmalı.

## Migrasyon sırası

| Dosya | Amaç |
|---|---|
| `0001_prisma_baseline.sql` | Prisma şemasındaki 26 tablo, enum, index ve foreign key'ler |
| `0002_supabase_foundation.sql` | UUID string varsayılanları, Auth profil trigger'ı, yardımcı fonksiyonlar, push outbox ve güvenli public view'lar |
| `0003_row_level_security.sql` | Tablo bazlı RLS politikaları ve kolon yetkileri |
| `0004_storage.sql` | Beş bucket ve dosya erişim politikaları |
| `0005_core_rpc.sql` | Teklif ve mesajlaşma için ilk atomik RPC fonksiyonları |
| `0006_auth_profile_rpc.sql` | Google/Apple kayıtları için güvenli rol ve profil tamamlama RPC'si |
| `0007_job_lifecycle_rpc.sql` | İlan iptal, soft-delete, tamamlama ve değerlendirme transaction'ları |
| `0008_profile_verification_rpc.sql` | Private Storage belgesiyle usta doğrulama başvurusu |
| `0009_bid_lifecycle_rpc.sql` | Teklif güncelleme, ret, geri çekme, silme, güncelleme isteği ve Realtime publication |
| `0010_rpc_permission_hardening.sql` | Tüm ayrıcalıklı RPC'lerden anonim çalıştırma yetkisinin açıkça kaldırılması |
| `0011_messaging_realtime.sql` | Güvenli katılımcı kartları ile mesaj/conversation Realtime publication |
| `0012_user_cards_permission_hardening.sql` | Katılımcı kartı görünümünden anonim API yetkisinin açıkça kaldırılması |
| `0013_push_outbox_cron.sql` | Güvenli cron sırrı, outbox claim, Expo ticket kayıtları ve dakikalık Edge Function çağrısı |
| `0014_user_tools_rpc.sql` | Takvim tamamlama ve isteğe bağlı cari hesap kaydını atomik yapan RPC |

## Yerel doğrulama

```powershell
supabase start
supabase db reset
supabase status
```

`db reset`, bütün migrasyonları boş yerel veritabanına sırayla uygular. Bir migrasyon hata verirse production'a hiçbir dosya gönderilmemelidir.

## Development projesine bağlama

```powershell
supabase login
supabase link --project-ref DEVELOPMENT_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Project ref ve erişim token'ı repoya yazılmamalıdır.

## Auth ayarları

Supabase Dashboard içinde:

1. E-posta/şifre provider etkinleştirilir.
2. E-posta doğrulaması production için açık tutulur.
3. Google ve Apple provider bilgileri development değerleriyle girilir.
4. Redirect URL listesine Expo development callback'i ve `isbitir://auth/callback` eklenir.
5. `ADMIN` rolü signup metadata üzerinden verilmez; yalnızca kontrollü SQL/admin işlemiyle atanır.

### OAuth için gerekli gerçek değerler

Google tarafında:

- Android package: `com.isbitir.app`
- Web client ID: `850829107432-722tuskg1qbktela7q5bdj9o4d1jceav.apps.googleusercontent.com`
- Mobile app içinde kullanılan env: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

Apple tarafında:

- iOS bundle ID: `com.mpakdil.isbitir`
- Uygulama şeması: `isbitir`
- Callback path: `/auth/callback`

Supabase Auth redirect URL listesi:

- `isbitir://auth/callback`
- `isbitir://**`
- Expo development callback
- `exp://127.0.0.1:8082/--/auth/callback`
- `exp://**`

Supabase’de Google/Apple provider kurulumu için gereken paneller:

- Google Cloud Console: OAuth client bilgisi
- Apple Developer: Services ID, Team ID, Key ID ve private key
- Supabase Auth: provider enable + redirect URL allow-list

Mobil uygulamada `mobile/.env.example` dosyası örnek alınarak aşağıdaki değerler tanımlanır:

```env
EXPO_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=....apps.googleusercontent.com
```

Publishable key mobil uygulamada bulunabilir; `service_role` anahtarı kesinlikle bu dosyaya eklenmez.

## Mevcut kullanıcı verisi uyarısı

`public.users.id` alanları metin olarak UUID değerleri taşımaya devam eder; Auth karşılaştırması `auth.uid()::text` ile yapılır. Mevcut kullanıcıları aktarmadan önce Auth kullanıcılarının UUID eşlemesi ayrıca hazırlanmalıdır. Aynı e-posta ile farklı UUID oluşturulursa profil trigger'ı unique e-posta çakışması nedeniyle kaydı durdurur. Bu nedenle production veri importu, Auth import/eşleme betiği hazır olmadan yapılmamalıdır.

## Güvenlik kontrol listesi

- Anon kullanıcı doğrudan `users`, `bids`, `messages`, `payments` ve `credits` tablolarını okuyamıyor.
- Public usta listesi yalnızca `public_electricians` view'ından okunuyor.
- Public ilan listesi tam adresi göstermeyen `public_job_posts` view'ından okunuyor.
- Kullanıcı kendi `user_type`, ban, doğrulama veya kredi alanını değiştiremiyor.
- Teklif kabulü ve kredi harcaması yalnızca RPC içinde gerçekleşiyor.
- Private Storage bucket dosyaları URL bilinerek indirilemiyor.
- `notification_outbox` normal mobil istemciye kapalı.
- Edge Function secrets hiçbir `EXPO_PUBLIC_*` değişkeninde bulunmuyor.

## Production öncesi zorunlu test

En az iki normal kullanıcı, iki elektrikçi ve bir admin test hesabıyla pozitif/negatif RLS senaryoları çalıştırılmalıdır. Özellikle teklif fiyatı, mesaj, telefon, doğrulama belgesi, kredi ve yönetici alanlarında başka kullanıcı erişimi denenmelidir.

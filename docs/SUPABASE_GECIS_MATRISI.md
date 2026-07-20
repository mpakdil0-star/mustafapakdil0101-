# Supabase Geçiş Matrisi

Bu belge, mevcut Express.js + Prisma backend'in Supabase'e taşınması için ilk teknik envanterdir. İnceleme 12 Temmuz 2026 tarihinde `backend/src/routes`, controller/service katmanları, Prisma şeması ve mobil servis bağımlılıkları üzerinden yapılmıştır.

## 1. Karar özeti

| Kod | Hedef | Kullanım ölçütü |
|---|---|---|
| SDK | `supabase.from(...)` / Supabase Auth / Storage | Tek tabloya yönelik, RLS ile güvenli biçimde sınırlandırılabilen işlemler |
| RPC | PostgreSQL fonksiyonu | Birden fazla tablo, sayaç, bakiye veya durum geçişinin tek transaction içinde değişmesi |
| EDGE | Supabase Edge Function | Gizli anahtar, dış servis, yönetici yetkisi veya güvenilir sunucu doğrulaması gereken işlemler |
| RT | Supabase Realtime | Mesaj, teklif, ilan durumu ve bildirim gibi canlı güncellemeler |
| CRON | Supabase Cron + Edge Function/RPC | Süre dolumu, hatırlatma ve bakım işleri |

Mobil uygulama hiçbir zaman `service_role`, Expo access token, ödeme doğrulama anahtarı, Google servis hesabı veya başka bir servis sırrı taşımayacaktır.

## 2. Mevcut kapsam

- 22 Express route dosyasında 137 HTTP işlemi bulunuyor.
- Prisma şemasında 10 enum ve 26 model bulunuyor.
- Mobil uygulamada merkezi servislerin yanında ekranlardan doğrudan `api` kullanan çok sayıda çağrı var.
- Auth; özel access/refresh JWT, Google token çözümleme, Apple token çözümleme ve özel e-posta doğrulama katmanına bağlı.
- Canlı özellikler Socket.IO ile devam ediyor; push bildirimleri Supabase notification outbox + Edge Function hattına taşındı.
- Görseller yerel uploads ve Cloudinary yollarını birlikte kullanıyor.
- Teklif, kredi, iş tamamlama, değerlendirme ve sayaç güncellemeleri transaction gerektiriyor.

## 3. Route bazlı hedef matrisi

### 3.1 Authentication — `/auth`

| Mevcut işlem | Hedef | Not |
|---|---|---|
| `POST /register` | Supabase Auth `signUp` + profil trigger'ı | `full_name`, `user_type`, yasal sürüm ve servis kategorisi signup metadata ile taşınır. |
| `POST /login` | `signInWithPassword` | Özel JWT kaldırılır. |
| `POST /logout` | `signOut` | Cihaz push token'ı ayrıca pasifleştirilir. |
| `POST /refresh-token` | Supabase SDK | SDK session yenilemeyi yönetir; route kaldırılır. |
| `GET /me` | SDK: `users` + `electrician_profiles` | `auth.uid()` ile profil okunur. |
| `POST /forgot-password` | `resetPasswordForEmail` | Expo deep link dönüşü tanımlanır. |
| `POST /reset-password` | `updateUser({password})` | Recovery session sonrasında çalışır. |
| `POST /google` | Supabase Google OAuth / `signInWithIdToken` | Backend token decode kaldırılır. |
| `POST /apple` | Supabase Apple OAuth / `signInWithIdToken` | Apple adı yalnızca ilk girişte geldiği için metadata saklanır. |
| `POST /send-verification` | Supabase Auth resend | Özel SMTP akışı kaldırılabilir. |
| `POST /verify-email` | Supabase callback/session | Özel doğrulama kodu tabanı kaldırılır. |
| `POST /debug-activate` | Kaldır | Üretimde bulunmamalı. |

Karar: Mevcut bcrypt parola hash'leri için varsayılan geçiş yöntemi zorunlu parola sıfırlamadır. Hash importunun Supabase projesinin güncel destek koşulları ayrıca doğrulanmadan denenmemesi gerekir.

Not: Backend tarafındaki legacy `/auth` rotaları artık 410 Gone döndürüyor. Google/Apple/JWT tabanlı eski login akışları mobile tarafta Supabase Auth ile değiştirildi; bundan sonraki geliştirme yalnızca Supabase session akışı üzerinden ilerlemelidir.

Ek not: Aynı eski oturum mantığına bağlı `GET /users/me` rotası da retire edildi.

Backend middleware katmanı artık Supabase access token doğrulamasıyla çalışıyor; socket handshake ve admin oturum kontrolleri de aynı session mantığını kullanmalı.

Ek not: `POST /users/avatar`, `POST /users/avatar/base64` ve `DELETE /users/avatar` Express uçları retire edildi; profil görselleri doğrudan Supabase Storage üzerinden yönetilmelidir.

Ek not: İlan görselleri için backend Cloudinary yükleme yolu kaldırıldı; mobil uygulama görselleri doğrudan `job-images` bucket'ına yükleyip public URL gönderiyor.

### 3.2 Kullanıcı ve profil — `/users`

| İşlem grubu | Hedef | Güvenlik/iş kuralı |
|---|---|---|
| Kendi profilini okuma | SDK | `users.id = auth.uid()` |
| Profil güncelleme | RPC `update_my_profile` | `user_type`, ban, doğrulama, bakiye ve admin alanları kabul edilmez. |
| Avatar yükle/sil | Storage + RPC/SDK | `avatars/{uid}/...`; yalnızca kendi klasörü. |
| Parola değiştirme | Supabase Auth | `updateUser`; mevcut parola doğrulama gereksinimi ürün kararıdır. |
| Hesap silme | EDGE `delete-account` | Auth kullanıcısı ve ilişkili veriler güvenilir sunucu yetkisiyle işlenir. |
| İş geçmişi | SDK/view | RLS filtreli view veya iki sorgu. |
| Usta istatistikleri | SQL view/RPC | Toplulaştırılmış veri. |
| Doğrulama durumu | SDK | Yalnızca sahibi ve admin okuyabilir. |
| Doğrulama belgesi gönderme | Private Storage + SDK | Dosya yolu kullanıcı UID'si ile sınırlandırılır. |
| Push token kaydı | SDK `push_tokens` | Kullanıcı + cihaz bazlı; tek `users.push_token` alanı terk edilir. |
| Bildirim tercihleri | SDK/RPC | Kullanıcı yalnızca kendi tercihlerini değiştirir. |
| Usta listesi/detayı | Public view + SDK | Telefon, e-posta, ban nedeni gibi özel alanlar view'a alınmaz. |

### 3.3 İş ilanları — `/jobs`

| İşlem | Hedef | Not |
|---|---|---|
| Liste/detay | SDK + public view | Konuma göre JSON filtreleme için ileride PostGIS değerlendirilebilir. |
| Kendi ilanları | SDK | `citizen_id = auth.uid()` |
| İlan oluşturma | RPC `create_job` | Kullanıcı tipi, başlangıç durumu ve görsel sahipliği doğrulanır. |
| İlan düzenleme | RPC `update_job` | Yalnızca izin verilen durumlarda ilan sahibi. |
| Silme | RPC soft-delete | Fiziksel silme yerine `deleted_at`. |
| İptal | RPC `cancel_job` | Durum geçişi, tarih ve bildirim tek transaction. |
| Tamamlandı işaretleme/onay | RPC | Vatandaş/usta rolü ve mevcut durum doğrulanır. |
| Değerlendirme | RPC `complete_job_with_review` | İş, review, puan ortalaması ve sayaçlar atomik güncellenir. |
| İlan teklifleri | SDK + RLS | Yalnızca ilan sahibi, teklifi veren usta ve admin tam veriyi görür. Public teklif listesi kaldırılır. |

### 3.4 Teklifler — `/bids`

| İşlem | Hedef | Not |
|---|---|---|
| Teklif oluşturma | RPC `create_bid` | Kullanıcı tipi, ilan durumu, engel kaydı, tekrar teklif ve kredi kontrolü atomik. |
| Kendi teklifleri/detay | SDK | RLS ilişkiye göre erişim verir. |
| Güncelleme | RPC | Yalnızca bekleyen ve sahibi olunan teklif. |
| Kabul | RPC `accept_bid` | Teklif kabulü, diğer tekliflerin reddi, ilan ataması ve bildirim tek transaction. |
| Ret/geri çekme/silme | RPC | Durum makinesi ve olası kredi iadesi korunur. |
| Fiyat güncelleme isteği | RPC + notification | Taraf ve durum doğrulanır. |

### 3.5 Konuşma ve mesajlar — `/conversations`, `/messages`

| İşlem | Hedef | Not |
|---|---|---|
| Konuşma listesi/detay | SDK | RLS: kullanıcı iki katılımcıdan biri olmalı. |
| Bul veya oluştur | RPC `find_or_create_conversation` | Yarış durumunda çift konuşmayı unique constraint engeller. |
| Mesaj listesi | SDK | Konuşma üyeliği şart. |
| Mesaj gönderme | RPC `send_message` | Gönderen `auth.uid()`, alıcı diğer katılımcı; sayaç ve önizleme atomik. |
| Okundu işaretleme | RPC `mark_conversation_read` | Mesajlar ve unread sayaçları birlikte güncellenir. |
| Canlı mesajlar | RT | `messages` INSERT/UPDATE aboneliği. |
| Socket.IO | Kaldır | Son istemci Realtime'a geçtikten sonra. |

### 3.6 Bildirimler — `/notifications`

#### Socket.IO → Supabase Realtime olay eşlemesi

| Eski Socket.IO olayı | Supabase karşılığı | Mobil uygulama durumu |
|---|---|---|
| `join_conversation` | `conversation:{id}` kanalında `messages` tablosu `postgres_changes` aboneliği | `messageService.subscribeToConversation` kullanıyor; RLS konuşma üyeliğini denetliyor. |
| `leave_conversation` | `supabase.removeChannel(channel)` | Abonelik temizleme fonksiyonu ekran kapanırken çağrılıyor. |
| `send_message` | RPC `send_message` | Yazma, konuşma özeti ve bildirim transaction içinde yürütülüyor. |
| `new_message` | `messages` tablosunda `INSERT` olayı | Aynı konuşma filtresi üzerinden alınır. |
| `mark_as_read` | RPC `mark_conversation_read` | Okundu alanları ve okunmamış sayaçları atomik güncellenir. |
| `messages_read` | `messages` tablosunda `UPDATE` olayı | `replica identity full` ile eski/yeni satır bilgisi Realtime'a açıktır. |
| `notification` | Kullanıcı filtreli `notifications` tablosu değişikliği | `notificationService.subscribe` kullanıyor; push ayrıca outbox hattından gider. |
| `typing` / `user_typing` | Gerekirse özel Realtime Broadcast olayı | Mevcut mobil arayüz bu geçici durumu tüketmediği için ilk sürümde bilinçli olarak devre dışı. |
| `stop_typing` / `user_stopped_typing` | Gerekirse özel Realtime Broadcast olayı | Yazıyor göstergesi yeniden etkinleştirilirse konuşma kanalı üzerinde eklenebilir. |
| Socket `error` | Supabase SDK/RPC hata sonucu | İstek yapan servis doğrudan hatayı ele alır; ayrı yayın olayı gerekmez. |

`mobile/services/socketService.ts` yalnızca eski ekran dinleyicileri kaldırılırken kırılmayı önleyen etkisiz bir uyumluluk katmanıdır; veri kaynağı değildir.

| İşlem | Hedef | Not |
|---|---|---|
| Liste/okunmamış sayı | SDK | Kullanıcı yalnızca kendi kayıtlarını görür. |
| Tekini/tümünü/ilişkiliyi okundu yap | SDK veya RPC | Toplu güncelleme RLS ile sınırlı. |
| Sil | SDK soft-delete | Denetim ihtiyacı varsa fiziksel silme yapılmaz. |
| Uygulama içi canlı bildirim | RT | Kullanıcının notification satırlarına abonelik. |
| Push gönderimi | EDGE `process-push-outbox` | Database webhook/outbox tarafından çağrılır. |

Öneri: Olay üreten transaction `notification_outbox` kaydı oluşturur. Edge Function olayı işler, push sonucunu ve Expo ticket/receipt bilgisini kaydeder. Bu tasarım veritabanı işlemini dış servis arızasına bağlamaz.

### 3.7 Konum, favori ve engelleme

| Grup | Hedef | Not |
|---|---|---|
| Konum CRUD | SDK | `locations.user_id = auth.uid()`; tek varsayılan adres constraint/trigger ile korunur. |
| Favori CRUD/kontrol | SDK | `(user_id, electrician_id)` unique; yalnızca sahibi. |
| Engelle/engeli kaldır | RPC `toggle_block` | Kendini engelleme yasak; mesaj/teklif RLS politikaları block ilişkisini dikkate alır. |
| Engellenenleri listele | SDK | Yalnızca engelleyen kullanıcı görür. |

### 3.8 Takvim ve cari hesap — `/calendar`, `/ledger`

| İşlem | Hedef | Not |
|---|---|---|
| Takvim CRUD | SDK | Sahiplik RLS. |
| Takvim işini tamamla | RPC | `addToLedger` seçeneğinde event + ledger atomik. |
| Ledger liste/özet | SDK + view/RPC | Yalnızca sahibinin kayıtları. |
| Ledger CRUD/paid | SDK veya RPC | Finansal etkisi genişlerse tüm yazımlar RPC'ye alınır. |
| Yerel hatırlatıcı | Expo istemci | Cihaz içi hatırlatıcı olarak kalabilir. |
| Sunucu hatırlatıcısı | CRON + EDGE | Uygulama kapalıyken push gerekiyorsa. |

### 3.9 Ödeme ve kredi — `/payments`

| İşlem | Hedef | Not |
|---|---|---|
| Paket listesi | Static config veya public tablo | İstemci tarafından değiştirilemez. |
| Satın alma başlatma | İstemci IAP | Mağaza akışı istemcide. |
| Satın alma doğrulama/kredi verme | EDGE `verify-purchase` | Google/Apple doğrulaması ve idempotency zorunlu. |
| Geçmiş | SDK | Kullanıcı yalnızca kendi credit/payment kayıtlarını görür. |

Kredi bakiyesi istemci tarafından hiçbir koşulda doğrudan güncellenemez. Satın alma transaction kimliği unique olmalı ve aynı makbuz ikinci kez kredi üretmemelidir.

### 3.10 Yasal belgeler

| İşlem | Hedef | Not |
|---|---|---|
| Aktif belgeleri okuma | Public SDK/view | Yalnızca aktif sürümler. |
| Onay kaydı | RPC `record_consent` | Kullanıcı kimliği token'dan; geçmiş kayıt değiştirilemez. |
| HTML sayfaları | Uygulama içi içerik veya hosted static sayfa | Mağaza bağlantıları için kalıcı URL gerekebilir. |

### 3.11 Destek, rapor ve yorumlar

| Grup | Hedef | Not |
|---|---|---|
| Destek talebi oluştur/listele | SDK | Kullanıcı yalnızca kendi ticket'larını görür. |
| Destek mesajı | RPC/SDK + RT | Ticket sahibi veya admin. |
| Ticket durum değişikliği | RPC admin | Normal kullanıcıya kapalı. |
| Rapor nedenleri | Uygulama sabiti/public tablo | Değişim ihtiyacına göre. |
| Rapor oluştur/kendi raporları | SDK | Raporlayan UID token'dan. |
| Tüm raporlar/durum değişikliği | Admin RPC/EDGE | Admin claim ve public profil rolü birlikte doğrulanır. |
| Usta yorumlarını listele | Public view | Yalnızca görünür yorumlar. |
| Yorum gönderme | RPC | Tamamlanmış iş ve tek yorum constraint'i. |

### 3.12 Marketplace, vitrin ve topluluk

| Grup | Hedef | Not |
|---|---|---|
| Marketplace okuma | SDK | Yayındaki ürünler. |
| Ürün ekle/güncelle/sil | SDK + RLS | Sahiplik; moderasyon alanları korunur. |
| Showcase okuma | SDK | Aktif/görünür içerik. |
| Showcase yazma/silme | SDK + RLS | Sahip veya admin. |
| Forum post/comment | SDK | Sahiplik, block ve soft-delete politikaları. |
| İş paylaşım postları | SDK | Sahiplik ve görünürlük politikaları. |

### 3.13 Admin — `/admin`

| İşlem grubu | Hedef | Not |
|---|---|---|
| Kullanıcı/ilan/doğrulama/rapor listeleri | Admin view/RPC | `is_admin()` kontrolü. |
| Kullanıcı güncelleme, ban, doğrulama | Admin RPC | Değişiklik audit log'a yazılır. |
| Dashboard istatistikleri | Admin view/RPC | Toplulaştırılmış sorgular. |
| Toplu push | EDGE | Admin doğrulaması + gönderim limiti. |
| Kullanıcı silme | EDGE | Auth Admin API gerektiği için service role. |
| Impersonation | Yeniden tasarlanmalı | Kullanıcının gerçek session'ını taklit eden token üretmek yerine destek amaçlı salt-okunur “view as” önerilir. |

### 3.14 AI — `/ai`

| İşlem | Hedef | Not |
|---|---|---|
| Sohbet | EDGE `ai-chat` | Gemini anahtarı secret olarak saklanır; rate limit ve kullanım kaydı gerekir. |
| Maliyet tahmini | EDGE veya SQL/config | Model çağrısı gerekmiyorsa statik veri/RPC daha ucuzdur. |

## 4. Veritabanı ve RLS iş paketleri

### P0 — Auth ve kimlik temeli

- `public.users.id` değeri `auth.users.id` ile aynı UUID olmalı.
- `password_hash` kaldırılmalı veya veri geçişi boyunca nullable olmalı.
- `handle_new_user()` trigger'ı yalnızca kontrollü metadata alanlarını kullanmalı.
- `user_type` için istemci yükseltmesi engellenmeli; `ADMIN` signup metadata'dan kabul edilmemeli.
- `is_admin()` yardımcı fonksiyonu search path sabitlenmiş biçimde yazılmalı.
- Public profil için özel alanları içermeyen view oluşturulmalı.

### P0 — Kritik transaction fonksiyonları

- `create_bid`
- `accept_bid`
- `cancel_job`
- `mark_job_complete`
- `confirm_job_complete`
- `complete_job_with_review`
- `find_or_create_conversation`
- `send_message`
- `mark_conversation_read`
- `verify_purchase` işinin veritabanı tarafı

### P1 — Kullanıcıya ait standart CRUD

- locations
- favorites
- blocks
- calendar_events
- ledger_entries
- notifications
- support tickets/messages
- reports

### P1 — İçerik ve topluluk

- marketplace_products
- showcase_items
- forum_posts/comments
- job_sharing_posts
- legal_documents/consents

## 5. Mobil bağımlılık sırası

Mevcut ekranlar merkezi servisleri ve doğrudan `api` çağrılarını birlikte kullanıyor. Dönüşüm sırası:

1. `supabaseClient`, Auth ve uygulama açılışında session restorasyonu.
2. `authService`, `socialAuthService`, `authSlice`.
3. `userService`, profil ve Storage servisleri.
4. `jobService` ve `jobSlice`.
5. `bidService` ve `bidSlice`.
6. `favoriteService`, `locationService`, doğrudan profil ekranı çağrıları.
7. `messageService`, Realtime adapter ve Socket.IO aboneliklerinin kaldırılması.
8. `notificationService`, push token kaydı ve Realtime bildirimleri.
9. Takvim, ledger, destek, rapor, ödeme ve admin ekranları.
10. Axios ve eski API sabitlerinin tamamen kaldırılması.

Servislerin dış metot adları ilk aşamada korunacaktır. Böylece Redux ve ekranlar kontrollü biçimde taşınabilir.

## 6. Güvenlik bulguları ve zorunlu aksiyonlar

1. `backend/src/config/cloudinary.ts` içinde Cloudinary API anahtarı ve secret için kaynak kodu varsayılanları bulunuyor. Bu bilgiler ifşa olmuş kabul edilmeli, Cloudinary panelinden yenilenmeli ve koddan kaldırılmalıdır.
2. Repo kökünde `service-account-key.json` bulunuyor. Gerçek anahtar içeriyorsa derhal iptal/rotate edilmeli ve Git geçmişinden temizlenmesi ayrı kontrollü iş olarak ele alınmalıdır.
3. Mobil anon/publishable Supabase anahtarı gizli değildir; güvenlik bunun saklanmasına değil eksiksiz RLS politikalarına dayanır.
4. `service_role`, Expo access token, Gemini anahtarı ve mağaza doğrulama kimlikleri yalnızca Edge Function secrets içinde tutulmalıdır.
5. Public ilan/usta view'ları doğrudan `users` tablosunu açmamalı; e-posta, telefon, ban ve bildirim ayarları dışarı sızmamalıdır.
6. Mevcut `/jobs/:jobId/bids` public yaklaşımı kaldırılmalıdır; teklif fiyatları ve mesajları ilişkisiz kullanıcılara açılmamalıdır.
7. Admin yetkisi yalnızca kullanıcı tarafından değiştirilebilir metadata'ya dayandırılmamalıdır.

## 7. Birinci adımın kabul kriterleri

- [x] Tüm Express route grupları hedef teknolojiyle sınıflandırıldı.
- [x] Transaction gerektiren kritik işlemler belirlendi.
- [x] Dış servis ve gizli anahtar gerektiren işlemler Edge Function olarak ayrıldı.
- [x] Socket.IO olaylarının Realtime hedefi belirlendi.
- [x] Mobil servislerin dönüşüm sırası belirlendi.
- [x] İlk güvenlik riskleri kayda geçirildi.
- [x] Her Socket.IO event adının Realtime tablo olayıyla birebir eşleme eki hazırlandı.
- [x] Bağlı development Supabase projesindeki veri ve public medya hacmi ölçüldü (13 Temmuz 2026).
- [x] Development projesi `eu-central-1` bölgesinde `isbitir-development` olarak bağlandı.
- [ ] Ayrı production Supabase projesi oluşturulup oluşturulmayacağı kullanıcı tarafından kararlaştırılacak.

## 8. Sonraki uygulanacak iş

İkinci adımda yerel `supabase/` proje iskeleti ve ilk SQL migrasyonları hazırlanacaktır:

1. Prisma şemasından PostgreSQL başlangıç şeması.
2. Auth kullanıcı/profil uyarlaması.
3. Ortak `updated_at` trigger'ı ve yardımcı güvenlik fonksiyonları.
4. Tablo bazlı RLS politikaları.
5. Storage bucket ve object politikaları.
6. Kritik RPC fonksiyonlarının ilk sürümü.

Bu SQL paketi development Supabase projesinde pozitif ve negatif RLS testleri geçmeden mobil istemciye bağlanmayacaktır.

Veri ve medya hacmi ölçümü için hazırlanan yardımcı komutlar:

- `backend npm run audit:source-data`
- `backend npm run audit:target-data`
- `backend npm run audit:source-media`
- `backend npm run audit:target-media`

13 Temmuz 2026 hedef denetimi sonucu: 16 kullanıcı, 9 usta profili, 12 ilan, 5 teklif, 4 konuşma, 2 mesaj ve toplam 17 public medya referansı bulundu. Medya referanslarının 17/17'si Supabase Storage alan adını kullanıyor ve erişilebilir durumda. Kaynak karşılaştırması için tanımlı eski PostgreSQL adresi `localhost:5432` olduğundan, yerel kaynak veritabanı tekrar çalıştırılmadan kaynak sayımı alınamıyor.

## 9. Development proje doğrulama sonucu

13 Temmuz 2026 tarihinde bağlı `isbitir-development` projesinde otomatik test paketi çalıştırıldı:

- RLS: 9/9 başarılı; başka kullanıcı profili, konumu ve Storage klasörüne yazma engellendi.
- Storage: 13/13 başarılı; public/private okuma, sahiplik, MIME kontrolü ve silme politikaları doğrulandı.
- Temel RPC iş akışları: ilan, teklif, kredi düşümü, teklif kabulü, konuşma, mesaj, okundu durumu, iş tamamlama, bildirim ve outbox başarılı.
- Realtime: 4/4 başarılı; kimlik doğrulama, kanal aboneliği, RLS görünürlüğü ve notification INSERT teslimatı doğrulandı.
- Edge Functions: 13/13 başarılı; method guard, yetkilendirme, AI maliyet hesabı, satın alma güvenli reddi, push processor ve hesap silme akışı doğrulandı.
- Push Cron: 4/4 başarılı; pending outbox kaydı otomatik işlendi ve cihazı olmayan kullanıcı güvenli biçimde `SKIPPED` durumuna alındı.

Tüm paket `backend` klasöründe `npm run test:supabase` komutuyla yeniden çalıştırılabilir. Testler benzersiz geçici kullanıcı/kayıtlar oluşturur ve `finally` temizliğiyle kaldırır. Test ortamında Node.js 22 veya üzeri kullanılmalıdır.

## 10. Production proje durumu

13 Temmuz 2026 tarihinde aşağıdaki production altyapısı CLI üzerinden hazırlandı:

- Proje: `isbitir-production`
- Project ref: `pjqkyekieryfzclsmhke`
- Region: `eu-central-1`
- Compute: `nano`
- SQL migration: 0001–0022 eksiksiz uygulandı.
- Edge Functions: `ai-assistant`, `delete-account`, `verify-google-play-purchase`, `process-push-outbox` deploy edildi.
- Push cron URL'si migration 0022 ile ortam bazlı hale getirildi ve production fonksiyon URL'sine ayarlandı.
- Production RLS, Storage, temel RPC ve Realtime testleri geçti.
- Production Edge Function testleri 13/13, push cron testleri 4/4 geçti.
- Production mobil Supabase URL, publishable key ve Google Web Client ID değerleri EAS `production` ortamına eklendi.
- Production `service_role` ve veritabanı parolası yalnızca Git dışındaki `backend/.env.production` dosyasında tutuluyor; mobil/EAS ortamına eklenmedi.
- Günlük geliştirmede yanlış production deploy'unu önlemek için yerel Supabase CLI tekrar `isbitir-development` projesine bağlandı.

Development ve production projelerinde e-posta Auth açık; Google ve Apple provider'ları kapalıdır. Bu iki provider için ilgili platform konsollarından alınacak gerçek OAuth yapılandırması olmadan production aktivasyonu yapılmamalıdır.

## 11. Production veri aktarımı

13 Temmuz 2026 tarihinde development projesinden production projesine veri aktarımı tamamlandı:

- 16 Supabase Auth kullanıcısı aynı UUID değerleri korunarak oluşturuldu.
- 16 public kullanıcı, 9 usta profili, 26 yasal onay, 12 ilan, 5 teklif, 4 konuşma, 2 mesaj, 2 yorum, 7 kredi hareketi, 18 bildirim, 98 konum ve diğer dolu tablolar taşındı.
- 1 push token taşındı; eski `notification_outbox` ve delivery ticket kayıtları tekrar push gönderilmemesi için taşınmadı.
- 17 Storage nesnesi production bucket'larına kopyalandı ve veri içindeki URL'ler production alan adına çevrildi.
- Auth kullanıcı ID kümesi ve 26 uygulama tablosunun tüm ID kümeleri kaynakla birebir doğrulandı.
- Production medya denetimi 17/17 erişilebilir nesne olarak geçti.
- Betik `npm run migrate:supabase:plan` ile salt-okunur plan, `npm run migrate:supabase:execute` ile idempotent aktarım/denetim yapar.

Supabase Admin API kaynak parola hash'lerini döndürmediği için kullanıcı parolaları taşınamadı. Her production Auth hesabı güçlü ve bilinmeyen geçici parola ile oluşturuldu; `app_metadata.requires_password_reset=true` olarak işaretlendi. Kullanıcılar production geçişinde mobil uygulamadaki “Şifremi unuttum” akışıyla yeni parola belirlemelidir. Production SMTP ve kullanıcı iletişim zamanı kararlaştırılmadan otomatik recovery e-postası gönderilmedi.

## 12. Production SMTP hazırlığı

- Kullanılmayan legacy Express `emailVerificationService` ve Nodemailer bağımlılıkları kaldırıldı.
- Supabase recovery ve confirmation e-posta şablonları `supabase/templates/` altında hazırlandı.
- `npm run smtp:plan` hiçbir ayar değiştirmeden zorunlu değerleri kontrol eder.
- `npm run smtp:configure` yalnızca tüm değerler mevcutsa Supabase Management API üzerinden custom SMTP'yi etkinleştirir.
- Script hata çıktısında SMTP kullanıcı adı/parolası veya access token yazdırmaz.

Production SMTP şu anda etkinleştirilmedi. Eksik değerler: `SUPABASE_ACCESS_TOKEN`, `SMTP_ADMIN_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. `SMTP_SENDER_NAME` isteğe bağlıdır ve varsayılanı `İşBitir` olur. Bu bilgiler SMTP sağlayıcısından alınmadan 16 kullanıcıya parola sıfırlama e-postası gönderilmemelidir.

## 13. Canlı proje kararı

13 Temmuz 2026 tarihinde operasyonu sadeleştirmek ve mevcut kullanıcı parolalarını korumak için `isbitir-development` (`htsdqvlyyiyawtmuhryi`) projesinin canlı mobil proje olarak kullanılmasına karar verildi.

- `mobile/.env.production` Supabase URL/key değerleri canlı projeye geri yönlendirildi.
- EAS `production` ortamındaki Supabase URL/key değerleri aynı canlı projeye güncellendi ve değerler birebir doğrulandı.
- Mevcut 16 Auth kullanıcısının parolaları bu projede çalışmaya devam eder; toplu parola sıfırlama ve custom SMTP bu geçiş için zorunlu değildir.
- `isbitir-production` (`pjqkyekieryfzclsmhke`) projesi silinmedi ve mobil build tarafından kullanılmıyor. Silme işlemi yalnızca açık kullanıcı onayıyla yapılacaktır.
- Yerel Supabase CLI canlı/geliştirme projesine bağlı kalır.

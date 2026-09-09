# İşBitir web yayın kontrol listesi

Bu liste tamamlanmadan web ilan akışı canlı kullanıcıya açılmamalıdır.

## Teknik akış

- Supabase projesinde anonymous sign-in özelliğini etkinleştir.
- `supabase/migrations/0042_secure_web_job_flow.sql` migration'ını yetkili bir hesapla önce staging ortamında uygula.
- `process-push-outbox` Edge Function ve zamanlanmış outbox işinin aktif olduğunu doğrula.
- Web ortamına `NEXT_PUBLIC_SUPABASE_URL` ve publishable key değerlerini ekle. Service-role anahtarını istemci ortamına koyma.
- Web'den test talebi oluştur; doğru kategori ve bölgedeki onaylı/müsait usta hesabında bildirimin göründüğünü doğrula.
- Usta uygulamasından gerçek teklif ver; aynı web oturumunda teklifin gerçek zamanlı göründüğünü doğrula.
- Teklifi kabul et; diğer tekliflerin kapandığını ve yalnızca kabul sonrasında telefon erişimi oluştuğunu doğrula.
- İptal, süresi dolmuş ilan, tarayıcı verisi silinmiş oturum ve bildirim teslim edilememesi senaryolarını test et.

## Hukuki ve KVKK

- `NEXT_PUBLIC_LEGAL_ENTITY_NAME`, `NEXT_PUBLIC_LEGAL_ADDRESS`, KVKK e-posta/KEP ve destek kanallarını gerçek işletme bilgileriyle doldur.
- KVKK aydınlatma metni, kullanım koşulları, gizlilik politikası ve platform rolü metnini Türkiye'de yetkili bir hukukçuya incelet.
- Supabase, Expo ve diğer altyapı sağlayıcılarının veri bölgelerini, alt işleyenlerini, sözleşmelerini ve olası yurt dışı aktarım mekanizmasını belgeleyip doğrula.
- Saklama-imha politikasını tüm veri sınıfları için belirle. Migration'daki 180 günlük web iletişim kaydı temizliğinin gerçek politika ile uyumunu doğrula.
- KVKK başvuru prosedürü, kimlik doğrulama yöntemi ve yanıt sorumlularını belirle.
- Pazarlama/analitik aracı eklenecekse zorunlu olmayan depolama başlamadan önce ayrı tercih mekanizması kur.
- Sahte veya doğrulanmamış yorum, kullanıcı sayısı, puan ortalaması, başarı oranı ve süre iddiası yayımlama.

## Yayın

- Hukuki bilgiler doğrulandıktan sonra `NEXT_PUBLIC_LEGAL_READY=true` yap. Bu anahtar kapalıyken site arama motorlarına `noindex` verir ve sitemap boş döner.
- Gerçek Google Play ve App Store bağlantılarını ortam değişkenlerine ekle; genel mağaza ana sayfalarına yönlendirme yapma.
- Destek ve KVKK e-posta kutularının gerçekten çalıştığını test et.
- HTTPS, üretim alan adı, güvenlik başlıkları, hata izleme ve yedekleme/geri dönüş prosedürünü doğrula.
- Masaüstü ve mobil erişilebilirlik, klavye kullanımı ve kritik form hata mesajlarını son kez test et.

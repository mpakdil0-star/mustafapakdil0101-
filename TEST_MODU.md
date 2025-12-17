# 🔧 Test Modu (Database Olmadan)

## ✅ Mock Authentication Aktif!

Database kurulumu yapmadan test edebilirsiniz!

## 🎯 Nasıl Kullanılır?

### Giriş Yapma:
- **Herhangi bir email** girebilirsiniz (örn: `test@test.com`)
- **Herhangi bir şifre** girebilirsiniz
- Mock authentication ile otomatik giriş yapacak

### Kayıt Olma:
- Tüm alanları doldurun
- Herhangi bir email/şifre kullanabilirsiniz
- Mock mode ile otomatik kayıt olacak

## ⚠️ Önemli Notlar

- **Sadece Test İçin:** Bu mock mode sadece UI testi için
- **Gerçek Data Yok:** Database olmadığı için veriler kaydedilmiyor
- **Production'da Kapatın:** Production'a geçerken mock mode'u kapatın

## 🔧 Mock Mode'u Kapatma

`mobile/services/authService.ts` dosyasında:
```typescript
const MOCK_MODE = __DEV__ && false; // false yapın
```

## 📝 Test Senaryoları

1. ✅ Login ekranı görünüyor mu?
2. ✅ Form validasyonu çalışıyor mu?
3. ✅ Giriş yapılabiliyor mu?
4. ✅ Kayıt olunabiliyor mu?
5. ✅ Ana ekrana yönlendirme yapıyor mu?

## ✅ Database Kurulumu

Gerçek database ile çalışmak için:
1. Supabase kurulumu yapın (`SUPABASE_KURULUM.md`)
2. Mock mode'u kapatın
3. Backend'i yeniden başlatın


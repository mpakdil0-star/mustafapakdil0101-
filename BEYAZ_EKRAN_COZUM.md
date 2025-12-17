# 🔧 Beyaz Ekran Sorunu - Çözüm Adımları

## ✅ Yapılan Düzeltmeler

1. **index.tsx** - Router kontrolü basitleştirildi
2. **_layout.tsx** - SafeAreaProvider eklendi

## 🔍 Hata Kontrolü

### 1. Terminal/Console Hatalarını Kontrol Edin

Expo Go uygulamasında:
- Telefonu sallayın (shake gesture)
- "Debug Remote JS" seçeneğini açın
- Tarayıcıda console'u açın (F12)
- Kırmızı hata mesajlarını kontrol edin

### 2. Metro Bundler Hatalarını Kontrol Edin

Terminal'de şu komutu çalıştırın:
```powershell
cd mobile
npx expo start --clear
```

### 3. Cache Temizleme

```powershell
cd mobile
npx expo start -c
```

### 4. Node Modules Yeniden Yükleme (Gerekirse)

```powershell
cd mobile
rm -rf node_modules
npm install
```

## 🐛 Olası Hata Kaynakları

1. **API Bağlantı Hatası** - Backend çalışıyor mu?
2. **Import Hatası** - Eksik dosya veya yanlış import
3. **Store Hatası** - Redux store yapılandırması
4. **Router Hatası** - Expo Router yapılandırması

## ✅ Test Etme

1. Expo Go'da remote debugging açın
2. Terminal'de hataları kontrol edin
3. Hata mesajlarını bana gönderin


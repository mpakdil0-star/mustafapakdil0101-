# Backend Bağlantı Test Rehberi

## ✅ Backend'i Test Etme

### 1. Backend'i Başlatın
```bash
cd backend
npm run dev
```

Backend başarıyla başladıysa şunu görmelisiniz:
```
Server is running on port 3000
Network access: http://192.168.1.59:3000
```

### 2. Health Check Test
Telefonunuzun tarayıcısından veya bilgisayardan test edin:

```
http://192.168.1.59:3000/health
```

Başarılı yanıt:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "..."
}
```

### 3. API Endpoint Test
```
http://192.168.1.59:3000/api/v1/auth/register
```

## 🔍 Network Error Çözüm Adımları

### Adım 1: Backend Çalışıyor mu?
- Backend terminal'inde hata var mı kontrol edin
- Port 3000'de başka bir uygulama çalışıyor mu?

### Adım 2: IP Adresi Doğru mu?
```bash
ipconfig | findstr IPv4
```
IP adresini kontrol edin ve `mobile/constants/api.ts` dosyasında güncelleyin.

### Adım 3: Aynı Wi-Fi Ağında mı?
- Bilgisayar ve telefon aynı Wi-Fi ağında olmalı
- Farklı ağlardaysanız bağlanamazsınız

### Adım 4: Firewall Kontrolü
Windows Firewall port 3000'i engelliyor olabilir:
1. Windows Defender Firewall → Advanced Settings
2. Inbound Rules → New Rule
3. Port → TCP → 3000 → Allow

### Adım 5: Expo Console Log'ları
Expo Go'da console log'larını kontrol edin:
- API_BASE_URL doğru mu?
- Network request log'ları görünüyor mu?

## 🐛 Debug Modu

Mobile uygulamada console'da şunları göreceksiniz:
- `🔗 API_BASE_URL initialized: http://...`
- `API Request: POST /auth/login`
- `API Error: ...` (hata varsa)

Bu log'lar sorunun nerede olduğunu gösterecektir.


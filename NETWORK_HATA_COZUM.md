# 🔧 Network Hatası Çözüm Rehberi

## ❌ Sorun: "Network Error - Backend'e bağlanılamıyor"

### 🔍 Olası Nedenler:

1. **Backend çalışmıyor**
2. **IP adresi yanlış**
3. **Firewall port 3000'i engelliyor**
4. **Telefon ve bilgisayar farklı ağda**

## ✅ Çözüm Adımları:

### 1. Backend'in Çalışıp Çalışmadığını Kontrol Edin

**Terminal'de backend klasöründe:**
```powershell
cd backend
npm run dev
```

**Başarılı başladıysa şunu göreceksiniz:**
```
Server is running on port 3000
Server accessible at http://0.0.0.0:3000
Local access: http://localhost:3000
Network access: http://192.168.1.59:3000
```

### 2. IP Adresinizi Bulun

**Windows PowerShell'de:**
```powershell
ipconfig
```

**"Wireless LAN adapter Wi-Fi" veya "Ethernet adapter" bölümünden IPv4 adresini bulun:**
```
IPv4 Address. . . . . . . . . . . : 192.168.1.XXX
```

### 3. IP Adresini Mobil Uygulamada Güncelleyin

**`mobile/constants/api.ts` dosyasını açın:**
```typescript
const LOCAL_IP = '192.168.1.XXX'; // Yeni IP adresinizi buraya yazın
```

**Değişiklikten sonra:**
- Metro bundler'ı durdurun (Ctrl+C)
- Yeniden başlatın: `npm start`
- Uygulamayı yeniden yükleyin

### 4. Firewall Kontrolü

**Windows Firewall'da port 3000'i açın:**

1. **Windows Defender Firewall** açın
2. **"Gelişmiş Ayarlar"** seçin
3. **"Gelen Kuralları"** > **"Yeni Kural"**
4. **"Port"** seçin
5. **TCP**, **3000** portu
6. **"Bağlantıya İzin Ver"** seçin
7. **Tüm profilleri** seçin
8. İsim verin: "Backend Port 3000"

**VEYA PowerShell ile:**
```powershell
New-NetFirewallRule -DisplayName "Backend Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 5. Network Bağlantısını Kontrol Edin

**Telefon ve bilgisayar aynı Wi-Fi ağında olmalı:**
- ✅ Aynı router'a bağlı
- ✅ Aynı SSID (Wi-Fi adı)
- ✅ Aynı subnet (örn: 192.168.1.x)

### 6. Test Etme

**Backend çalışıyorsa, browser'da test edin:**
```
http://localhost:3000/api/v1/health
```

**Yanıt gelirse backend çalışıyor:**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "..."
}
```

**Network IP ile test:**
```
http://192.168.1.59:3000/api/v1/health
```
(IP adresinizi kullanın)

### 7. Backend'i Manuel Başlatma

**Ayrı terminal açın:**
```powershell
cd backend
npm run dev
```

**Başarılı başladıysa:**
- Terminal'de log mesajları görünecek
- Port 3000'de dinliyor olmalı

### 8. Mobil Uygulamada Debug

**API base URL'i kontrol edin:**
```typescript
// mobile/services/api.ts içinde
console.log('API_BASE_URL:', API_BASE_URL);
```

**Network isteklerini izleyin:**
- Telefonu sallayın
- "Debug Remote JS" açın
- Browser console'da API isteklerini görebilirsiniz

## 🔄 Hızlı Çözüm:

1. **IP adresinizi bulun:** `ipconfig`
2. **`mobile/constants/api.ts`** dosyasında IP'yi güncelleyin
3. **Backend'i başlatın:** `cd backend && npm run dev`
4. **Firewall'ı kontrol edin**
5. **Metro bundler'ı yeniden başlatın:** `cd mobile && npm start`

## ✅ Başarı Kriterleri:

- ✅ Backend terminal'de çalışıyor
- ✅ `http://localhost:3000/api/v1/health` yanıt veriyor
- ✅ `http://YOUR_IP:3000/api/v1/health` yanıt veriyor
- ✅ Mobil uygulamada network hatası yok
- ✅ Jobs ekranı veri çekebiliyor


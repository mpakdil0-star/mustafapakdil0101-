# 🚀 Backend Başlatma Rehberi

## ⚠️ Backend Çalışmıyor mu?

### Hızlı Çözüm

1. **Yeni bir terminal açın** (VS Code/Cursor'da veya PowerShell)
2. **Backend klasörüne gidin:**
   ```powershell
   cd backend
   ```
3. **Backend'i başlatın:**
   ```powershell
   npm run dev
   ```

### Başarılı Başlatma Mesajları

Backend başarıyla başladıysa, terminalde şunları görmelisiniz:
```
[timestamp] [INFO] Server is running on port 3000
[timestamp] [INFO] Server accessible at http://0.0.0.0:3000
[timestamp] [INFO] Local access: http://localhost:3000
[timestamp] [INFO] Network access: http://192.168.1.62:3000
[timestamp] [INFO] Environment: development
[timestamp] [INFO] API Version: v1
```

### Hata Durumunda

Eğer hata mesajı görüyorsanız:

#### "Cannot find module" hatası:
```powershell
cd backend
npm install
npm run dev
```

#### "Port 3000 already in use" hatası:
- Port 3000'i kullanan process'i durdurun
- Veya `.env` dosyasında `PORT=3001` olarak değiştirin

#### TypeScript hatası:
```powershell
cd backend
npm run prisma:generate
npm run dev
```

### Backend Çalışıyor mu Test Etme

Browser'da şu URL'i açın:
```
http://localhost:3000/api/v1/health
```

Yanıt gelirse backend çalışıyordur:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "...",
  "database": "connected" veya "disconnected"
}
```

### Network IP ile Test

Telefonunuzdan erişmek için:
```
http://192.168.1.62:3000/api/v1/health
```

⚠️ **Önemli:** IP adresi değiştiyse `mobile/constants/api.ts` dosyasındaki `LOCAL_IP` değerini güncelleyin!

### IP Adresinizi Bulma

Windows PowerShell:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"}
```

### Root'tan Başlatma

Proje root dizininden her ikisini birden başlatmak için:
```powershell
npm start
```

Bu komut hem backend'i hem de mobile development server'ı başlatır.

### Sorun Devam Ederse

1. Backend terminalindeki **tam hata mesajını** kontrol edin
2. `backend/node_modules` klasörünün var olduğundan emin olun
3. `backend/.env` dosyasının var olduğundan emin olun
4. Firewall'ın port 3000'i engellemediğinden emin olun


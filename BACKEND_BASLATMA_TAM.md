# 🚀 Backend Başlatma - Detaylı Rehber

## ❌ Backend Çalışmıyor

Backend port 3000'de çalışmıyor. Aşağıdaki adımları takip edin:

## ✅ Adım Adım Çözüm

### 1. Backend Terminal'i Açın

VS Code/Cursor'da yeni bir terminal açın veya PowerShell açın.

### 2. Backend Klasörüne Gidin

```powershell
cd backend
```

### 3. Bağımlılıkları Kontrol Edin

```powershell
npm install
```

### 4. Backend'i Başlatın

```powershell
npm run dev
```

### 5. Başarı Mesajını Kontrol Edin

Terminal'de şunu görmelisiniz (yaklaşık 10-15 saniye içinde):

```
🚀 Server is running on port 3000
📱 Server accessible at http://0.0.0.0:3000
💻 Local access: http://localhost:3000
🌐 Network access: http://192.168.1.62:3000
```

### 6. Test Edin

Browser'da şu URL'i açın:
```
http://localhost:3000/api/v1/jobs?status=OPEN&limit=20
```

JSON response gelirse backend çalışıyordur!

## ⚠️ Sorun Devam Ederse

### Port 3000 Kullanımda
```powershell
# Port'u kullanan process'i bul
netstat -ano | findstr ":3000"

# Process ID'yi kullanarak durdur (örneğin 12345)
taskkill /PID 12345 /F
```

### Node Modules Eksik
```powershell
cd backend
npm install
npm run dev
```

### TypeScript Hatası
```powershell
cd backend
npm install -g typescript ts-node nodemon
npm run dev
```

## ✅ Başarı Kontrolü

Backend başarıyla başladığında:
- ✅ Terminal'de "Server is running" mesajı görünür
- ✅ `http://localhost:3000/api/v1/health` çalışır
- ✅ `http://localhost:3000/api/v1/jobs` çalışır

## 📱 Mobil Uygulamayı Test Edin

Backend başladıktan sonra:
1. Expo Go'da uygulamayı yenileyin
2. Jobs tab'ına gidin
3. İlanlar görünmeli


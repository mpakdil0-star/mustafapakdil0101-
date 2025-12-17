# 🚀 Backend Başlatma - Adım Adım

## ⚠️ Önemli Notlar

1. **Ctrl+C bir komut DEĞİLDİR** - Terminal'de çalışan bir process'i durdurmak için kullanılır
2. **Backend klasöründe olmanız gerekir** - `npm run dev` komutunu çalıştırmadan önce

## ✅ Doğru Yöntem

### Adım 1: Terminal Açın
VS Code/Cursor'da yeni bir terminal açın veya PowerShell açın

### Adım 2: Backend Klasörüne Gidin
```powershell
cd backend
```

### Adım 3: Backend'i Başlatın
```powershell
npm run dev
```

### Adım 4: Başarı Mesajını Kontrol Edin
Terminal'de şunu görmelisiniz:
```
🚀 Server is running on port 3000
📱 Server accessible at http://0.0.0.0:3000
💻 Local access: http://localhost:3000
🌐 Network access: http://192.168.1.62:3000
```

## 🔄 Eğer Backend Zaten Çalışıyorsa

### Önce Durdu-run
1. Backend çalışan terminal'i bulun
2. Terminal'de **Ctrl+C** tuşlarına basın (bu bir komut değil, process'i durdurur)
3. Sonra yeniden başlatın: `npm run dev`

## 🐛 Hata Alırsanız

### "npm ERR! Missing script: 'dev'"
- **Çözüm:** Backend klasöründe olduğunuzdan emin olun
  ```powershell
  cd backend
  npm run dev
  ```

### "Port 3000 already in use"
- **Çözüm:** Port 3000'i kullanan process'i durdurun veya farklı port kullanın

### "Cannot find module"
- **Çözüm:** Bağımlılıkları yükleyin
  ```powershell
  cd backend
  npm install
  npm run dev
  ```

## ✅ Test Etme

Backend başladıktan sonra, browser'da şu URL'i açın:
```
http://localhost:3000/api/v1/jobs?status=OPEN&limit=20
```

JSON response gelirse backend çalışıyordur!


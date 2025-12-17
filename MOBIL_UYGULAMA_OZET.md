# 📱 Mobil Uygulama - İş İlanı ve Teklif Sistemi

## ✅ Tamamlanan Özellikler

### 1. Backend API Entegrasyonu

**Service'ler:**
- ✅ `jobService.ts` - İş ilanları API çağrıları
- ✅ `bidService.ts` - Teklifler API çağrıları

**Özellikler:**
- İş ilanı oluşturma, listeleme, görüntüleme
- İş ilanı güncelleme, silme
- Teklif oluşturma, listeleme
- Teklif kabul/reddetme
- Teklif geri çekme

### 2. Redux State Management

**Slice'lar:**
- ✅ `jobSlice.ts` - İş ilanları state yönetimi
- ✅ `bidSlice.ts` - Teklifler state yönetimi

**Actions:**
- `fetchJobs` - İş ilanlarını getir
- `fetchJobById` - Tek bir iş ilanını getir
- `fetchMyJobs` - Kullanıcının iş ilanlarını getir
- `createJob` - Yeni iş ilanı oluştur
- `updateJob` - İş ilanını güncelle
- `deleteJob` - İş ilanını sil

- `fetchJobBids` - İş ilanına ait teklifleri getir
- `fetchMyBids` - Kullanıcının tekliflerini getir
- `createBid` - Yeni teklif oluştur
- `acceptBid` - Teklifi kabul et
- `rejectBid` - Teklifi reddet
- `withdrawBid` - Teklifi geri çek

### 3. UI Ekranları

**Jobs Screen (`app/(tabs)/jobs.tsx`):**
- ✅ İş ilanlarını listeleme
- ✅ Pull-to-refresh
- ✅ Loading state
- ✅ Empty state
- ✅ İş ilanı kartları (başlık, açıklama, konum, bütçe, aciliyet)
- ✅ Teklif sayısı ve görüntülenme sayısı
- ✅ İş ilanı detayına yönlendirme (yakında eklenecek)

## 🔄 API Endpoint'leri

Tüm endpoint'ler `mobile/constants/api.ts` dosyasında tanımlı:

```typescript
// Jobs
JOBS: '/jobs'
JOB_DETAIL: (id) => `/jobs/${id}`
MY_JOBS: '/jobs/my-jobs'

// Bids
BIDS: '/bids'
JOB_BIDS: (jobId) => `/jobs/${jobId}/bids`
MY_BIDS: '/bids/my-bids'
```

## 📋 Kullanım Örnekleri

### İş İlanlarını Getirme

```typescript
import { useAppDispatch } from '../hooks/redux';
import { fetchJobs } from '../store/slices/jobSlice';

const dispatch = useAppDispatch();

// Tüm açık iş ilanlarını getir
dispatch(fetchJobs({ status: 'OPEN', limit: 20 }));

// Kategorisine göre filtrele
dispatch(fetchJobs({ status: 'OPEN', category: 'Electrical Repair' }));
```

### İş İlanı Oluşturma

```typescript
import { createJob } from '../store/slices/jobSlice';

dispatch(createJob({
  title: 'Ev Elektrik Arızası',
  description: 'Acil elektrik sorunu var',
  category: 'Electrical Repair',
  location: {
    address: 'Test Mahallesi, Test Sokak No:1',
    city: 'İstanbul',
    district: 'Kadıköy',
    latitude: 40.9888,
    longitude: 29.0225,
  },
  urgencyLevel: 'HIGH',
  estimatedBudget: 500,
}));
```

### Teklif Oluşturma

```typescript
import { createBid } from '../store/slices/bidSlice';

dispatch(createBid({
  jobPostId: 'job-id',
  amount: 450,
  estimatedDuration: 2,
  message: '2 saatte tamamlayabilirim',
}));
```

## 🚀 Sonraki Adımlar

1. **Job Detail Screen** - İş ilanı detay sayfası
2. **Create Job Screen** - Yeni iş ilanı oluşturma formu
3. **Bid List Screen** - Teklifleri görüntüleme
4. **Create Bid Screen** - Teklif verme formu
5. **My Jobs Screen** - Kullanıcının iş ilanlarını görüntüleme
6. **My Bids Screen** - Kullanıcının tekliflerini görüntüleme

## 🔧 Test Etme

1. Backend'i başlatın:
   ```bash
   cd backend
   npm run dev
   ```

2. Mobil uygulamayı başlatın:
   ```bash
   cd mobile
   npm start
   ```

3. Expo Go'da QR kodu tarayın

4. Login yapın ve Jobs sekmesine gidin

5. İş ilanları listelenmelidir (eğer database'de varsa)


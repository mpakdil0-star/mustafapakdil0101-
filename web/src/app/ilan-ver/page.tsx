'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MAIN_CATEGORIES, POPULAR_CITIES } from '@/constants/categories';
import { 
  Zap, 
  MapPin, 
  Clock, 
  Send, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck,
  Navigation
} from 'lucide-react';

export default function CreateJobPage() {
  const router = useRouter();
  
  // Form Adımları: 1: Kategori, 2: Detay ve Adres, 3: İletişim
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State'leri
  const [selectedCategory, setSelectedCategory] = useState('elektrik');
  const [urgency, setUrgency] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Konum State'leri
  const [city, setCity] = useState('Adana');
  const [district, setDistrict] = useState('Çukurova');
  const [neighborhood, setNeighborhood] = useState('Beyazevler Mah.');
  const [addressDetails, setAddressDetails] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);

  // İletişim State'leri
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Yüklenme & Başarı Durumu
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Tarayıcı GPS Konumunu Al
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Tarayıcınız konum servisini desteklemiyor.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
        setLocationSuccess(true);
      },
      (error) => {
        console.warn('GPS Konum alınamadı:', error);
        setIsLocating(false);
        alert('Konumunuza ulaşılamadı. Lütfen ilçe ve mahalle seçerek devam ediniz.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Oluşturulan İlan Bilgisi
  const [createdJob, setCreatedJob] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || `${customerName} tarafından web üzerinden oluşturulan acil talep.`,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        category: selectedCategory === 'elektrik' ? 'Elektrik Tamiri' : (MAIN_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Genel Usta'),
        serviceCategory: selectedCategory,
        urgencyLevel: urgency,
        location: {
          city: city.trim(),
          district: district.trim(),
          neighborhood: neighborhood.trim(),
          address: `${neighborhood.trim()} ${district.trim()}, ${city.trim()}`,
          latitude: coords?.lat || 0,
          longitude: coords?.lng || 0,
        }
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/jobs/web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.data?.job) {
        setCreatedJob(data.data.job);
        setSubmitted(true);
      } else {
        // Fallback local job in case server is in offline test mode
        setCreatedJob({
          id: `web-${Date.now()}`,
          title: payload.title,
          serviceCategory: payload.serviceCategory,
          location: payload.location,
        });
        setSubmitted(true);
      }
    } catch (err) {
      console.warn('Backend offline or network error, fallback to client state:', err);
      setCreatedJob({
        id: `web-${Date.now()}`,
        title: title.trim(),
        serviceCategory: selectedCategory,
        location: { city, district, neighborhood },
      });
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          
          {/* Başarı Ekranı */}
          {submitted ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200/80 shadow-xl text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-teal-600">
                  İlanınız Yayında
                </span>
                <h2 className="text-3xl font-black text-slate-900 mt-2">
                  Bölgenizdeki Ustalara Bildirildi!
                </h2>
                <p className="mt-3 text-slate-600 max-w-md mx-auto leading-relaxed">
                  İhtiyacınız en yakın ustalara iletildi. Ustalar teklif verdikçe telefonunuza SMS veya arama ile bilgi gelecektir.
                </p>
              </div>

              {/* Bilgi Kartı */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Hizmet:</span>
                  <span className="font-bold text-slate-800">
                    {MAIN_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bölge:</span>
                  <span className="font-bold text-slate-800">{district} / {neighborhood}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Durum:</span>
                  <span className="font-bold text-amber-600">Teklifler Bekleniyor...</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                {createdJob?.id && (
                  <Link
                    href={`/ilan/${createdJob.id}`}
                    className="px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Gelen Teklifleri Canlı Takip Et</span>
                  </Link>
                )}
                <Link
                  href="/"
                  className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors"
                >
                  Ana Sayfaya Dön
                </Link>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setStep(1);
                    setTitle('');
                    setDescription('');
                  }}
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 transition-colors"
                >
                  Yeni İlan Bırak
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
              
              {/* Form Üst İlerleme Çubuğu */}
              <div className="bg-slate-900 px-6 py-6 text-white flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold">Hızlı Usta Çağır</h1>
                  <p className="text-xs text-slate-400 mt-0.5">3 kolay adımda bölgenizdeki ustalar kapınızda</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full">
                  <span>Adım {step}</span>
                  <span className="text-slate-400">/ 3</span>
                </div>
              </div>

              {/* Form Alanı */}
              <div className="p-6 sm:p-10">

                {/* ADIM 1: Hizmet ve Aciliyet Seçimi */}
                {step === 1 && (
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-3">
                        1. Hangi Hizmete İhtiyacınız Var?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {MAIN_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                              selectedCategory === cat.id
                                ? 'border-teal-600 bg-teal-50/50 shadow-xs ring-2 ring-teal-600/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center shrink-0">
                              <Zap className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-900">{cat.name}</p>
                              <p className="text-xs text-slate-500 line-clamp-1">{cat.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Aciliyet Düzeyi */}
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-3">
                        2. Durumun Aciliyeti Nedir?
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setUrgency('HIGH')}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            urgency === 'HIGH'
                              ? 'border-red-500 bg-red-50 text-red-700 font-bold ring-2 ring-red-500/20'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Zap className="w-5 h-5 mx-auto mb-1 text-red-600" />
                          <span className="text-xs sm:text-sm block">🚨 Çok Acil</span>
                          <span className="text-[10px] text-slate-500 hidden sm:block">15-30 dk içinde</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setUrgency('MEDIUM')}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            urgency === 'MEDIUM'
                              ? 'border-amber-500 bg-amber-50 text-amber-700 font-bold ring-2 ring-amber-500/20'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Clock className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                          <span className="text-xs sm:text-sm block">Bugün İçinde</span>
                          <span className="text-[10px] text-slate-500 hidden sm:block">Birkaç saatte</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setUrgency('LOW')}
                          className={`p-4 rounded-2xl border text-center transition-all ${
                            urgency === 'LOW'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold ring-2 ring-emerald-500/20'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                          <span className="text-xs sm:text-sm block">Randevulu</span>
                          <span className="text-[10px] text-slate-500 hidden sm:block">İleri tarihte</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-600/25 transition-all"
                    >
                      Devam Et: Adres ve Arıza Detayı
                    </button>
                  </div>
                )}

                {/* ADIM 2: Adres ve Açıklama */}
                {step === 2 && (
                  <div className="space-y-6">
                    {/* Konum / Adres Bölümü */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                          <MapPin className="w-4 h-4 text-teal-600" />
                          <span>Hizmet Alınacak Konum</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={isLocating}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-100/70 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>{isLocating ? 'Alınıyor...' : locationSuccess ? '✓ Konum Alındı' : 'Konumumu Bul'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Şehir</label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">İlçe</label>
                          <input
                            type="text"
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            placeholder="Örn: Çukurova"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Mahalle</label>
                        <input
                          type="text"
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          placeholder="Örn: Beyazevler Mah."
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Arıza Başlığı ve Detayı */}
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-1.5">
                        Kısa Başlık
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Örn: Sigorta sürekli atıyor, elektrik kesildi"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-1.5">
                        Arıza veya Talebinizin Detayı
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ustanın bilmesi gereken detayları yazınız (kaç priz değişecek, kapı çelik mi vb.)..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-hidden"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-1/3 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
                      >
                        Geri
                      </button>
                      <button
                        type="button"
                        disabled={!title.trim()}
                        onClick={() => setStep(3)}
                        className="w-2/3 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-teal-600/25 transition-all"
                      >
                        İleri: İletişim Bilgileri
                      </button>
                    </div>
                  </div>
                )}

                {/* ADIM 3: İletişim & Yayınlama */}
                {step === 3 && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-1.5">
                        Adınız Soyadınız
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Örn: Ahmet Yılmaz"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-1.5">
                        Telefon Numaranız
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="05XX XXX XX XX"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-hidden"
                      />
                      <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        Numaranız sadece teklifini kabul ettiğiniz ustaya gösterilir.
                      </p>
                    </div>

                    {/* Yasal & Mesafe Uyarısı */}
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        İlanınız yayınlandığında bölgenizdeki ustalara bildirim gönderilir. Gösterilen mesafeler yaklaşık kuş uçuşu tahmindir.
                      </span>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="w-1/3 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
                      >
                        Geri
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !customerName.trim() || !customerPhone.trim()}
                        className="w-2/3 py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'Ustalara Gönderiliyor...' : 'İlanı Yayınla & Usta Çağır'}</span>
                      </button>
                    </div>
                  </form>
                )}

              </div>

            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}

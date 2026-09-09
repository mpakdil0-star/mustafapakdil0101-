'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MAIN_CATEGORIES } from '@/constants/categories';
import { 
  Zap, 
  ShieldCheck, 
  Coins, 
  MapPin, 
  CheckCircle2, 
  ArrowRight,
  Smartphone
} from 'lucide-react';

export default function UstaKayitPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceCategory, setServiceCategory] = useState('elektrik');
  const [city, setCity] = useState('Adana');
  const [district, setDistrict] = useState('Çukurova');
  const [experienceYears, setExperienceYears] = useState('5');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          {submitted ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200/80 shadow-xl text-center space-y-6 max-w-xl mx-auto">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-teal-600">
                  Başvurunuz Alındı
                </span>
                <h2 className="text-3xl font-black text-slate-900 mt-2">
                  Aramıza Hoş Geldiniz!
                </h2>
                <p className="mt-3 text-slate-600 leading-relaxed text-sm">
                  Usta kaydınız başarıyla oluşturuldu. Bölgenizdeki acil iş fırsatlarını kaçırmamak için hemen mobil uygulamamızı indirip giriş yapabilirsiniz.
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-3 justify-center">
                <a
                  href="https://play.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Usta Mobil Uygulamasını İndir</span>
                </a>

                <Link
                  href="/"
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                >
                  Ana Sayfaya Dön
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Sol Bilgilendirme Kolonu */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/60">
                    Ustalar İçin İşBitir
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-3">
                    Bölgenizdeki Acil İşleri İlk Siz Alın
                  </h1>
                  <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                    Dükkanda müşteri beklemek yok. Çevrenizde şalteri atan, kapıda kalan veya tesisatı bozulan vatandaşların çağrıları anında cebinize gelsin.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 font-bold">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Anında Çağrı Bildirimi</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Konumunuza yakın acil ilanlar telefonunuza yüksek öncelikli sesle düşer.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Komisyonsuz & Aracısız</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Müşteriyle doğrudan görüşürsünüz, kazancınızdan yüksek komisyonlar kesilmez.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Güvenilir Usta Profili</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Tamamladığınız her işten sonra aldığınız 5 yıldızla bölgenizde öne çıkın.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sağ Kayıt Formu Kolonu */}
              <div className="lg:col-span-7">
                <div className="p-7 sm:p-9 rounded-3xl bg-white border border-slate-200/80 shadow-xl space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Usta Ön Kayıt Formu</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Bilgilerinizi doldurun, aynı gün içinde profilinizi aktif edelim.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Adınız Soyadınız
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Örn: Mehmet Demir"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Telefon Numaranız
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="05XX XXX XX XX"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Ana Uzmanlık Alanınız
                        </label>
                        <select
                          value={serviceCategory}
                          onChange={(e) => setServiceCategory(e.target.value)}
                          className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition-all"
                        >
                          {MAIN_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Mesleki Deneyim
                        </label>
                        <select
                          value={experienceYears}
                          onChange={(e) => setExperienceYears(e.target.value)}
                          className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition-all"
                        >
                          <option value="1-3">1 - 3 Yıl</option>
                          <option value="3-5">3 - 5 Yıl</option>
                          <option value="5-10">5 - 10 Yıl</option>
                          <option value="10+">10 Yıldan Fazla</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Hizmet Şehri
                        </label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          İlçe / Bölge
                        </label>
                        <input
                          type="text"
                          required
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="Örn: Çukurova"
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || !fullName.trim() || !phone.trim()}
                        className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-teal-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Zap className="w-4 h-4 fill-white" />
                        <span>{isSubmitting ? 'Kaydediliyor...' : 'Usta Olarak Kayıt Ol'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 text-center pt-1">
                      Kaydolarak Kullanım Koşulları ve Gizlilik Politikası şartlarını kabul etmiş olursunuz.
                    </p>
                  </form>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}

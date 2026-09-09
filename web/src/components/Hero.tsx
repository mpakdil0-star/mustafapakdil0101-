'use client';

import Link from 'next/link';
import { ShieldCheck, Clock, Award, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/40 via-white to-slate-50 pt-8 pb-16 lg:pt-12 lg:pb-20">
      {/* Arka plan dekoratif yumuşak ışıklar */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-teal-200/20 via-sky-200/20 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Sol Kolon - Başlık ve Harekete Geçirici Metin */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            
            {/* Üst Güven Rozeti */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/70 border border-teal-200 text-teal-800 text-xs sm:text-sm font-semibold tracking-tight shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
              <span>Türkiye'nin En Hızlı Usta & Acil Çağrı Platformu</span>
            </div>

            {/* Ana Başlık */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Evinizde Acil Usta mı Lazım?{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-sky-600">
                En Hızlı Şekilde
              </span>{' '}
              Kapınızda!
            </h1>

            {/* Açıklama */}
            <p className="text-lg sm:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Elektrik sigortanız mı attı, kapıda mı kaldınız veya su mu akıtıyor? İhtiyacınızı saniyeler içinde belirtin, bölgenizdeki en yakın ve puanı yüksek ustalardan anında teklif alın.
            </p>

            {/* Hızlı Butonlar */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/ilan-ver"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-teal-600/25 transition-all hover:shadow-teal-600/40 hover:-translate-y-0.5"
              >
                <Zap className="w-5 h-5 fill-white text-white" />
                <span>Hemen Acil Usta Çağır</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                href="/usta-kayit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-base px-7 py-4 rounded-2xl border border-slate-200/90 shadow-2xs transition-colors"
              >
                <span>Usta mısınız? İşe Başlayın</span>
              </Link>
            </div>

            {/* Güven ve Garanti Maddeleri */}
            <div className="pt-6 border-t border-slate-200/60 grid grid-cols-3 gap-4 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-slate-900">Hızlı Yanıt</p>
                  <p className="text-slate-500 hidden sm:block">En yakın usta teklifi</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-slate-900">Onaylı Profil</p>
                  <p className="text-slate-500 hidden sm:block">Kimlik & Oda kayıtlı</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-slate-900">Puan & Yorum</p>
                  <p className="text-slate-500 hidden sm:block">Gerçek müşteri puanı</p>
                </div>
              </div>
            </div>

          </div>

          {/* Sağ Kolon - Hızlı İlan Bırakma & Teklif Alma Widget'ı */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/10 border border-slate-200/90 space-y-4">
              
              {/* Widget Başlığı */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Hızlı Usta Çağır</h2>
                    <p className="text-[11px] text-slate-500">1 dakikada teklifler telefonunuzda</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Canlı
                </span>
              </div>

              {/* Hızlı Form */}
              <form action="/ilan-ver" method="GET" className="space-y-3.5">
                
                {/* 1. Hizmet Seçimi */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Hizmet Alanı
                  </label>
                  <select
                    name="kategori"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition-all"
                  >
                    <option value="elektrik">⚡ Elektrik & Sigorta Tamiri</option>
                    <option value="cilingir">🔑 Çilingir & Kilit Değişimi</option>
                    <option value="tesisat">💧 Su Tesisatı & Kaçak Tespiti</option>
                    <option value="klima">❄️ Klima Bakım & Montaj</option>
                    <option value="kombi-servis">🔥 Kombi Servisi & Petek</option>
                    <option value="beyaz-esya">🛠️ Beyaz Eşya Servisi</option>
                  </select>
                </div>

                {/* 2. İlçe / Konum */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    İlçe / Bölge
                  </label>
                  <input
                    type="text"
                    name="ilce"
                    defaultValue="Çukurova, Adana"
                    placeholder="Örn: Çukurova / Beyazevler"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition-all"
                  />
                </div>

                {/* 3. Kısa Sorun / Talep */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sorununuz Nedir?
                  </label>
                  <input
                    type="text"
                    name="baslik"
                    placeholder="Örn: Şalter attı, kapıda kaldım vb."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-hidden transition-all"
                  />
                </div>

                {/* Gönder Butonu */}
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-teal-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Teklifleri Gör & Usta Çağır</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Alt Güven Rozeti */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Ücretsiz İlan
                </span>
                <span>Puanı Yüksek Onaylı Ustalar</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

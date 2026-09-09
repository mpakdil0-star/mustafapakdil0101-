'use client';

import Link from 'next/link';
import { ShieldCheck, Clock, Award, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/50 via-white to-slate-50 pt-12 pb-20 lg:pt-20 lg:pb-28">
      {/* Arka plan dekoratif yumuşak ışıklar */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-teal-200/20 via-sky-200/20 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
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
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Elektrik sigortanız mı attı, kapıda mı kaldınız, su mu akıtıyor? İhtiyacınızı yazın, bölgenizdeki puanı yüksek ustalardan anında teklif alın ve kolayca iletişime geçin.
            </p>

            {/* Ana Aksiyon Butonları */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/ilan-ver"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-teal-600/30 transition-all hover:shadow-teal-600/50 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Zap className="w-5 h-5 fill-white text-white" />
                <span>Hemen Acil Usta Çağır</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                href="/usta-kayit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-base px-7 py-4 rounded-2xl border border-slate-200/80 shadow-xs transition-colors"
              >
                <span>Usta mısınız? İşe Başlayın</span>
              </Link>
            </div>

            {/* Güven ve Garanti Maddeleri */}
            <div className="pt-6 border-t border-slate-200/60 grid grid-cols-3 gap-4 text-left">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-slate-900">Hızlı Yanıt</p>
                  <p className="text-slate-500 hidden sm:block">En yakın usta teklifi</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-slate-900">Onaylı Profil</p>
                  <p className="text-slate-500 hidden sm:block">Kimlik ve oda kayıtlı</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-slate-900">Puan & Yorum</p>
                  <p className="text-slate-500 hidden sm:block">Gerçek müşteri puanı</p>
                </div>
              </div>
            </div>

          </div>

          {/* Sağ Kolon - Canlı Çağrı ve Güven Kartı Önizlemesi */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/10 border border-slate-100">
              
              {/* Canlı Simülasyon Üst Barı */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Şu An Canlı Çağrılar</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Adana & Çevresi</span>
              </div>

              {/* Acil İlan Örneği */}
              <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50/50 border border-red-100/80">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[11px] font-bold">
                      <Zap className="w-3 h-3 fill-white" /> ACİL ÇAĞRI
                    </span>
                    <h3 className="text-base font-bold text-slate-900 pt-1">Çukurova / Beyazevler Mah.</h3>
                    <p className="text-xs text-slate-600">"Klima çalışınca ana şalter atıyor, mutfak elektriksiz kaldı."</p>
                  </div>
                  <span className="text-xs font-bold text-red-600 bg-white px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs whitespace-nowrap">
                    ~2.3 km
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-red-200/50 flex items-center justify-between text-xs text-slate-500">
                  <span>3 Usta Teklif Verdi</span>
                  <span className="font-semibold text-emerald-600">Teklifler İnceleniyor</span>
                </div>
              </div>

              {/* Usta Teklif Kartı */}
              <div className="mt-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                      MÜ
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Mehmet Usta</h4>
                      <p className="text-xs text-slate-500">Elektrik & Elektronik Uzmanı (4.9 ★)</p>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-teal-700 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200/60">
                    450 ₺
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>"Malzemelerim hazır, teklifinizi kabul ederseniz hemen yola çıkabilirim."</span>
                </div>
              </div>

              {/* Hızlı Buton */}
              <Link
                href="/ilan-ver"
                className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors"
              >
                <span>Siz de Hemen İhtiyacınızı Bildirin</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

'use client';

import { Smartphone, Check, Star } from 'lucide-react';

export default function AppDownload() {
  return (
    <section id="uygulama-indir" className="py-20 bg-gradient-to-tr from-slate-950 via-slate-900 to-teal-950 text-white relative overflow-hidden">
      {/* Arka plan ışık efektleri */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.15),transparent_50%)] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Sol Metin Alanı */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5" /> Cebinizdeki En Yakın Usta
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              İşBitir Mobil Uygulamasını <br className="hidden sm:inline" />
              Hemen İndirin
            </h2>

            <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
              Acil durumlarda tek tıkla arama yapın, gelen teklifleri cebinizden anlık bildirimlerle takip edin. Hem vatandaşlar hem de ustalar için tek uygulama.
            </p>

            {/* Özellik Maddeleri */}
            <div className="space-y-3 pt-2 text-sm text-slate-300">
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Acil çağrılarda 15 dakikada en yakın usta eşleşmesi</span>
              </div>
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Usta kimlik, belge ve müşteri puanı şeffaflığı</span>
              </div>
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>Konuma dayalı gerçek zamanlı mesafe hesaplama</span>
              </div>
            </div>

            {/* Mağaza Butonları */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
              {/* Google Play */}
              <a
                href="https://play.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all hover:scale-105 active:scale-95"
              >
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 uppercase font-medium leading-none">İndir</p>
                  <p className="text-base font-bold tracking-tight text-white leading-tight">Google Play</p>
                </div>
              </a>

              {/* App Store */}
              <a
                href="https://apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-all hover:scale-105 active:scale-95"
              >
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 uppercase font-medium leading-none">Yakında</p>
                  <p className="text-base font-bold tracking-tight text-white leading-tight">App Store</p>
                </div>
              </a>
            </div>

          </div>

          {/* Sağ Kolon: Puan ve İstatistik Kartı */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md max-w-sm w-full space-y-6 text-center">
              <div className="inline-flex p-3 rounded-2xl bg-teal-500/10 text-teal-400 mb-2">
                <Star className="w-8 h-8 fill-teal-400" />
              </div>
              <div>
                <span className="text-5xl font-black text-white">4.9</span>
                <span className="text-slate-400 text-lg"> / 5.0</span>
                <p className="text-xs text-slate-400 mt-1">1.200+ Gerçek Müşteri Değerlendirmesi</p>
              </div>

              <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-teal-400">15 Dk</p>
                  <p className="text-xs text-slate-400 mt-0.5">Ortalama Usta Varış</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-400">%98</p>
                  <p className="text-xs text-slate-400 mt-0.5">Memnuniyet Oranı</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

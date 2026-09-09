'use client';

import { FileEdit, BellRing, PhoneCall } from 'lucide-react';

const steps = [
  {
    step: '01',
    title: 'İhtiyacınızı Belirtin',
    desc: 'Adresinizi veya konumunuzu seçin, yaşadığınız arızayı ya da montaj talebini 1 dakikada forma yazın.',
    icon: <FileEdit className="w-8 h-8 text-teal-600" />
  },
  {
    step: '02',
    title: 'Ustaların Tekliflerini Görün',
    desc: 'Bölgenizdeki onaylı ustalara anında çağrı gider. Gelen fiyat tekliflerini, usta puanlarını ve yorumları inceleyin.',
    icon: <BellRing className="w-8 h-8 text-sky-600" />
  },
  {
    step: '03',
    title: 'Onaylayın ve Ustayı Arayın',
    desc: 'Bütçenize ve vaktinize en uygun ustayı seçip teklifini onaylayın; tek tıkla doğrudan telefonla arayıp kapınıza çağırın.',
    icon: <PhoneCall className="w-8 h-8 text-emerald-600" />
  }
];

export default function HowItWorks() {
  return (
    <section id="nasil-calisir" className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Başlık Alanı */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-200/60">
            Kolay & Güvenli Süreç
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
            İşBitir Nasıl Çalışır?
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            Dakikalar içinde ustanız kapınızda olsun. Hiçbir karmaşık işlem yok.
          </p>
        </div>

        {/* Adımlar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, index) => (
            <div
              key={item.step}
              className="relative p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-xl hover:shadow-slate-900/5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-2xs">
                    {item.icon}
                  </div>
                  <span className="text-4xl font-black text-slate-200 select-none">
                    {item.step}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-teal-700">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                <span>Adım {index + 1} / 3</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

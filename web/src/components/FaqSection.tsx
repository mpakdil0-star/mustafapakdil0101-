'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: 'İşBitir üzerinden usta çağırmak ücretli mi?',
    answer:
      'Hayır, web sitemiz veya mobil uygulamamız üzerinden ilan vermek ve bölgenizdeki ustalardan fiyat teklifi almak tamamen ücretsizdir. Yalnızca ustanızla karşılıklı anlaştığınız iş bedelini ustanıza ödersiniz.',
  },
  {
    question: 'Ustalar ne kadar sürede teklif verir veya gelir?',
    answer:
      'İlan verdiğiniz anda arıza detaylarınız ve konumunuz, o bölgede aktif olan doğrulanmış elektrik ustalarına anlık bildirim olarak iletilir. Genellikle birkaç dakika içinde ilk teklifleri almaya başlarsınız. Ustanın adresinize varış süresi ise trafik ve mesafe durumuna göre karşılıklı olarak teyit edilir.',
  },
  {
    question: 'Sistemdeki ustalar güvenilir mi?',
    answer:
      'İşBitir bünyesinde hizmet veren tüm ustalar, mesleki deneyim ve kimlik doğrulaması kontrolünden geçer. Ayrıca her iş bitiminde müşteriler tarafından puanlanır ve yorumlanır. Düşük puan alan veya kurallara uymayan ustalar sistemden elenir.',
  },
  {
    question: 'Fiyat nasıl belirlenir, sonradan sürpriz yaşar mıyım?',
    answer:
      'İlan verirken arızanın türünü ve aciliyetini belirtirsiniz. Ustalar bu doğrultuda tahmini veya net fiyat teklifi iletir. Kabul ettiğiniz teklif üzerinden usta ile doğrudan telefonla görüşerek işin kapsamını netleştirebilirsiniz.',
  },
  {
    question: 'Elektrik ustasıyım, sisteme nasıl kayıt olabilirim?',
    answer:
      'Web sitemizdeki "Usta mısınız? Kayıt Olun" sayfasına giderek ya da İşBitir Usta mobil uygulamasını indirerek dakikalar içinde profilinizi oluşturabilir, onay sürecinin ardından bölgenizdeki iş fırsatlarına anında ulaşabilirsiniz.',
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
            Merak Edilenler
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sıkça Sorulan Sorular
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Aklınıza takılan tüm soruların yanıtları burada.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200/80 rounded-2xl overflow-hidden transition-colors duration-150"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full py-4.5 px-5 sm:px-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-900 text-base sm:text-lg">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-teal-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

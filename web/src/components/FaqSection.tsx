'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  { question: 'Talep oluşturmak ücretli mi?', answer: 'İşBitir web sitesinde hizmet talebi oluşturmak için kullanıcıdan ilan ücreti alınmaz. Ustanın teklif ettiği hizmet bedeli ve olası malzeme giderleri taraflar arasında netleştirilir.' },
  { question: 'Ne kadar sürede teklif gelir?', answer: 'Sabit bir teklif veya varış süresi verilemez. Usta müsaitliği, hizmet bölgesi, talep türü, cihaz bağlantısı ve bildirim ayarları sonucu etkiler. Gelen teklifler takip ekranında görünür.' },
  { question: 'Hangi ustalara bildirim gider?', answer: 'Talebin kategori, il ve ilçe bilgileri; aktiflik, hizmet bölgesi ve platformdaki onay durumu gibi eşleştirme ölçütleriyle değerlendirilir. Bildirim teslimi veya teklif verilmesi garanti edilmez.' },
  { question: 'Telefon numaram ne zaman paylaşılır?', answer: 'Telefon numaranız teklif aşamasında ustalara gösterilmez. Bir teklifi kabul ettiğinizde, hizmet iletişiminin kurulabilmesi için kabul edilen usta iletişim bilginize erişebilir.' },
  { question: 'Teklif nihai fiyat mıdır?', answer: 'Teklif, ustanın ilan bilgilerine göre yaptığı değerlendirmedir. Yerinde tespit, ek iş veya malzeme ihtiyacı tutarı değiştirebilir. Hizmet başlamadan önce kapsamı ve toplam bedeli ustayla netleştirin.' },
  { question: 'Usta olarak nasıl katılabilirim?', answer: 'Usta kayıt ve belge süreci mobil uygulama üzerinden yürütülür. Profiliniz gerekli kontroller tamamlandıktan sonra uygun ilan bildirimlerini alabilir.' },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center"><span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800"><HelpCircle className="h-3.5 w-3.5" /> Sık sorulanlar</span><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Karar vermeden önce bilinmesi gerekenler</h2></div>
        <div className="space-y-3">{faqs.map((faq, index) => { const active = open === index; const panel = `faq-panel-${index}`; return <article key={faq.question} className="overflow-hidden rounded-2xl border border-slate-200"><h3><button type="button" onClick={() => setOpen(active ? null : index)} aria-expanded={active} aria-controls={panel} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-bold text-slate-900 hover:bg-slate-50 sm:px-6">{faq.question}<ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${active ? 'rotate-180 text-teal-600' : ''}`} /></button></h3>{active && <div id={panel} className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 text-sm leading-7 text-slate-600 sm:px-6">{faq.answer}</div>}</article>; })}</div>
      </div>
    </section>
  );
}

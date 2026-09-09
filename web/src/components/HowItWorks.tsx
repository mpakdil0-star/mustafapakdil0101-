import { BellRing, CheckCircle2, FileEdit, PhoneCall } from 'lucide-react';

const steps = [
  { no: '01', title: 'Talebinizi anlatın', text: 'Hizmet alanını, bölgeyi ve ustanın bilmesi gereken ayrıntıları girin.', icon: FileEdit },
  { no: '02', title: 'Bildirim oluşturulsun', text: 'Talep, kategori ve hizmet bölgesi eşleşen uygun ustalar için yayına alınır.', icon: BellRing },
  { no: '03', title: 'Teklifleri değerlendirin', text: 'Fiyat, tahmini süre, profil onayı ve varsa geçmiş puanları birlikte inceleyin.', icon: CheckCircle2 },
  { no: '04', title: 'İletişimi siz başlatın', text: 'Bir teklifi kabul ettiğinizde tarafların iletişim bilgileri erişilebilir olur.', icon: PhoneCall },
];

export default function HowItWorks() {
  return (
    <section id="nasil-calisir" className="scroll-mt-24 bg-slate-950 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div className="lg:sticky lg:top-28"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-300">Nasıl çalışır?</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Kontrol sizde kalan sade bir süreç</h2><p className="mt-4 max-w-md leading-7 text-slate-300">İşBitir talebi ve teklifleri aynı akışta toplar. Usta seçimi, kapsamın netleştirilmesi ve hizmet kararı size aittir.</p></div>
          <ol className="space-y-4">{steps.map((step) => <li key={step.no} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300"><step.icon className="h-5 w-5" /></span><span><strong className="block text-base">{step.title}</strong><span className="mt-1 block text-sm leading-6 text-slate-400">{step.text}</span></span><span className="text-xl font-black text-white/15">{step.no}</span></li>)}</ol>
        </div>
      </div>
    </section>
  );
}

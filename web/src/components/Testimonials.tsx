import { Eye, FileCheck2, LockKeyhole, Scale } from 'lucide-react';

const safeguards = [
  { title: 'Kabul öncesi gizlilik', text: 'Telefon numarası teklif veren ustalara açık gösterilmez.', icon: LockKeyhole },
  { title: 'Şeffaf teklif', text: 'Ustanın yazdığı tutar, mesaj ve tahmini süre birlikte sunulur.', icon: Eye },
  { title: 'Profil durumu', text: 'Ustanın platformdaki onay ve değerlendirme bilgileri görünür.', icon: FileCheck2 },
  { title: 'Karar sizde', text: 'Teklifi kabul etmeden önce iş kapsamını ve ücret ayrıntılarını sorabilirsiniz.', icon: Scale },
];

export default function Testimonials() {
  return (
    <section className="bg-slate-50 py-20 sm:py-24" aria-labelledby="trust-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700">Güvenli kullanım</p><h2 id="trust-title" className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Abartılı vaatler yerine görünür kontroller</h2><p className="mt-4 leading-7 text-slate-600">Gerçek kullanıcı verisiyle doğrulanmamış yorum veya başarı oranı yayınlamıyoruz. Platform içindeki karar noktalarını açık ve anlaşılır tutuyoruz.</p></div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{safeguards.map((item) => <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><item.icon className="h-5 w-5" /></span><h3 className="mt-5 font-bold text-slate-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p></article>)}</div>
      </div>
    </section>
  );
}

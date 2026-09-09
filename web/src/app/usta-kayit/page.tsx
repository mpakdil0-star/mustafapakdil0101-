import Link from 'next/link';
import { ArrowRight, BellRing, CheckCircle2, FileCheck2, MapPinned, ShieldCheck, Smartphone, UserRoundCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/constants/storeLinks';

const androidUrl = GOOGLE_PLAY_URL;
const iosUrl = APP_STORE_URL;

const steps = [
  { title: 'Hesabınızı oluşturun', text: 'Usta mobil uygulamasından temel profil ve iletişim bilgilerinizi girin.', icon: Smartphone },
  { title: 'Uzmanlık ve bölgeyi seçin', text: 'Hizmet kategorinizi, çalıştığınız il ve ilçeleri, müsaitlik durumunuzu belirtin.', icon: MapPinned },
  { title: 'Gerekli belgeleri yükleyin', text: 'Mesleğiniz ve hesap türünüz için istenen belgeler kontrol sürecine alınır.', icon: FileCheck2 },
  { title: 'Uygun talepleri görün', text: 'Profiliniz onaylandığında eşleşen açık talepleri uygulamada değerlendirebilirsiniz.', icon: BellRing },
];

export const metadata = {
  title: 'Ustalar İçin Mobil Uygulama ve Başvuru Süreci',
  description: 'İşBitir usta uygulamasındaki profil, belge, hizmet bölgesi ve teklif sürecini inceleyin.',
};

export default function UstaKayitPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <section className="overflow-hidden bg-[linear-gradient(145deg,#ecfdf5,#ffffff_50%,#f8fafc)] py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div><span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-bold text-teal-800"><UserRoundCheck className="h-3.5 w-3.5" /> Ustalar için İşBitir</span><h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">Hizmet verdiğiniz bölgedeki talepleri tek uygulamada yönetin.</h1><p className="mt-5 max-w-xl text-base leading-7 text-slate-600">İşBitir Usta uygulaması; profil, belge, hizmet bölgesi, müsaitlik ve teklif süreçlerini bir araya getirir. İlan veya gelir garantisi vermez; uygun talepler eşleşme ve müsaitlik koşullarına göre gösterilir.</p><div className="mt-8 flex flex-wrap gap-3">{androidUrl ? <a href={androidUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white">Google Play&apos;den indir <ArrowRight className="h-4 w-4" /></a> : <span className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Android bağlantısı yayın aşamasında</span>}{iosUrl ? <a href={iosUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800">App Store</a> : <span className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600">iOS bağlantısı yakında</span>}</div><p className="mt-4 text-xs leading-5 text-slate-500">Web üzerinden gerçekte kaydedilmeyen bir ön başvuru formu sunmuyoruz. Kayıt işlemi doğrudan mobil uygulamada tamamlanır.</p></div>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/15 sm:p-8"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-bold">Profil kontrolü neden var?</h2><p className="text-xs text-slate-400">Platform güveni ve doğru hizmet eşleşmesi için</p></div></div><ul className="mt-7 space-y-4 text-sm leading-6 text-slate-300">{['Kimlik ve iletişim bilgilerinin hesapla ilişkilendirilmesi', 'Uzmanlık alanına göre istenebilen belge kontrolleri', 'Hizmet bölgesi ve müsaitlik tercihlerinin doğrulanması', 'Kullanıcı geri bildirimleri ve platform kurallarının takibi'].map((item) => <li key={item} className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-teal-300" />{item}</li>)}</ul><p className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-slate-500">Onay rozeti, belirli bir işin kalitesine veya sonucuna ilişkin garanti anlamına gelmez.</p></div>
          </div>
        </section>
        <section className="py-20 sm:py-24"><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700">Başvuru adımları</p><h2 className="mt-3 text-3xl font-black text-slate-950">Kayıt ve değerlendirme süreci</h2></div><ol className="mt-12 grid gap-4 md:grid-cols-2">{steps.map((step, index) => <li key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm"><step.icon className="h-5 w-5" /></span><div><span className="text-xs font-black text-teal-700">0{index + 1}</span><h3 className="mt-1 font-bold text-slate-950">{step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p></div></div></li>)}</ol><div className="mt-10 text-center"><Link href="/kullanim-kosullari" className="text-sm font-bold text-teal-700 underline underline-offset-4">Usta kullanım esaslarını inceleyin</Link></div></div></section>
      </main>
      <Footer />
    </div>
  );
}

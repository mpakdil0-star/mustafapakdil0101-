import Link from 'next/link';
import { ArrowRight, BellRing, CheckCircle2, MapPin, ShieldCheck, Zap } from 'lucide-react';
import { MAIN_CATEGORIES } from '@/constants/categories';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(145deg,#f0fdfa_0%,#ffffff_48%,#f8fafc_100%)] py-14 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute -right-36 -top-36 h-96 w-96 rounded-full bg-teal-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-44 left-1/3 h-96 w-96 rounded-full bg-sky-100/50 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="space-y-7 text-center lg:col-span-7 lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-teal-800 shadow-sm"><BellRing className="h-3.5 w-3.5" aria-hidden="true" /> Bölgenizdeki ustalara talebinizi iletin</div>
          <div className="space-y-5">
            <h1 className="text-balance text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">Usta aramakla vakit kaybetmeyin. <span className="text-teal-600">Talebinizi tek yerde yayınlayın.</span></h1>
            <p className="mx-auto max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg lg:mx-0">Elektrik, tesisat, çilingir ve ev hizmetleri için ihtiyacınızı anlatın. Kategori ve hizmet bölgesi eşleşen uygun ustaların tekliflerini karşılaştırın; iletişim bilgileri yalnızca kabul sonrasında paylaşılsın.</p>
          </div>
          <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/ilan-ver" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-7 py-4 text-base font-bold text-white shadow-xl shadow-teal-600/25 transition hover:-translate-y-0.5 hover:bg-teal-700">Hizmet talebi oluştur <ArrowRight className="h-5 w-5" /></Link>
            <Link href="/#nasil-calisir" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">Süreç nasıl işliyor?</Link>
          </div>
          <div id="guvenlik" className="grid grid-cols-1 gap-3 border-t border-slate-200/70 pt-6 sm:grid-cols-3">
            {[['Profil kontrolü', 'Onay durumu görünür', ShieldCheck], ['Gizli iletişim', 'Kabul öncesi telefon kapalı', CheckCircle2], ['Bölgesel eşleşme', 'İl ve ilçe tercihine göre', MapPin]].map(([title, detail, Icon]) => <div key={String(title)} className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon className="h-4 w-4" /></span><span><strong className="block text-xs text-slate-900">{String(title)}</strong><span className="block text-[11px] leading-4 text-slate-500">{String(detail)}</span></span></div>)}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="relative mx-auto max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200/70 backdrop-blur">
            <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
              <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Yeni talep</p><h2 className="mt-1 text-xl font-black">Neye ihtiyacınız var?</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300"><Zap className="h-5 w-5" /></span></div>
              <form action="/ilan-ver" method="GET" className="mt-6 space-y-4">
                <div><label htmlFor="hero-category" className="mb-1.5 block text-xs font-semibold text-slate-300">Hizmet alanı</label><select id="hero-category" name="kategori" className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-hidden focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20">{MAIN_CATEGORIES.map((category) => <option key={category.id} value={category.id} className="text-slate-900">{category.name}</option>)}</select></div>
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-3.5 text-sm font-bold text-white transition hover:bg-teal-400">Devam et <ArrowRight className="h-4 w-4" /></button>
              </form>
              <p className="mt-4 text-[11px] leading-5 text-slate-400">Talep yayınlamak, ustanın teklif vereceği veya belirli bir sürede ulaşacağı anlamına gelmez.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 px-3 py-4 text-center text-[10px] font-semibold text-slate-500"><span>Talebi anlat</span><span>Teklifleri karşılaştır</span><span>Ustayı seç</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

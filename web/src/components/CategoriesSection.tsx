import Link from 'next/link';
import { ArrowUpDown, ArrowUpRight, Bug, Cctv, Droplets, Flame, Hammer, KeyRound, PackageOpen, Paintbrush, Snowflake, Sofa, Sparkles, Truck, Wrench, Zap } from 'lucide-react';
import { MAIN_CATEGORIES } from '@/constants/categories';

const icons = { Zap, KeyRound, Droplets, Snowflake, Flame, Wrench, Sparkles, Paintbrush, Hammer, Truck, PackageOpen, Sofa, ArrowUpDown, Bug, Cctv } as const;

export default function CategoriesSection() {
  return (
    <section id="kategoriler" className="scroll-mt-24 border-y border-slate-100 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700">Hizmet kategorileri</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">İhtiyacınıza uygun alanı seçin</h2><p className="mt-3 text-base leading-7 text-slate-600">Kategori seçimi, talebin doğru uzmanlık alanındaki ustalara yönlendirilmesine yardımcı olur.</p></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MAIN_CATEGORIES.map((category) => {
            const Icon = icons[category.icon as keyof typeof icons] || Zap;
            return <Link key={category.id} href={`/ilan-ver?kategori=${category.id}`} className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-900/5"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 transition group-hover:bg-teal-600 group-hover:text-white"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><strong className="text-base text-slate-950">{category.name}</strong><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-teal-600" /></span><span className="mt-1 block text-sm leading-6 text-slate-500">{category.description}</span></span></Link>;
          })}
        </div>
      </div>
    </section>
  );
}

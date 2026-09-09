'use client';

import Link from 'next/link';
import { MAIN_CATEGORIES } from '../constants/categories';
import { 
  Zap, 
  KeyRound, 
  Droplets, 
  Snowflake, 
  Flame, 
  Wrench, 
  Sparkles, 
  Paintbrush, 
  Hammer,
  ArrowUpRight 
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-6 h-6 text-amber-500" />,
  KeyRound: <KeyRound className="w-6 h-6 text-teal-600" />,
  Droplets: <Droplets className="w-6 h-6 text-sky-500" />,
  Snowflake: <Snowflake className="w-6 h-6 text-cyan-500" />,
  Flame: <Flame className="w-6 h-6 text-orange-500" />,
  Wrench: <Wrench className="w-6 h-6 text-indigo-500" />,
  Sparkles: <Sparkles className="w-6 h-6 text-emerald-500" />,
  Paintbrush: <Paintbrush className="w-6 h-6 text-pink-500" />,
  Hammer: <Hammer className="w-6 h-6 text-stone-600" />
};

export default function CategoriesSection() {
  return (
    <section id="kategoriler" className="py-20 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Başlık Alanı */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-teal-600 mb-2">
            İhtiyacınıza Özel Hizmetler
          </h2>
          <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Hangi Alanda Ustaya İhtiyacınız Var?
          </p>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            Kategorinizi seçin, konumunuza en yakın bölge ustaları saniyeler içinde teklifini iletsin.
          </p>
        </div>

        {/* Kategori Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {MAIN_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/ilan-ver?kategori=${cat.id}`}
              className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/70 hover:border-teal-300 shadow-2xs hover:shadow-xl hover:shadow-teal-900/5 transition-all hover:-translate-y-1"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-white group-hover:bg-teal-50 flex items-center justify-center shadow-xs border border-slate-200/60 group-hover:border-teal-200 transition-colors">
                    {iconMap[cat.icon] || <Zap className="w-6 h-6 text-teal-600" />}
                  </div>
                  {cat.badge && (
                    <span className="px-2.5 py-1 text-[11px] font-bold tracking-tight rounded-full bg-red-100 text-red-700 border border-red-200">
                      {cat.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                  {cat.name}
                </h3>
                <p className="mt-1.5 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-teal-600">
                <span>Hemen İlan Bırak</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { Zap, ArrowRight } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              İş<span className="text-teal-600">Bitir</span>
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase bg-teal-50 text-teal-700 border border-teal-200/60 rounded-full">
              Hızlı Usta
            </span>
          </div>
        </Link>

        {/* Menü Linkleri */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#kategoriler" className="hover:text-teal-600 transition-colors">Hizmetler</a>
          <a href="#nasil-calisir" className="hover:text-teal-600 transition-colors">Nasıl Çalışır?</a>
          <a href="#uygulama-indir" className="hover:text-teal-600 transition-colors">Mobil Uygulama</a>
          <a href="#guvenlik" className="hover:text-teal-600 transition-colors">Güvenlik</a>
        </nav>

        {/* Aksiyon Butonları */}
        <div className="flex items-center gap-3">
          <Link
            href="/ilan-ver"
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-600 hover:text-teal-600 hover:bg-slate-50 text-sm font-medium transition-colors"
          >
            <span>Hizmet Ara</span>
          </Link>

          <Link
            href="/usta-kayit"
            className="hidden sm:inline-flex items-center text-sm font-medium text-slate-700 hover:text-teal-600 px-3 py-2 transition-colors"
          >
            Usta mısınız?
          </Link>

          <Link
            href="/ilan-ver"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-lg shadow-teal-600/25 transition-all hover:shadow-teal-600/40 hover:-translate-y-0.5"
          >
            <span>Hemen Usta Çağır</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

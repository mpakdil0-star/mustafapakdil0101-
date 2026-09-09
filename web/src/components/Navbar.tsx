'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, Menu, X, Zap } from 'lucide-react';
import { GOOGLE_PLAY_URL } from '@/constants/storeLinks';

const links = [
  { href: '/#kategoriler', label: 'Hizmetler' },
  { href: '/#nasil-calisir', label: 'Nasıl çalışır?' },
  { href: '/#guvenlik', label: 'Güvenli kullanım' },
  { href: '/usta-kayit', label: 'Ustalar için' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="İşBitir ana sayfa">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/20 transition group-hover:bg-teal-700"><Zap className="h-5 w-5 fill-current" aria-hidden="true" /></span>
          <span className="text-xl font-black tracking-tight text-slate-950">İş<span className="text-teal-600">Bitir</span></span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex" aria-label="Ana menü">
          {links.map((link) => <Link key={link.href} href={link.href} className="transition hover:text-teal-700">{link.label}</Link>)}
          <Link href="/#uygulama-indir" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-2 font-bold text-teal-800 transition hover:bg-teal-100"><Download className="h-3.5 w-3.5" /> Uygulamayı indir</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/ilan-ver" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-600/20 transition hover:bg-teal-700 sm:px-5">Talep oluştur <ArrowRight className="hidden h-4 w-4 sm:block" aria-hidden="true" /></Link>
          <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      {open && <nav id="mobile-menu" className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden" aria-label="Mobil menü">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700">{link.label}</Link>)}<a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800"><Download className="h-4 w-4" /> Google Play&apos;den indir</a><p className="px-3 pb-1 pt-3 text-xs text-slate-500">iOS uygulaması yakında.</p></nav>}
    </header>
  );
}

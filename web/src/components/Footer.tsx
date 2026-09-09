'use client';

import Link from 'next/link';
import { Zap, ShieldCheck, Mail, Phone, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Marka & Tanıtım */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold">
                <Zap className="w-5 h-5 fill-white" />
              </div>
              <span className="text-2xl font-black text-white">
                İş<span className="text-teal-400">Bitir</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              İşBitir, acil usta ihtiyacı olan vatandaşlarla bölgedeki nitelikli ve onaylı ustaları en hızlı şekilde buluşturan yeni nesil hizmet platformudur.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>isbitirapp.com © 2026 Tüm Hakları Saklıdır.</span>
            </div>
          </div>

          {/* Hızlı Bağlantılar */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Hızlı Menü</h4>
            <ul className="space-y-2.5">
              <li><Link href="/" className="hover:text-white transition-colors">Ana Sayfa</Link></li>
              <li><Link href="/ilan-ver" className="hover:text-white transition-colors">Hemen İlan Ver</Link></li>
              <li><Link href="/usta-kayit" className="hover:text-white transition-colors">Usta Olarak Katıl</Link></li>
              <li><a href="#nasil-calisir" className="hover:text-white transition-colors">Nasıl Çalışır?</a></li>
              <li><a href="#kategoriler" className="hover:text-white transition-colors">Hizmetlerimiz</a></li>
            </ul>
          </div>

          {/* Popüler Kategoriler */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Hizmetler</h4>
            <ul className="space-y-2.5">
              <li><Link href="/ilan-ver?kategori=elektrik" className="hover:text-white transition-colors">Acil Elektrikçi</Link></li>
              <li><Link href="/ilan-ver?kategori=cilingir" className="hover:text-white transition-colors">Nöbetçi Çilingir</Link></li>
              <li><Link href="/ilan-ver?kategori=tesisat" className="hover:text-white transition-colors">Su & Tesisat Tamiri</Link></li>
              <li><Link href="/ilan-ver?kategori=klima" className="hover:text-white transition-colors">Klima Servisi</Link></li>
              <li><Link href="/ilan-ver?kategori=kombi-servis" className="hover:text-white transition-colors">Kombi Tamiri</Link></li>
            </ul>
          </div>

          {/* Hukuki & Güvenlik */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Yasal & Güvenlik</h4>
            <ul className="space-y-2.5">
              <li><Link href="/gizlilik-politikasi" className="hover:text-white transition-colors">Gizlilik Politikası</Link></li>
              <li><Link href="/kullanim-kosullari" className="hover:text-white transition-colors">Kullanım Koşulları</Link></li>
              <li><Link href="/kvkk" className="hover:text-white transition-colors">KVKK Aydınlatma Metni</Link></li>
              <li><Link href="/mesafe-sorumluluk-reddi" className="hover:text-white transition-colors">Mesafe Sorumluluk Reddi</Link></li>
            </ul>
          </div>

        </div>

        {/* Alt Çizgi ve Telif */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            *Gösterilen varış süreleri ve mesafeler GPS kuş uçuşu yaklaşık tahmindir. Trafik ve yol koşullarına göre değişiklik gösterebilir.
          </p>
          <p className="flex items-center gap-1">
            Türkiye'de sevgiyle geliştirildi <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}

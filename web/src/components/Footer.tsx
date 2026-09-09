import Link from 'next/link';
import { ShieldCheck, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-sm text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2"><Link href="/" className="flex items-center gap-2.5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white"><Zap className="h-5 w-5 fill-current" /></span><span className="text-2xl font-black text-white">İş<span className="text-teal-400">Bitir</span></span></Link><p className="max-w-md text-sm leading-6">Vatandaşların hizmet taleplerini, kategori ve bölge tercihleri eşleşen bağımsız ustalara ileten elektronik platform.</p><p className="flex items-start gap-2 text-xs leading-5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" /> İletişim bilgileri teklif kabul edilene kadar sınırlı tutulur.</p></div>
          <div><h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white">Platform</h2><ul className="space-y-3"><li><Link href="/ilan-ver" className="hover:text-white">Talep oluştur</Link></li><li><Link href="/#nasil-calisir" className="hover:text-white">Nasıl çalışır?</Link></li><li><Link href="/usta-kayit" className="hover:text-white">Ustalar için</Link></li><li><Link href="/#kategoriler" className="hover:text-white">Hizmetler</Link></li></ul></div>
          <div><h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white">Bilgilendirme</h2><ul className="space-y-3"><li><Link href="/kvkk" className="hover:text-white">KVKK Aydınlatma Metni</Link></li><li><Link href="/gizlilik-politikasi" className="hover:text-white">Gizlilik Politikası</Link></li><li><Link href="/kullanim-kosullari" className="hover:text-white">Kullanım Koşulları</Link></li><li><Link href="/mesafe-sorumluluk-reddi" className="hover:text-white">Tahmin ve platform bilgisi</Link></li></ul></div>
          <div><h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-white">Destek</h2><ul className="space-y-3"><li><a href="mailto:destek@isbitirapp.com" className="hover:text-white">destek@isbitirapp.com</a></li><li><a href="mailto:kvkk@isbitirapp.com" className="hover:text-white">kvkk@isbitirapp.com</a></li></ul></div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-slate-800 pt-7 text-xs leading-5 sm:flex-row"><p>© 2026 İşBitir. Tüm hakları saklıdır.</p><p className="max-w-2xl sm:text-right">Süre, mesafe, bildirim teslimi, teklif ve hizmet sonucu garanti edilmez. Usta teklifindeki kapsam ve tutarı işe başlamadan önce doğrulayın.</p></div>
      </div>
    </footer>
  );
}

import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { legalIdentity } from '@/constants/legal';

export default function LegalPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-slate-50"><Navbar /><main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 sm:py-16"><Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700"><ArrowLeft className="h-4 w-4" /> Ana sayfaya dön</Link><header className="mt-7 border-b border-slate-200 pb-7"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700">Yasal bilgilendirme</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">{description}</p><p className="mt-3 text-xs text-slate-500">Son güncelleme: {legalIdentity.updatedAt}</p></header>{!legalIdentity.ready && <div className="mt-7 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="alert"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><span><strong>Yayın öncesi zorunlu kontrol:</strong> Veri sorumlusu ticari unvanı ve tebligat adresi henüz yapılandırılmadı. Bu sürüm hukuki inceleme ve gerçek işletme bilgileri tamamlanmadan canlıya alınmamalıdır.</span></div>}<article className="legal-copy mt-8 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">{children}</article></main><Footer /></div>;
}

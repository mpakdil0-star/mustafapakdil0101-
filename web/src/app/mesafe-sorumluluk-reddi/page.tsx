import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Mesafe ve Hizmet Sorumluluk Reddi | İşBitir',
  description: 'İşBitir platformunun mesafe, varış süreleri ve aracı hizmet sağlayıcı yasal sorumluluk bildirimi.',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-900 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Ana Sayfaya Dön
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Mesafe ve Hizmet Sorumluluk Reddi
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Yasal Bilgilendirme ve Kullanıcı Sözleşmesi Eki</p>
          </div>
        </div>

        <div className="space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 text-amber-950">
            <h3 className="font-bold text-base mb-1">Önemli Hukuki Hatırlatma</h3>
            <p className="text-sm text-amber-900">
              İşBitir, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında bir <strong>&ldquo;Aracı Hizmet Sağlayıcı&rdquo;</strong> konumundadır. Hizmet talep eden kullanıcılar ile bağımsız elektrik ustalarını bir araya getiren bir teknoloji platformudur.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Varış Süreleri ve Tahminler</h2>
            <p>
              Web sitemizde ve uygulamamızda belirtilen süreler (örneğin &ldquo;en hızlı şekilde&rdquo;, &ldquo;yakındaki ustalar&rdquo;) yalnızca anlık mesafe hesaplamasına dayalı birer <strong>tahmindir</strong>. Trafik yoğunluğu, hava muhalefeti, ustanın mevcut iş yoğunluğu ve coğrafi şartlar nedeniyle varış sürelerinde gecikmeler yaşanabilir. İşBitir kesin bir dakika veya süre garantisi taahhüt etmez.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Hizmet Sözleşmesi ve Usta İlişkisi</h2>
            <p>
              İşBitir bünyesindeki ustalar, platformun bordrolu çalışanı olmayıp bağımsız serbest meslek erbabı veya esnaftır. Gerçekleştirilen işçilik, montaj, kullanılan malzeme kalitesi ve faturalandırma tamamen usta ile hizmet alan müşteri arasındaki akde tabidir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Fiyatlandırma ve Ödeme</h2>
            <p>
              İlan üzerinden verilen teklifler ustanın ön değerlendirmesidir. Arızanın yerinde tespiti sonrası kapsam değişikliği olması durumunda taraflar işe başlamadan önce bedel üzerinde mutabık kalmalıdır. İşBitir, taraflar arasında nakit veya banka yoluyla yapılan doğrudan ödemelerin tarafı değildir.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

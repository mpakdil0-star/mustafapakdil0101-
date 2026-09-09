import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Gizlilik ve Güvenlik Politikası | İşBitir',
  description: 'İşBitir platformunun gizlilik, kişisel verilerin korunması ve güvenlik esasları.',
};

export default function PrivacyPolicyPage() {
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
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Gizlilik ve Güvenlik Politikası
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Son güncelleme: Eylül 2026</p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
          <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Genel Bilgilendirme ve KVKK</h2>
            <p>
              İşBitir olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) uyarınca kullanıcılarımızın kişisel verilerinin güvenliğine en üst düzeyde önem veriyoruz. Bu metin, platformumuz (web sitesi ve mobil uygulamalar) üzerinden toplanan verilerin işlenme amaçlarını ve haklarınızı açıklar.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Toplanan Veriler ve Kullanım Amacı</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>İletişim Bilgileri:</strong> Ad, soyad ve telefon numarası; yalnızca arıza ilanı açıldığında teklif veren elektrik ustası ile iletişim kurulabilmesi amacıyla kullanılır.</li>
              <li><strong>Konum Bilgileri:</strong> Arıza bildirdiğiniz esnada seçtiğiniz veya izin verdiğiniz yaklaşık konum, yalnızca çevrenizdeki en yakın ustalara bildirimin yönlendirilmesi için kullanılır.</li>
              <li><strong>Hizmet Değerlendirmeleri:</strong> Hizmet tamamlandıktan sonra yapılan usta puanlamaları ve yorumları, platform kalitesini korumak amacıyla anonimleştirilerek görüntülenebilir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Bilgi Güvenliği ve Paylaşım</h2>
            <p>
              Kişisel bilgileriniz, yasal zorunluluklar hariç olmak üzere üçüncü taraf ticari şirketlerle kesinlikle paylaşılmaz veya satılmaz. İlan sahibinin telefon numarası, yalnızca kullanıcının teklifini kabul ettiği usta ile eşleşme sağlandığında görüntülenir.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Çerezler (Cookies)</h2>
            <p>
              Web sitemizde yalnızca temel oturum işleyişi, dil ve güvenlik doğrulamalarını sağlamak amacıyla zorunlu çerezler kullanılmaktadır. Reklam takibi veya izinsiz veri madenciliği yapılmamaktadır.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. İletişim</h2>
            <p>
              Kişisel verileriniz ve haklarınızla ilgili her türlü talep için <a href="mailto:destek@isbitirapp.com" className="text-teal-600 underline font-medium">destek@isbitirapp.com</a> adresinden destek ekibimizle iletişime geçebilirsiniz.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

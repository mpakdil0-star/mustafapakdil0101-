import React from 'react';
import { Star, CheckCircle, ShieldCheck } from 'lucide-react';

interface Review {
  name: string;
  district: string;
  service: string;
  comment: string;
  rating: number;
  timeAgo: string;
}

const reviews: Review[] = [
  {
    name: 'Ahmet Y.',
    district: 'Kadıköy, İstanbul',
    service: 'Sigorta Arızası & Değişimi',
    comment: 'Akşam saatlerinde ana sigortamız attı ve kaldıramadık. İşBitir üzerinden ilan verdim, 5 dakika içinde iki usta teklif verdi. Gelen usta çok kibar ve işinin ehliydi, sorunu hemen çözdü.',
    rating: 5,
    timeAgo: 'Dün',
  },
  {
    name: 'Selin B.',
    district: 'Çankaya, Ankara',
    service: 'Avize & Aydınlatma Montajı',
    comment: 'Yeni taşındığım evin 4 adet avizesi için usta arıyordum. Hem makul fiyat teklifi aldım hem de usta tam kararlaştırdığımız saatte geldi. Tertemiz montaj yaptı, kesinlikle tavsiye ederim.',
    rating: 5,
    timeAgo: '3 gün önce',
  },
  {
    name: 'Murat K.',
    district: 'Muratpaşa, Antalya',
    service: 'Kısa Devre Tespiti',
    comment: 'Mutfak prizlerinde sürekli atan bir kısa devre vardı. Sistem üzerinden konumuma en yakın usta bildirim alıp ulaştı. Fiyatı baştan net konuştuk, ekstra bir sürpriz yaşamadım.',
    rating: 5,
    timeAgo: '1 hafta önce',
  },
];

export default function Testimonials() {
  return (
    <section className="py-16 sm:py-20 bg-slate-50 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-3 border border-emerald-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            Gerçek Müşteri Deneyimleri
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Binlerce Memnun Ev Sahibi ve İşletme
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            İşBitir ile elektrik arızalarını zahmetsizce ve güvenle çözen komşularınızın yorumlarına göz atın.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {reviews.map((rev, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{rev.timeAgo}</span>
                </div>

                <p className="text-slate-700 text-sm sm:text-base leading-relaxed mb-6 italic">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900 text-sm">{rev.name}</span>
                    <CheckCircle className="w-4 h-4 text-teal-600" />
                  </div>
                  <p className="text-xs text-slate-500">{rev.district}</p>
                </div>
                <span className="text-[11px] font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                  {rev.service}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Güven Sayaçları */}
        <div className="mt-12 pt-8 border-t border-slate-200/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-600">4.9 / 5</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">Ortalama Usta Puanı</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-600">%100</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">Onaylı Usta Profilleri</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-600">Ücretsiz</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">Teklif Alma & İlan Verme</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-600">Hızlı</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">Anında Bildirim ve İletişim</div>
          </div>
        </div>
      </div>
    </section>
  );
}

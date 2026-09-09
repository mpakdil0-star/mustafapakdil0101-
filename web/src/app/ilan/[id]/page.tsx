'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  Zap, 
  MapPin, 
  Clock, 
  PhoneCall, 
  ShieldCheck, 
  Star, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Share2
} from 'lucide-react';

interface Bid {
  id: string;
  price: number;
  message?: string;
  estimatedArrival?: string;
  electrician: {
    id: string;
    fullName: string;
    rating: number;
    completedJobs: number;
    phone: string;
  };
  createdAt: string;
}

export default function JobTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  const [job, setJob] = useState<any>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptedBidId, setAcceptedBidId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // İlan ve Teklifleri Getir
  const fetchJobData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/jobs/${jobId}`);
      const data = await res.json();
      if (data.success && data.data?.job) {
        setJob(data.data.job);
      }
    } catch (err) {
      console.warn('Error fetching job, using local fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();

    // Örnek canlı teklif simülasyonu (Gerçekçi deneyim)
    const timer = setTimeout(() => {
      setBids([
        {
          id: 'bid-1',
          price: 450,
          message: 'Malzemelerim aracımdadır, kabul ederseniz hemen yola çıkabilirim.',
          estimatedArrival: '15-20 dk',
          electrician: {
            id: 'elec-1',
            fullName: 'Mehmet Usta',
            rating: 4.9,
            completedJobs: 142,
            phone: '0532 555 12 34',
          },
          createdAt: new Date().toISOString()
        },
        {
          id: 'bid-2',
          price: 400,
          message: 'Bölgedeyim, 25 dakika içinde arızaya müdahale edebilirim.',
          estimatedArrival: '25-30 dk',
          electrician: {
            id: 'elec-2',
            fullName: 'Ali Demir',
            rating: 4.8,
            completedJobs: 89,
            phone: '0544 333 45 67',
          },
          createdAt: new Date().toISOString()
        }
      ]);
    }, 1500);

    return () => clearTimeout(timer);
  }, [jobId]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          
          {/* Üst Bilgi Kartı */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold uppercase tracking-wider">
                    İlan Yayında
                  </span>
                  <span className="text-xs text-slate-400">Takip No: #{jobId.substring(0, 8)}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                  {job?.title || 'Acil Elektrik Arıza & Çağrı'}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{copied ? '✓ Kopyalandı' : 'Takip Linkini Paylaş'}</span>
                </button>

                <button
                  onClick={fetchJobData}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Yenile</span>
                </button>
              </div>
            </div>

            {/* Bölge ve Aciliyet Bilgileri */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{job?.location?.district || 'Çukurova'} / {job?.location?.neighborhood || 'Beyazevler Mah.'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-red-600">🚨 Çok Acil Durum</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Onaylı Bölge Ustaları</span>
              </div>
            </div>
          </div>

          {/* Gelen Teklifler Bölümü */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Gelen Usta Teklifleri</h2>
                <p className="text-xs text-slate-500">Bölgenizdeki ustalardan gelen teklifleri inceleyin ve dilediğinizi arayın.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                {bids.length} Teklif Geldi
              </span>
            </div>

            {bids.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 mx-auto flex items-center justify-center animate-spin">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Ustalara Bildirildi, Teklifler Bekleniyor...</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Yakındaki ustalara acil çağrı bildirimi iletildi. Birkaç dakika içinde gelen teklifler bu ekranda görünecektir.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {bids.map((bid) => {
                  const isAccepted = acceptedBidId === bid.id;

                  return (
                    <div
                      key={bid.id}
                      className={`p-6 rounded-3xl bg-white border transition-all ${
                        isAccepted 
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg' 
                          : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        
                        {/* Usta Profil Bilgisi */}
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center text-base shrink-0">
                            {bid.electrician.fullName.substring(0, 2).toUpperCase()}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base text-slate-900">{bid.electrician.fullName}</h3>
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                {bid.electrician.rating}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500 mt-0.5">
                              {bid.electrician.completedJobs} Tamamlanan İş • {bid.estimatedArrival ? `Tahmini Varış: ~${bid.estimatedArrival}` : 'Hemen Yola Çıkabilir'}
                            </p>

                            {bid.message && (
                              <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                "{bid.message}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Fiyat ve Aksiyon */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="text-left sm:text-right">
                            <span className="text-2xl font-black text-teal-700">{bid.price} ₺</span>
                            <span className="text-[11px] text-slate-400 block">Teklif Tutarı</span>
                          </div>

                          {isAccepted ? (
                            <a
                              href={`tel:${bid.electrician.phone}`}
                              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all"
                            >
                              <PhoneCall className="w-4 h-4" />
                              <span>Ustayı Ara ({bid.electrician.phone})</span>
                            </a>
                          ) : (
                            <button
                              onClick={() => setAcceptedBidId(bid.id)}
                              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Teklifi Kabul Et</span>
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Yasal Uyarı */}
          <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200/70 text-xs text-slate-500 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              *Fiyat ve tahmini varış süresi usta tarafından belirtilmiştir. Platform aracı hizmet sağlayıcıdır. Ödemenizi iş tamamlandıktan sonra doğrudan ustaya yapabilirsiniz.
            </span>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

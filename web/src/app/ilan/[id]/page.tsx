'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock, MapPin, PhoneCall, RefreshCw, ShieldCheck, Star, XCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { webJobService, type WebBid, type WebJob } from '@/services/webJobService';

const statusLabels: Record<string, string> = {
  OPEN: 'Tekliflere açık',
  BIDDING: 'Tekliflere açık',
  IN_PROGRESS: 'Teklif kabul edildi',
  PENDING_CONFIRMATION: 'Tamamlanma onayı bekleniyor',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal edildi',
  EXPIRED: 'Süresi doldu',
};

const urgencyLabels: Record<string, string> = {
  HIGH: 'Öncelikli',
  MEDIUM: 'Esnek',
  LOW: 'Planlı',
};

const formatMoney = (amount: number) => new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency: 'TRY', maximumFractionDigits: 2,
}).format(amount);

export default function JobTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const [job, setJob] = useState<WebJob | null>(null);
  const [bids, setBids] = useState<WebBid[]>([]);
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmBid, setConfirmBid] = useState<WebBid | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimPhone, setClaimPhone] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      try {
        const savedPhone = localStorage.getItem('isbitir_owner_phone');
        if (savedPhone) {
          void webJobService.claimByPhone(jobId, savedPhone).catch(() => {});
        }
      } catch {
        // ignore
      }

      const [nextJob, nextBids] = await Promise.all([
        webJobService.getJob(jobId),
        webJobService.getBids(jobId),
      ]);
      setJob(nextJob);
      setBids(nextBids);
      setError('');
      try {
        localStorage.setItem(
          'isbitir_active_job',
          JSON.stringify({
            id: nextJob.id,
            title: nextJob.title,
            category: nextJob.category,
            createdAt: nextJob.createdAt,
          })
        );
      } catch {
        // ignore
      }
      if (nextJob.acceptedBidId) {
        try {
          const contact = await webJobService.getParticipantContact(jobId);
          setPhone(contact.phone || null);
        } catch {
          setPhone(null);
        }
      } else {
        setPhone(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'İlan bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void loadData(true); }, 0);
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = webJobService.subscribeToBids(jobId, () => { void loadData(true); });
    } catch {
      // Manual refresh remains available when realtime cannot initialize.
    }
    return () => { window.clearTimeout(initialLoad); unsubscribe?.(); };
  }, [jobId, loadData]);

  const acceptBid = async () => {
    if (!confirmBid) return;
    setActionId(confirmBid.id);
    setError('');
    try {
      try {
        const savedPhone = localStorage.getItem('isbitir_owner_phone');
        if (savedPhone) {
          await webJobService.claimByPhone(jobId, savedPhone);
        }
      } catch {
        // proceed to acceptBid
      }
      await webJobService.acceptBid(confirmBid.id);
      setConfirmBid(null);
      await loadData(true);
    } catch (actionError) {
      const msg = actionError instanceof Error ? actionError.message : 'Teklif kabul edilemedi.';
      if (msg.includes('yetkiniz bulunmuyor') || msg.includes('JOB_OWNER_REQUIRED')) {
        setShowClaimModal(true);
      } else {
        setError(msg);
      }
    } finally {
      setActionId(null);
    }
  };

  const handleClaimAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimPhone.trim()) return;
    setClaimLoading(true);
    setClaimError('');
    try {
      await webJobService.claimByPhone(jobId, claimPhone.trim());
      try {
        localStorage.setItem('isbitir_owner_phone', claimPhone.trim());
      } catch {
        // ignore
      }
      setShowClaimModal(false);
      if (confirmBid) {
        await webJobService.acceptBid(confirmBid.id);
        setConfirmBid(null);
      }
      await loadData(true);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Doğrulama yapılamadı. Telefon numaranızı kontrol edin.');
    } finally {
      setClaimLoading(false);
    }
  };

  const cancelJob = async () => {
    setActionId('cancel');
    setError('');
    try {
      try {
        const savedPhone = localStorage.getItem('isbitir_owner_phone');
        if (savedPhone) {
          await webJobService.claimByPhone(jobId, savedPhone);
        }
      } catch {
        // proceed
      }
      await webJobService.cancelJob(jobId, 'Vatandaş web takip ekranından iptal etti.');
      setShowCancel(false);
      await loadData(true);
    } catch (actionError) {
      const msg = actionError instanceof Error ? actionError.message : 'Talep iptal edilemedi.';
      if (msg.includes('yetkiniz bulunmuyor') || msg.includes('JOB_OWNER_REQUIRED')) {
        setShowClaimModal(true);
      } else {
        setError(msg);
      }
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen flex-col bg-slate-50"><Navbar /><main className="flex flex-1 items-center justify-center px-4"><div className="text-center" role="status"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-teal-600" /><p className="mt-3 text-sm text-slate-600">Talep bilgileri yükleniyor…</p></div></main><Footer /></div>;
  }

  if (!job) {
    return <div className="flex min-h-screen flex-col bg-slate-50"><Navbar /><main className="flex flex-1 items-center justify-center px-4"><section className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg"><AlertCircle className="mx-auto h-10 w-10 text-rose-500" /><h1 className="mt-4 text-xl font-bold text-slate-950">Talebe erişilemedi</h1><p className="mt-2 text-sm leading-relaxed text-slate-600">{error || 'Bu takip bağlantısı geçersiz olabilir veya farklı bir tarayıcı oturumunda oluşturulmuş olabilir.'}</p><Link href="/ilan-ver" className="mt-6 inline-flex rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white">Yeni talep oluştur</Link></section></main><Footer /></div>;
  }

  const canAccept = ['OPEN', 'BIDDING'].includes(job.status);
  const canCancel = !['COMPLETED', 'CANCELLED'].includes(job.status);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 py-10 sm:py-16">
        <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-md sm:p-8">
            <div className="flex flex-col justify-between gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-start">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-900">{statusLabels[job.status] || job.status}</span><span className="text-xs text-slate-400">Takip no: #{jobId.slice(0, 8)}</span></div>
                <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">{job.title}</h1>
                {job.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">{job.description}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                {canCancel && <button type="button" onClick={() => setShowCancel(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"><XCircle className="h-3.5 w-3.5" aria-hidden="true" /> İptal et</button>}
                <button type="button" onClick={() => void loadData()} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" /> Yenile</button>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-4 pt-6 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" /><div><dt className="text-xs text-slate-400">Bölge</dt><dd className="font-semibold text-slate-800">{job.location.district} / {job.location.neighborhood || job.location.city}</dd></div></div>
              <div className="flex items-center gap-2 text-slate-600"><Clock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" /><div><dt className="text-xs text-slate-400">Zamanlama</dt><dd className="font-semibold text-slate-800">{urgencyLabels[job.urgencyLevel] || job.urgencyLevel}</dd></div></div>
              <div className="flex items-center gap-2 text-slate-600"><ShieldCheck className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" /><div><dt className="text-xs text-slate-400">Bildirim kapsamı</dt><dd className="font-semibold text-slate-800">Eşleşen onaylı ustalar</dd></div></div>
            </dl>
          </section>

          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</div>}

          <section className="space-y-4" aria-live="polite">
            <div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950">Usta teklifleri</h2><p className="mt-1 text-xs text-slate-500">Tutarı, tahmini süreyi ve usta bilgilerini karşılaştırın.</p></div><span className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">{bids.length} teklif</span></div>
            {bids.length === 0 ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-10 text-center sm:p-12"><Clock className="mx-auto h-10 w-10 text-teal-600" aria-hidden="true" /><h3 className="mt-4 font-bold text-slate-900">Henüz teklif gelmedi</h3><p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">Talep, kategori ve hizmet bölgesi eşleşen uygun ustalar için yayında. Usta müsaitliği ve teklif süresi değişebilir.</p></div>
            ) : (
              <div className="space-y-4">
                {bids.map((bid) => {
                  const accepted = job.acceptedBidId === bid.id;
                  const rejected = bid.status === 'REJECTED';
                  return (
                    <article key={bid.id} className={`rounded-3xl border bg-white p-6 transition ${accepted ? 'border-emerald-500 ring-2 ring-emerald-500/20' : rejected ? 'border-slate-200 opacity-60' : 'border-slate-200/80 shadow-sm'}`}>
                      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">{bid.electrician.fullName.slice(0, 2).toLocaleUpperCase('tr-TR')}</div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-950">{bid.electrician.fullName}</h3>{bid.electrician.verificationStatus === 'APPROVED' && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><ShieldCheck className="h-3 w-3" /> Onaylı profil</span>}{bid.electrician.ratingAverage > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700"><Star className="h-3 w-3 fill-amber-500" />{bid.electrician.ratingAverage.toFixed(1)}</span>}</div>
                            <p className="mt-1 text-xs text-slate-500">{bid.electrician.completedJobsCount > 0 ? `${bid.electrician.completedJobsCount} tamamlanan iş` : 'Henüz tamamlanan iş bilgisi yok'}{bid.estimatedDuration > 0 ? ` · Ustanın belirttiği tahmini süre: ${bid.estimatedDuration} dk` : ''}</p>
                            {bid.message && <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">{bid.message}</p>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                          <div className="sm:text-right"><span className="block text-2xl font-black text-teal-700">{formatMoney(bid.amount)}</span><span className="text-[11px] text-slate-400">Ustanın teklif tutarı</span></div>
                          {accepted ? (phone ? <a href={`tel:${phone}`} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"><PhoneCall className="h-4 w-4" /> Ustayı ara</a> : <span className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">Teklif kabul edildi</span>) : canAccept && bid.status === 'PENDING' ? <button type="button" onClick={() => setConfirmBid(bid)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Teklifi incele</button> : <span className="text-xs font-semibold text-slate-500">{rejected ? 'Teklif kapandı' : bid.status}</span>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200/70 bg-slate-100/70 p-4 text-xs leading-relaxed text-slate-600"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /><span>Teklif tutarı ve süre bilgisi usta tarafından sağlanır; bağlayıcı hizmet kapsamı değildir. İşin kapsamını, ek malzeme ve ücretleri hizmet başlamadan önce ustayla yazılı veya sözlü olarak netleştirin. İşBitir, vatandaş ile bağımsız hizmet sağlayıcıyı buluşturan elektronik platformdur.</span></div>
        </div>
      </main>
      <Footer />

      {confirmBid && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !actionId) setConfirmBid(null); }}><section role="dialog" aria-modal="true" aria-labelledby="accept-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 id="accept-title" className="text-xl font-black text-slate-950">Teklifi kabul etmek istiyor musunuz?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600"><strong>{confirmBid.electrician.fullName}</strong> tarafından verilen <strong>{formatMoney(confirmBid.amount)}</strong> tutarındaki teklifi kabul ettiğinizde diğer bekleyen teklifler kapanır ve tarafların iletişim bilgileri paylaşılır.</p><div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">İş kapsamı, malzeme ve nihai ücret konusunda usta ile ayrıca mutabık kalın.</div><div className="mt-6 flex gap-3"><button type="button" disabled={Boolean(actionId)} onClick={() => setConfirmBid(null)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700">Vazgeç</button><button type="button" disabled={Boolean(actionId)} onClick={() => void acceptBid()} className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white disabled:opacity-60">{actionId ? 'Kabul ediliyor…' : 'Kabul et'}</button></div></section></div>}
      {showCancel && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !actionId) setShowCancel(false); }}><section role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 id="cancel-title" className="text-xl font-black text-slate-950">Talebi iptal etmek istiyor musunuz?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Bu işlem talebi tekliflere kapatır. Daha sonra yeni bir talep oluşturabilirsiniz.</p><div className="mt-6 flex gap-3"><button type="button" disabled={Boolean(actionId)} onClick={() => setShowCancel(false)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700">Vazgeç</button><button type="button" disabled={Boolean(actionId)} onClick={() => void cancelJob()} className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white disabled:opacity-60">{actionId ? 'İptal ediliyor…' : 'Talebi iptal et'}</button></div></section></div>}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 animate-in fade-in duration-200" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="claim-modal-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 id="claim-modal-title" className="text-lg font-black text-slate-950">İlan Sahibi Doğrulaması</h2>
                <p className="text-xs text-slate-500">Talebi yönetmek için telefon numaranızı girin</p>
              </div>
            </div>

            <p className="mt-3.5 text-xs leading-relaxed text-slate-600">
              Bu ilanı farklı bir cihaz veya tarayıcıdan açtınız. Teklifi kabul edebilmek için ilanı verirken belirttiğiniz cep telefonu numarasını doğrulayın.
            </p>

            <form onSubmit={handleClaimAndAccept} className="mt-4 space-y-4">
              <div>
                <label htmlFor="claim-phone-input" className="mb-1 block text-xs font-bold text-slate-700">
                  Telefon Numaranız
                </label>
                <input
                  id="claim-phone-input"
                  type="tel"
                  required
                  autoFocus
                  inputMode="tel"
                  placeholder="05XX XXX XX XX"
                  value={claimPhone}
                  onChange={(e) => setClaimPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium outline-hidden focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {claimError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800" role="alert">
                  {claimError}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={claimLoading}
                  onClick={() => { setShowClaimModal(false); setClaimError(''); }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={claimLoading || !claimPhone.trim()}
                  className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/25 hover:bg-teal-700 disabled:opacity-50"
                >
                  {claimLoading ? 'Doğrulanıyor…' : 'Doğrula ve Kabul Et'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

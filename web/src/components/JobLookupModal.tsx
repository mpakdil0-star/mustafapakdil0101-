'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Phone, ArrowRight, Clock, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { webJobService } from '@/services/webJobService';

interface JobLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FoundJob {
  job_id: string;
  title: string;
  category: string;
  service_category: string;
  status: string;
  city: string;
  district: string;
  bid_count: number;
  created_at: string;
}

const statusMap: Record<string, { label: string; class: string }> = {
  OPEN: { label: 'Tekliflere Açık', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  BIDDING: { label: 'Teklif Alıyor', class: 'bg-teal-50 text-teal-700 border-teal-200' },
  IN_PROGRESS: { label: 'Teklif Kabul Edildi', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'Tamamlandı', class: 'bg-slate-100 text-slate-700 border-slate-200' },
  CANCELLED: { label: 'İptal Edildi', class: 'bg-rose-50 text-rose-700 border-rose-200' },
  EXPIRED: { label: 'Süresi Doldu', class: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function JobLookupModal({ isOpen, onClose }: JobLookupModalProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<FoundJob[]>([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setError('');
    setSearched(false);

    try {
      const jobs = await webJobService.lookupByPhone(phone);
      setResults(jobs);
      setSearched(true);
      if (jobs.length > 0) {
        try {
          localStorage.setItem('isbitir_owner_phone', phone.trim());
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sorgulama yapılamadı. Telefon numaranızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Search className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-950">Talebimi Sorgula & Takip Et</h2>
              <p className="text-xs text-slate-500">İlan verirken kullandığınız cep telefonuyla bulun</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <form onSubmit={handleSearch} className="space-y-3">
            <label htmlFor="lookup-phone" className="block text-xs font-semibold text-slate-700">
              Telefon Numaranız
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  id="lookup-phone"
                  type="tel"
                  required
                  autoFocus
                  inputMode="tel"
                  placeholder="05XX XXX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm font-medium rounded-xl border border-slate-200 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 outline-hidden"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold shadow-md shadow-teal-600/20 hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {loading ? 'Aranıyor…' : 'Sorgula'}
              </button>
            </div>
            {error && (
              <p className="text-xs text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}
          </form>

          {/* Results list */}
          {searched && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Bulunan Talepler ({results.length})
              </div>

              {results.length === 0 ? (
                <div className="text-center py-6 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Kayıtlı Talep Bulunamadı</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Girdiğiniz telefon numarasıyla açılmış bir ilan bulunmuyor veya saklama süresi dolmuş olabilir.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {results.map((job) => {
                    const st = statusMap[job.status] || { label: job.status, class: 'bg-slate-100 text-slate-700' };
                    return (
                      <Link
                        key={job.job_id}
                        href={`/ilan/${job.job_id}`}
                        onClick={onClose}
                        className="block p-4 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-md bg-white transition group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border mb-1.5 ${st.class}`}>
                              {st.label}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition">
                              {job.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {job.district} / {job.city} · {job.category}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg">
                              {job.bid_count} Teklif
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-1">
                              {new Date(job.created_at).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700">
                          <span>Teklifleri ve Usta Detaylarını İncele</span>
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

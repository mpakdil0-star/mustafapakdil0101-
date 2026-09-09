'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight, X } from 'lucide-react';

interface ActiveJobInfo {
  id: string;
  title: string;
  category: string;
  createdAt: string;
}

export default function ActiveJobBanner() {
  const [activeJob, setActiveJob] = useState<ActiveJobInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('isbitir_active_job');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id && parsed?.title) {
          setActiveJob(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  if (!activeJob || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-md relative z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/20">
            <Clock className="h-4 w-4 animate-pulse" />
          </span>
          <span className="truncate">
            <strong className="font-bold mr-1">Aktif Talebiniz Var:</strong>
            <span className="opacity-90 font-medium truncate">&ldquo;{activeJob.title}&rdquo;</span>
            <span className="hidden md:inline ml-2 text-xs opacity-75">· Teklifler toplanıyor</span>
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/ilan/${activeJob.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-teal-900 shadow-xs hover:bg-teal-50 transition"
          >
            Teklifleri Gör <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-white/80 hover:text-white hover:bg-white/10 transition"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

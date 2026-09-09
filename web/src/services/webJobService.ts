'use client';

import { ensureWebSession, getSupabaseBrowserClient } from '@/lib/supabase';

export const WEB_TERMS_VERSION = '2026-09-09';
export const WEB_PRIVACY_NOTICE_VERSION = '2026-09-09';

export interface WebJobLocation {
  city: string;
  district: string;
  neighborhood?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateWebJobInput {
  title: string;
  description: string;
  customerName: string;
  customerPhone: string;
  category: string;
  serviceCategory: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  location: WebJobLocation;
}

export interface WebJob {
  id: string;
  title: string;
  description: string;
  category: string;
  serviceCategory: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
  location: WebJobLocation;
  acceptedBidId?: string | null;
  assignedElectricianId?: string | null;
  bidCount: number;
  createdAt: string;
}

export interface WebBid {
  id: string;
  jobPostId: string;
  electricianId: string;
  amount: number;
  message: string;
  status: string;
  estimatedDuration: number;
  estimatedStartDate?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  electrician: {
    id: string;
    fullName: string;
    profileImageUrl?: string | null;
    verificationStatus?: string | null;
    ratingAverage: number;
    completedJobsCount: number;
  };
}

interface JobRow {
  id: string;
  title: string;
  description: string;
  category: string;
  service_category?: string | null;
  urgency_level: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
  location?: WebJobLocation | null;
  accepted_bid_id?: string | null;
  assigned_electrician_id?: string | null;
  bid_count?: number | string | null;
  created_at: string;
}

interface BidRow {
  id: string;
  job_post_id: string;
  electrician_id: string;
  amount: number | string;
  message?: string | null;
  status: string;
  estimated_duration?: number | string | null;
  estimated_start_date?: string | null;
  expires_at?: string | null;
  created_at: string;
}

interface ElectricianRow {
  id: string;
  full_name?: string | null;
  profile_image_url?: string | null;
  verification_status?: string | null;
  rating_average?: number | string | null;
  completed_jobs_count?: number | string | null;
}

const mapJob = (row: JobRow): WebJob => ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category,
  serviceCategory: row.service_category || 'elektrik',
  urgencyLevel: row.urgency_level,
  status: row.status,
  location: row.location || { city: '', district: '' },
  acceptedBidId: row.accepted_bid_id,
  assignedElectricianId: row.assigned_electrician_id,
  bidCount: Number(row.bid_count || 0),
  createdAt: row.created_at,
});

const friendlyError = (error: unknown): Error => {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : String(error || 'UNKNOWN_ERROR');
  const messages: Record<string, string> = {
    WEB_CONFIGURATION_MISSING: 'İlan sistemi henüz yapılandırılmamış. Lütfen daha sonra tekrar deneyin.',
    ANONYMOUS_SESSION_FAILED: 'Güvenli web oturumu oluşturulamadı. Lütfen sayfayı yenileyin.',
    INVALID_TITLE: 'Talep başlığı 3–160 karakter arasında olmalıdır.',
    INVALID_DESCRIPTION: 'Talep açıklaması en fazla 2.000 karakter olabilir.',
    INVALID_NAME: 'Lütfen adınızı ve soyadınızı kontrol edin.',
    INVALID_PHONE: 'Lütfen geçerli bir Türkiye cep telefonu numarası girin.',
    INVALID_SERVICE_CATEGORY: 'Seçilen hizmet kategorisi geçerli değil.',
    INVALID_URGENCY: 'Seçilen zaman tercihi geçerli değil.',
    INVALID_LOCATION: 'Şehir ve ilçe bilgilerini kontrol edin.',
    INVALID_COORDINATES: 'Konum bilgisi doğrulanamadı. İl ve ilçe seçerek devam edebilirsiniz.',
    LEGAL_NOTICE_REQUIRED: 'Gerekli bilgilendirme tamamlanamadı.',
    TOO_MANY_REQUESTS: 'Kısa süre içinde çok sayıda talep oluşturdunuz. Lütfen biraz sonra tekrar deneyin.',
    JOB_OWNER_REQUIRED: 'Bu ilana erişim yetkiniz bulunmuyor.',
    BID_NOT_PENDING: 'Bu teklif artık kabul edilebilir durumda değil.',
    JOB_NOT_OPEN: 'Bu ilan artık teklif kabul etmiyor.',
  };
  const code = Object.keys(messages).find((key) => message.includes(key));
  return new Error(code ? messages[code] : 'İşlem şu anda tamamlanamadı. Lütfen tekrar deneyin.');
};

const loadElectricians = async (ids: string[]) => {
  if (!ids.length) return new Map<string, ElectricianRow>();
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.from('public_electricians').select('*').in('id', ids);
  if (error) throw error;
  return new Map(((data || []) as ElectricianRow[]).map((row) => [row.id, row]));
};

const enrichBids = async (rows: BidRow[]): Promise<WebBid[]> => {
  const electricianMap = await loadElectricians([
    ...new Set(rows.map((row) => row.electrician_id).filter(Boolean)),
  ]);
  return rows.map((row) => {
    const electrician: ElectricianRow = electricianMap.get(row.electrician_id) || { id: row.electrician_id };
    return {
      id: row.id,
      jobPostId: row.job_post_id,
      electricianId: row.electrician_id,
      amount: Number(row.amount),
      message: row.message || '',
      status: row.status,
      estimatedDuration: Number(row.estimated_duration || 0),
      estimatedStartDate: row.estimated_start_date,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      electrician: {
        id: row.electrician_id,
        fullName: electrician.full_name || 'Usta',
        profileImageUrl: electrician.profile_image_url,
        verificationStatus: electrician.verification_status,
        ratingAverage: Number(electrician.rating_average || 0),
        completedJobsCount: Number(electrician.completed_jobs_count || 0),
      },
    };
  });
};

export const webJobService = {
  async create(input: CreateWebJobInput) {
    await ensureWebSession();
    const client = getSupabaseBrowserClient();
    const { data, error } = await client.rpc('create_web_job', {
      p_title: input.title,
      p_description: input.description,
      p_customer_name: input.customerName,
      p_customer_phone: input.customerPhone,
      p_category: input.category,
      p_service_category: input.serviceCategory,
      p_urgency_level: input.urgencyLevel,
      p_location: input.location,
      p_terms_version: WEB_TERMS_VERSION,
      p_privacy_notice_version: WEB_PRIVACY_NOTICE_VERSION,
    });
    if (error) throw friendlyError(error);
    return mapJob(data);
  },

  async getJob(id: string) {
    await ensureWebSession();
    const client = getSupabaseBrowserClient();
    const { data, error } = await client.from('job_posts').select('*').eq('id', id).single();
    if (error) throw friendlyError(error);
    return mapJob(data);
  },

  async getBids(jobId: string) {
    await ensureWebSession();
    const client = getSupabaseBrowserClient();
    const { data, error } = await client.rpc('get_web_job_bids', { p_job_id: jobId });
    if (error) throw friendlyError(error);
    return enrichBids(data || []);
  },

  async acceptBid(bidId: string) {
    await ensureWebSession();
    const client = getSupabaseBrowserClient();
    const { data, error } = await client.rpc('accept_bid', { bid_id: bidId });
    if (error) throw friendlyError(error);
    return data;
  },

  async cancelJob(jobId: string, reason: string) {
    await ensureWebSession();
    const client = getSupabaseBrowserClient();
    const { data, error } = await client.rpc('cancel_job', { job_id: jobId, reason });
    if (error) throw friendlyError(error);
    return data;
  },

  async getParticipantContact(jobId: string) {
    await ensureWebSession();
    const client = getSupabaseBrowserClient();
    const { data, error } = await client.rpc('get_job_participant_contact', { p_job_id: jobId });
    if (error) throw friendlyError(error);
    return data as { userId: string; fullName: string; phone?: string | null };
  },

  async lookupByPhone(phone: string) {
    await ensureWebSession();
    const client = getSupabaseBrowserClient();
    const { data, error } = await client.rpc('lookup_web_jobs_by_phone', { p_phone: phone });
    if (error) throw friendlyError(error);
    return (data || []) as Array<{
      job_id: string;
      title: string;
      category: string;
      service_category: string;
      status: string;
      city: string;
      district: string;
      bid_count: number;
      created_at: string;
    }>;
  },

  subscribeToBids(jobId: string, onChange: () => void) {
    const client = getSupabaseBrowserClient();
    const channel = client.channel(`web-job-bids:${jobId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bids', filter: `job_post_id=eq.${jobId}`,
      }, onChange)
      .subscribe();
    return () => { void client.removeChannel(channel); };
  },
};

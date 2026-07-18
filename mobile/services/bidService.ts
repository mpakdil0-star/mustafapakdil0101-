import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { assertSupabaseConfigured, supabase } from './supabase';

export interface CreateBidData {
  jobPostId: string;
  amount: number;
  validityDays: number;
  estimatedStartDate?: string;
  message: string;
  costItems?: any[];
}

export interface Bid {
  id: string;
  jobPostId: string;
  electricianId: string;
  amount: number | string;
  estimatedDuration: number;
  expiresAt?: string | null;
  estimatedStartDate?: string | null;
  message: string;
  costItems?: any;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  electrician?: any;
  jobPost?: any;
}

const mapBid = (row: any): Bid => ({
  id: row.id,
  jobPostId: row.job_post_id,
  electricianId: row.electrician_id,
  amount: Number(row.amount),
  estimatedDuration: row.estimated_duration,
  expiresAt: row.expires_at,
  estimatedStartDate: row.estimated_start_date,
  message: row.message,
  costItems: row.cost_items,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  electrician: row.electrician,
  jobPost: row.job_post,
});

const publicElectrician = (row: any) => row ? ({
  id: row.id,
  fullName: row.full_name,
  profileImageUrl: row.profile_image_url,
  electricianProfile: {
    verificationStatus: row.verification_status,
    licenseVerified: row.license_verified,
    licenseNumber: row.license_number,
    isAuthorizedEngineer: row.is_authorized_engineer,
    ratingAverage: Number(row.rating_average || 0),
  },
}) : undefined;

const publicJob = (row: any) => row ? ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category,
  urgencyLevel: row.urgency_level,
  status: row.status,
  location: row.location,
  createdAt: row.created_at,
  citizen: row.citizen_name ? {
    id: row.citizen_id || '',
    fullName: row.citizen_name,
    profileImageUrl: row.citizen_profile_image_url,
  } : undefined,
}) : undefined;

const enrichBids = async (rows: any[]) => {
  if (!rows.length) return [];
  const electricianIds = [...new Set(rows.map((row) => row.electrician_id).filter(Boolean))];
  const jobIds = [...new Set(rows.map((row) => row.job_post_id).filter(Boolean))];
  const [{ data: electricians, error: electricianError }, { data: jobs, error: jobError }] = await Promise.all([
    supabase.from('public_electricians').select('*').in('id', electricianIds),
    supabase.from('public_job_posts').select('*').in('id', jobIds),
  ]);
  if (electricianError) throw electricianError;
  if (jobError) throw jobError;
  const electricianMap = new Map((electricians || []).map((row: any) => [row.id, publicElectrician(row)]));
  const jobMap = new Map((jobs || []).map((row: any) => [row.id, publicJob(row)]));
  return rows.map((row) => mapBid({
    ...row,
    electrician: electricianMap.get(row.electrician_id),
    job_post: jobMap.get(row.job_post_id),
  }));
};

const rpcErrorMessages: Record<string, string> = {
  INSUFFICIENT_CREDIT: 'Yetersiz kredi. Teklif verebilmek için en az 1 krediniz olmalıdır.',
  ACTIVE_BID_EXISTS: 'Bu ilana zaten aktif bir teklif verdiniz.',
  JOB_NOT_OPEN: 'Bu ilan artık teklif kabul etmiyor.',
  PHONE_NUMBER_NOT_ALLOWED: 'Güvenlik nedeniyle teklif mesajında telefon numarası paylaşamazsınız.',
  BID_NOT_PENDING: 'Bu teklif artık beklemede değil.',
  USER_BLOCKED: 'Engelleme nedeniyle bu işlem yapılamıyor.',
};

const throwFriendly = (error: any): never => {
  const key = Object.keys(rpcErrorMessages).find((code) => error?.message?.includes(code));
  throw new Error(key ? rpcErrorMessages[key] : error?.message || 'Teklif işlemi başarısız oldu.');
};

export const bidService = {
  async createBid(data: CreateBidData) {
    assertSupabaseConfigured();
    const { data: row, error } = await supabase.rpc('create_bid', {
      job_id: data.jobPostId,
      bid_amount: data.amount,
      validity_days: data.validityDays || 7,
      estimated_start_at: data.estimatedStartDate || null,
      bid_message: data.message,
      cost_items: data.costItems || null,
    });
    if (error) throwFriendly(error);
    return (await enrichBids([row]))[0];
  },

  async getBidById(id: string) {
    const { data, error } = await supabase.from('bids').select('*').eq('id', id).single();
    if (error) throw error;
    return (await enrichBids([data]))[0];
  },

  async getJobBids(jobId: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return [];
    const { data, error } = await supabase.from('bids').select('*')
      .eq('job_post_id', jobId).order('created_at', { ascending: false });
    if (error) throw error;
    return enrichBids(data || []);
  },

  async getMyBids() {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw authError || new Error('Oturum bulunamadı.');
    const { data, error } = await supabase.from('bids').select('*')
      .eq('electrician_id', authData.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    return enrichBids(data || []);
  },

  async updateBid(id: string, data: Partial<CreateBidData>) {
    const { data: row, error } = await supabase.rpc('update_bid', {
      bid_id: id,
      bid_amount: data.amount ?? null,
      validity_days: data.validityDays ?? null,
      estimated_start_at: data.estimatedStartDate ?? null,
      bid_message: data.message ?? null,
      cost_items: data.costItems ?? null,
    });
    if (error) throwFriendly(error);
    return (await enrichBids([row]))[0];
  },

  async acceptBid(id: string) {
    const { data, error } = await supabase.rpc('accept_bid', { bid_id: id });
    if (error) throwFriendly(error);
    return (await enrichBids([data]))[0];
  },

  async rejectBid(id: string) {
    const { data, error } = await supabase.rpc('reject_bid', { bid_id: id });
    if (error) throwFriendly(error);
    return (await enrichBids([data]))[0];
  },

  async withdrawBid(id: string) {
    const { data, error } = await supabase.rpc('withdraw_bid', { bid_id: id });
    if (error) throwFriendly(error);
    return mapBid(data);
  },

  async deleteBid(id: string) {
    const { error } = await supabase.rpc('delete_bid', { bid_id: id });
    if (error) throwFriendly(error);
    return { success: true };
  },

  async requestPriceUpdate(id: string) {
    const { data, error } = await supabase.rpc('request_bid_update', { bid_id: id });
    if (error) throwFriendly(error);
    return { success: true, data: mapBid(data) };
  },

  subscribeToJobBids(jobId: string, onChange: (bid: Bid, event: string) => void) {
    const channel = supabase.channel(`job-bids:${jobId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bids', filter: `job_post_id=eq.${jobId}`,
      }, (payload: RealtimePostgresChangesPayload<any>) => {
        const row = payload.new && Object.keys(payload.new).length ? payload.new : payload.old;
        if (row) onChange(mapBid(row), payload.eventType);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },
};

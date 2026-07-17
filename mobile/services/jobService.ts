import { File } from 'expo-file-system';

import { assertSupabaseConfigured, supabase } from './supabase';

const supabaseStorageBaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const jobImagesBucketPrefix = supabaseStorageBaseUrl
  ? `${supabaseStorageBaseUrl.replace(/\/$/, '')}/storage/v1/object/public/job-images/`
  : null;

export interface JobLocation {
  address: string;
  city: string;
  district: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
}

export interface CreateJobData {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location: JobLocation;
  urgencyLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedBudget?: number;
  budgetRange?: { min: number; max: number };
  preferredTime?: string;
  images?: string[];
  serviceCategory?: string;
}

export interface Job {
  id: string;
  citizenId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string | null;
  serviceCategory?: string | null;
  location: JobLocation;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedBudget?: number | string | null;
  budgetRange?: { min: number; max: number } | null;
  preferredTime?: string | null;
  status: 'DRAFT' | 'OPEN' | 'BIDDING' | 'IN_PROGRESS' | 'PENDING_CONFIRMATION' | 'COMPLETED' | 'CANCELLED';
  images: string[];
  assignedElectricianId?: string | null;
  acceptedBidId?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  viewCount: number;
  bidCount: number;
  createdAt: string;
  updatedAt: string;
  hasReview?: boolean;
  citizen?: {
    id: string;
    fullName: string;
    profileImageUrl?: string | null;
    phone?: string | null;
  };
}

const mapJob = (row: any): Job => ({
  id: row.id,
  citizenId: row.citizen_id || '',
  title: row.title,
  description: row.description,
  category: row.category,
  subcategory: row.subcategory,
  serviceCategory: row.service_category,
  location: row.location || {},
  urgencyLevel: row.urgency_level,
  estimatedBudget: row.estimated_budget == null ? null : Number(row.estimated_budget),
  budgetRange: row.budget_range,
  preferredTime: row.preferred_time,
  status: row.status,
  images: row.images || [],
  assignedElectricianId: row.assigned_electrician_id,
  acceptedBidId: row.accepted_bid_id,
  cancellationReason: row.cancellation_reason,
  cancelledAt: row.cancelled_at,
  viewCount: row.view_count || 0,
  bidCount: row.bid_count || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at || row.created_at,
  hasReview: Boolean(row.has_review),
  citizen: row.citizen_name ? {
    id: row.citizen_id || '',
    fullName: row.citizen_name,
    profileImageUrl: row.citizen_profile_image_url,
  } : undefined,
});

const extensionFor = (uri: string, mime?: string) => {
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension && ['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return extension;
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
};

const uploadJobImages = async (userId: string, jobId: string, uris: string[]) => {
  const uploaded: string[] = [];
  for (let index = 0; index < uris.length; index += 1) {
    const uri = uris[index];
    if (uri.startsWith('https://') || uri.startsWith('http://')) {
      uploaded.push(uri);
      continue;
    }
    let fileData: ArrayBuffer;
    let contentType: string | undefined;
    try {
      const file = new File(uri);
      fileData = await file.arrayBuffer();
      contentType = file.type || undefined;
    } catch (error) {
      console.warn('İlan görseli yerel dosyadan okunamadı:', error);
      throw new Error(`Seçilen ${index + 1}. fotoğraf okunamadı. Lütfen fotoğrafı yeniden seçin.`);
    }
    const extension = extensionFor(uri, contentType);
    const path = `${userId}/${jobId}/${Date.now()}-${index}.${extension}`;
    const { error } = await supabase.storage.from('job-images').upload(path, fileData, {
      contentType: contentType || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      upsert: false,
    });
    if (error) throw error;
    uploaded.push(supabase.storage.from('job-images').getPublicUrl(path).data.publicUrl);
  }
  return uploaded;
};

const getJobImageObjectPath = (imageUrl: string) => {
  if (!jobImagesBucketPrefix || !imageUrl.startsWith(jobImagesBucketPrefix)) return null;

  try {
    const relativePath = decodeURIComponent(imageUrl.slice(jobImagesBucketPrefix.length));
    return relativePath || null;
  } catch {
    return null;
  }
};

const deleteJobImages = async (imageUrls: string[]) => {
  const paths = imageUrls
    .map(getJobImageObjectPath)
    .filter((path): path is string => Boolean(path));

  if (!paths.length) return;

  const { error } = await supabase.storage.from('job-images').remove(paths);
  if (error) {
    console.warn('Job görselleri silinemedi:', error.message);
  }
};

const writableJobData = (data: Partial<CreateJobData>) => {
  const result: Record<string, unknown> = {};
  if (data.title !== undefined) result.title = data.title.trim();
  if (data.description !== undefined) result.description = data.description.trim();
  if (data.category !== undefined) result.category = data.category;
  if (data.subcategory !== undefined) result.subcategory = data.subcategory || null;
  if (data.serviceCategory !== undefined) result.service_category = data.serviceCategory;
  if (data.location !== undefined) result.location = data.location;
  if (data.urgencyLevel !== undefined) result.urgency_level = data.urgencyLevel;
  if (data.estimatedBudget !== undefined) result.estimated_budget = data.estimatedBudget;
  if (data.budgetRange !== undefined) result.budget_range = data.budgetRange;
  if (data.preferredTime !== undefined) result.preferred_time = data.preferredTime;
  return result;
};

export const jobService = {
  async createJob(data: CreateJobData) {
    try {
      assertSupabaseConfigured();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError || new Error('İlan oluşturmak için giriş yapmalısınız.');

      const { data: row, error } = await supabase.from('job_posts').insert({
        ...writableJobData(data),
        citizen_id: authData.user.id,
        images: [],
        status: 'OPEN',
      }).select('*').single();
      if (error) throw error;

      if (data.images?.length) {
        let uploadedImages: string[] = [];
        try {
          uploadedImages = await uploadJobImages(authData.user.id, row.id, data.images);
          const { data: updated, error: updateError } = await supabase
            .from('job_posts').update({ images: uploadedImages }).eq('id', row.id).select('*').single();
          if (updateError) throw updateError;
          return mapJob(updated);
        } catch (uploadError) {
          await deleteJobImages(uploadedImages);
          await supabase.rpc('delete_job', { job_id: row.id });
          throw uploadError;
        }
      }
      return mapJob(row);
    } catch (error) {
      if (error instanceof TypeError && /network request failed/i.test(error.message)) {
        throw new Error('Supabase bağlantısı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
      }
      throw error;
    }
  },

  async getJobs(filters?: {
    status?: string;
    category?: string;
    serviceCategory?: string;
    city?: string;
    district?: string;
    districts?: string[];
    lat?: number;
    lng?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }) {
    assertSupabaseConfigured();
    const page = Math.max(filters?.page || 1, 1);
    const limit = Math.min(Math.max(filters?.limit || 20, 1), 100);
    const from = (page - 1) * limit;
    let query = supabase.from('public_job_posts').select('*', { count: 'exact' });
    if (filters?.status === 'ACTIVE') {
      query = query.in('status', ['OPEN', 'BIDDING']);
    } else if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.serviceCategory) query = query.eq('service_category', filters.serviceCategory);
    if (filters?.city) query = query.eq('location->>city', filters.city);
    if (filters?.district) query = query.eq('location->>district', filters.district);
    if (filters?.districts?.length) query = query.in('location->>district', filters.districts);
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);
    if (error) throw error;
    return {
      jobs: (data || []).map(mapJob),
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    };
  },

  async getJobById(id: string) {
    assertSupabaseConfigured();
    const { data: sessionData } = await supabase.auth.getSession();
    const source = sessionData.session ? 'job_posts' : 'public_job_posts';
    const { data, error } = await supabase.from(source).select('*').eq('id', id).single();
    if (error) throw error;

    const publicResult = source === 'job_posts'
      ? await supabase.from('public_job_posts').select('citizen_name,citizen_profile_image_url').eq('id', id).maybeSingle()
      : { data: null };
    return mapJob({ ...data, ...(publicResult.data || {}) });
  },

  async getMyJobs() {
    assertSupabaseConfigured();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw authError || new Error('Oturum bulunamadı.');
    const { data, error } = await supabase.from('job_posts').select('*')
      .or(`citizen_id.eq.${authData.user.id},assigned_electrician_id.eq.${authData.user.id}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapJob);
  },

  async updateJob(id: string, data: Partial<CreateJobData>) {
    assertSupabaseConfigured();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error('Oturum bulunamadı.');

    const { data: currentRow, error: fetchError } = await supabase
      .from('job_posts')
      .select('images')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const updates = writableJobData(data);
    const shouldReplaceImages = data.images !== undefined;
    const previousImages = Array.isArray(currentRow?.images) ? currentRow.images : [];
    let uploadedImages: string[] = [];

    try {
      if (shouldReplaceImages) {
        uploadedImages = await uploadJobImages(authData.user.id, id, data.images || []);
        updates.images = uploadedImages;
      }

      const { data: row, error } = await supabase.from('job_posts').update(updates).eq('id', id).select('*').single();
      if (error) throw error;

      if (shouldReplaceImages && previousImages.length) {
        await deleteJobImages(previousImages);
      }

      return mapJob(row);
    } catch (error) {
      if (uploadedImages.length) {
        await deleteJobImages(uploadedImages);
      }
      throw error;
    }
  },

  async deleteJob(id: string) {
    const { data: currentRow, error: fetchError } = await supabase
      .from('job_posts')
      .select('images')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase.rpc('delete_job', { job_id: id });
    if (error) throw error;

    await deleteJobImages(Array.isArray(currentRow?.images) ? currentRow.images : []);
    return { success: true };
  },

  async completeJob(id: string, review?: { rating: number; comment: string }) {
    const { data, error } = await supabase.rpc('complete_job', {
      job_id: id,
      review_rating: review?.rating ?? null,
      review_comment: review?.comment ?? null,
    });
    if (error) throw error;
    return mapJob(data);
  },

  async createReview(id: string, data: { rating: number; comment?: string }) {
    const { data: result, error } = await supabase.rpc('create_job_review', {
      job_id: id,
      review_rating: data.rating,
      review_comment: data.comment ?? null,
    });
    if (error) throw error;
    return result;
  },

  async cancelJob(id: string, reason?: string) {
    const { data, error } = await supabase.rpc('cancel_job', { job_id: id, reason: reason || null });
    if (error) throw error;
    return mapJob(data);
  },
};

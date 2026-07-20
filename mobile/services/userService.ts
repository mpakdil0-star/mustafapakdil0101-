import { authService } from './authService';
import { assertSupabaseConfigured, supabase } from './supabase';

const mapElectrician = (row: any) => ({
  id: row.id,
  fullName: row.full_name,
  city: row.city,
  locations: Array.isArray(row.locations)
    ? row.locations
        .filter((location: any) => location?.city)
        .map((location: any) => ({
          city: String(location.city),
          district: location.district ? String(location.district) : undefined,
        }))
    : [],
  profileImageUrl: row.profile_image_url,
  isVerified: row.is_verified,
  userType: 'ELECTRICIAN',
  electricianProfile: {
    companyName: row.company_name,
    bio: row.bio,
    experienceYears: row.experience_years,
    specialties: row.specialties || [],
    ratingAverage: Number(row.rating_average || 0),
    rating: Number(row.rating_average || 0),
    totalReviews: row.total_reviews || 0,
    completedJobsCount: row.completed_jobs_count || 0,
    hourlyRate: row.hourly_rate == null ? null : Number(row.hourly_rate),
    minimumCharge: row.minimum_charge == null ? null : Number(row.minimum_charge),
    isAvailable: row.is_available,
    verificationStatus: row.verification_status,
    serviceCategory: row.service_category,
  },
});

export interface UpdateProfileData {
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  experienceYears?: number;
  specialties?: string[];
  companyName?: string;
  bio?: string;
  serviceCategory?: string;
}

const uploadPrivateDocument = async (userId: string, uri: string) => {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Doğrulama belgesi okunamadı.');
  const mime = response.headers.get('content-type') || 'image/jpeg';
  const extension = mime.includes('png') ? 'png' : mime.includes('pdf') ? 'pdf' : 'jpg';
  const path = `${userId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('verification-documents').upload(
    path,
    await response.arrayBuffer(),
    { contentType: mime, upsert: false }
  );
  if (error) throw error;
  return path;
};

export const userService = {
  async getElectricians(params?: {
    city?: string;
    specialty?: string;
    query?: string;
    lat?: number;
    lng?: number;
    radius?: number;
  }) {
    assertSupabaseConfigured();
    let query = supabase.from('public_electricians').select('*');
    if (params?.city) query = query.eq('city', params.city);
    if (params?.specialty) query = query.contains('specialties', [params.specialty]);
    if (params?.query?.trim()) {
      const term = params.query.trim().replace(/[%_,()]/g, '');
      query = query.or(`full_name.ilike.%${term}%,company_name.ilike.%${term}%`);
    }
    const { data, error } = await query.order('rating_average', { ascending: false });
    if (error) throw error;
    return { success: true, data: (data || []).map(mapElectrician) };
  },

  async getElectricianById(id: string) {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('public_electricians')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { success: true, data: mapElectrician(data), error: null as { message: string } | null };
  },

  async updateProfile(input: UpdateProfileData) {
    assertSupabaseConfigured();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw authError || new Error('Oturum bulunamadı.');
    const userId = authData.user.id;

    if (input.email && input.email.trim().toLowerCase() !== authData.user.email?.toLowerCase()) {
      const { error } = await supabase.auth.updateUser({ email: input.email.trim().toLowerCase() });
      if (error) throw error;
    }

    const userUpdates: Record<string, unknown> = {};
    if (input.fullName !== undefined) userUpdates.full_name = input.fullName.trim();
    if (input.phone !== undefined) userUpdates.phone = input.phone.trim() || null;
    if (input.city !== undefined) userUpdates.city = input.city || null;
    if (Object.keys(userUpdates).length) {
      const { error } = await supabase.from('users').update(userUpdates).eq('id', userId);
      if (error) throw error;
    }

    const profileUpdates: Record<string, unknown> = {};
    if (input.experienceYears !== undefined) profileUpdates.experience_years = input.experienceYears;
    if (input.specialties !== undefined) profileUpdates.specialties = input.specialties;
    if (input.companyName !== undefined) profileUpdates.company_name = input.companyName || null;
    if (input.bio !== undefined) profileUpdates.bio = input.bio || null;
    if (input.serviceCategory !== undefined) profileUpdates.service_category = input.serviceCategory;
    if (Object.keys(profileUpdates).length) {
      const { error } = await supabase.from('electrician_profiles').update(profileUpdates).eq('user_id', userId);
      if (error) throw error;
    }

    return authService.getMe();
  },

  async getVerification() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error('Oturum bulunamadı.');
    const { data, error } = await supabase.from('electrician_profiles')
      .select('verification_status,verification_documents,license_number,emo_number,smm_number,is_authorized_engineer')
      .eq('user_id', authData.user.id)
      .single();
    if (error) throw error;
    const documents = data.verification_documents as any;
    return {
      status: data.verification_status,
      documentType: documents?.documentType,
      licenseNumber: data.license_number,
      emoNumber: data.emo_number,
      smmNumber: data.smm_number,
      isAuthorizedEngineer: data.is_authorized_engineer,
    };
  },

  async submitVerification(input: {
    documentType: string;
    documentImage: string;
    licenseNumber?: string;
    emoNumber?: string;
    smmNumber?: string;
  }) {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error('Oturum bulunamadı.');
    const path = await uploadPrivateDocument(authData.user.id, input.documentImage);
    const { data, error } = await supabase.rpc('submit_verification', {
      document_type: input.documentType,
      document_path: path,
      license_number: input.licenseNumber || null,
      emo_number: input.emoNumber || null,
      smm_number: input.smmNumber || null,
    });
    if (error) {
      await supabase.storage.from('verification-documents').remove([path]);
      throw error;
    }
    return data;
  },
};

export default userService;

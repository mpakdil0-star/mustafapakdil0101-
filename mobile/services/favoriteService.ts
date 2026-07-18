import { supabase } from './supabase';

export interface FavoriteElectrician {
  id: string;
  electricianId: string;
  createdAt: string;
  electrician: {
    id: string;
    fullName: string;
    profileImageUrl: string | null;
    rating: number;
    reviewCount: number;
    completedJobs: number;
    specialties: string[];
    isAvailable: boolean;
  };
}

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Oturum bulunamadı.');
  return data.user.id;
};

export const favoriteService = {
  async getFavorites(): Promise<FavoriteElectrician[]> {
    const userId = await getUserId();
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;

    const ids = (favorites || []).map((row: any) => row.electrician_id);
    if (!ids.length) return [];

    const { data: cards, error: cardsError } = await supabase
      .from('public_electricians')
      .select('*')
      .in('id', ids);
    if (cardsError) throw cardsError;

    const cardById = new Map((cards || []).map((row: any) => [row.id, row]));
    return (favorites || []).flatMap((row: any) => {
      const electrician: any = cardById.get(row.electrician_id);
      if (!electrician) return [];
      return [{
        id: row.id,
        electricianId: row.electrician_id,
        createdAt: row.created_at,
        electrician: {
          id: electrician.id,
          fullName: electrician.full_name,
          profileImageUrl: electrician.profile_image_url,
          rating: Number(electrician.rating_average || 0),
          reviewCount: electrician.total_reviews || 0,
          completedJobs: electrician.completed_jobs_count || 0,
          specialties: electrician.specialties || [],
          isAvailable: Boolean(electrician.is_available),
        },
      }];
    });
  },

  async addFavorite(electricianId: string) {
    const { error } = await supabase.from('favorites').upsert(
      { user_id: await getUserId(), electrician_id: electricianId },
      { onConflict: 'user_id,electrician_id' },
    );
    if (error) throw error;
    return { success: true };
  },

  async removeFavorite(electricianId: string) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', await getUserId())
      .eq('electrician_id', electricianId);
    if (error) throw error;
    return { success: true };
  },

  async checkFavorite(electricianId: string) {
    const { count, error } = await supabase
      .from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', await getUserId())
      .eq('electrician_id', electricianId);
    if (error) throw error;
    return { isFavorite: (count || 0) > 0 };
  },
};

export default favoriteService;

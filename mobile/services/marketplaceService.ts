import { supabase } from './supabase';

type UploadedMarketplaceImage = { publicUrl: string; path: string };

const mapProduct = (item: any) => ({
  ...item,
  sellerName: item.seller_name,
  sellerId: item.seller_id,
  sellerType: item.seller_type,
  isSold: item.is_sold,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

const currentSeller = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Oturum gerekli');
  const { data, error: profileError } = await supabase
    .from('users')
    .select('id,full_name,user_type')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;
  return data;
};

const upload = async (uri: string, userId: string): Promise<UploadedMarketplaceImage> => {
  if (!uri || (!uri.startsWith('data:') && !uri.startsWith('file:') && !uri.startsWith('content:'))) {
    return { publicUrl: uri, path: '' };
  }

  const response = await fetch(uri);
  const mimeFromDataUri = uri.startsWith('data:') ? uri.match(/^data:([^;,]+)/)?.[1] : null;
  const mime = mimeFromDataUri || response.headers.get('content-type') || 'image/jpeg';
  if (!mime.startsWith('image/')) throw new Error('UNSUPPORTED_MARKETPLACE_IMAGE');
  const fileData = await response.arrayBuffer();
  if (!fileData.byteLength) throw new Error('EMPTY_MARKETPLACE_IMAGE');
  if (fileData.byteLength > 10 * 1024 * 1024) throw new Error('MARKETPLACE_IMAGE_TOO_LARGE');

  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('marketplace-media').upload(path, fileData, {
    contentType: mime,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return { publicUrl: supabase.storage.from('marketplace-media').getPublicUrl(path).data.publicUrl, path };
};

const removeUploaded = async (paths: string[]) => {
  const validPaths = paths.filter(Boolean);
  if (!validPaths.length) return;
  const { error } = await supabase.storage.from('marketplace-media').remove(validPaths);
  if (error) console.warn('Pazar yeri görseli temizlenemedi:', error.message);
};

const storagePathFromPublicUrl = (url: string) => {
  const marker = '/storage/v1/object/public/marketplace-media/';
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
};

export const marketplaceService = {
  async list() {
    const { data, error } = await supabase.from('marketplace_products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapProduct);
  },

  async create(input: { title: string; price: number; category: string; location: string; desc: string; images?: string[] }) {
    const seller = await currentSeller();
    const uploaded: UploadedMarketplaceImage[] = [];
    try {
      for (const image of (input.images ?? []).slice(0, 5)) uploaded.push(await upload(image, seller.id));
      const imageUrls = uploaded.map(item => item.publicUrl);
      const { error } = await supabase.from('marketplace_products').insert({
        title: input.title.trim(),
        price: input.price,
        category: input.category,
        seller_name: `${seller.full_name} (${seller.user_type === 'ELECTRICIAN' ? 'Usta' : 'Vatandaş'})`,
        seller_id: seller.id,
        seller_type: seller.user_type,
        location: input.location.trim(),
        desc: input.desc.trim(),
        date: 'Bugün',
        image: imageUrls[0] ?? null,
        images: imageUrls,
        is_sold: false,
      });
      if (error) throw error;
      return this.list();
    } catch (error) {
      await removeUploaded(uploaded.map(item => item.path));
      throw error;
    }
  },

  async remove(id: string) {
    const { data: item, error: readError } = await supabase
      .from('marketplace_products')
      .select('image,images')
      .eq('id', id)
      .maybeSingle();
    if (readError) throw readError;
    const { error } = await supabase.from('marketplace_products').delete().eq('id', id);
    if (error) throw error;
    const urls = Array.from(new Set([item?.image, ...(item?.images ?? [])].filter(Boolean))) as string[];
    await removeUploaded(urls.map(storagePathFromPublicUrl).filter((path): path is string => Boolean(path)));
  },

  async markSold(id: string) {
    const { error } = await supabase.from('marketplace_products').update({ is_sold: true }).eq('id', id);
    if (error) throw error;
  },
};

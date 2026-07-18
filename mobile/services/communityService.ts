import { supabase } from './supabase';

const actor = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Oturum gerekli');
  const { data, error: profileError } = await supabase.from('users').select('id,full_name,city,profile_image_url').eq('id', user.id).single();
  if (profileError) throw profileError;
  return data;
};

type UploadedCommunityImage = { publicUrl: string; path: string };

const uploadImage = async (uri: string, folder: string): Promise<UploadedCommunityImage> => {
  if (!uri || (!uri.startsWith('data:') && !uri.startsWith('file:') && !uri.startsWith('content:'))) {
    return { publicUrl: uri, path: '' };
  }
  const user = await actor();
  const response = await fetch(uri);
  const mimeFromDataUri = uri.startsWith('data:') ? uri.match(/^data:([^;,]+)/)?.[1] : null;
  const mime = mimeFromDataUri || response.headers.get('content-type') || 'image/jpeg';
  if (!mime.startsWith('image/')) throw new Error('UNSUPPORTED_COMMUNITY_IMAGE');
  const fileData = await response.arrayBuffer();
  if (!fileData.byteLength) throw new Error('EMPTY_COMMUNITY_IMAGE');
  if (fileData.byteLength > 10 * 1024 * 1024) throw new Error('COMMUNITY_IMAGE_TOO_LARGE');
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('community-media').upload(path, fileData, {
    contentType: mime,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  return { publicUrl: supabase.storage.from('community-media').getPublicUrl(path).data.publicUrl, path };
};

const removeUploadedImages = async (paths: string[]) => {
  const validPaths = paths.filter(Boolean);
  if (!validPaths.length) return;
  const { error } = await supabase.storage.from('community-media').remove(validPaths);
  if (error) console.warn('Topluluk görseli temizlenemedi:', error.message);
};

const storagePathFromPublicUrl = (url: string) => {
  const marker = '/storage/v1/object/public/community-media/';
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
};

const mapComment = (x:any) => ({...x,forumPostId:x.forum_post_id,ustaId:x.usta_id,ustaName:x.usta_name,createdAt:x.created_at});
const mapForum = (x:any) => ({...x,imageUrl:x.image_url,ustaId:x.usta_id,ustaName:x.usta_name,ustaCity:x.usta_city,createdAt:x.created_at,updatedAt:x.updated_at,comments:(x.forum_comments??[]).map(mapComment)});
const mapJob = (x:any) => ({...x,ustaId:x.usta_id,ustaName:x.usta_name,ustaCity:x.usta_city,ustaAvatar:x.usta_avatar,createdAt:x.created_at,updatedAt:x.updated_at});
const mapShowcase = (x:any) => ({...x,ustaId:x.usta_id,ustaName:x.usta_name,ustaCity:x.usta_city,ustaAvatar:x.usta_avatar,createdAt:x.created_at,updatedAt:x.updated_at});

export const communityService = {
  async forum(){ const {data,error}=await supabase.from('forum_posts').select('*,forum_comments(*)').order('created_at',{ascending:false}); if(error) throw error; return (data??[]).map(mapForum); },
  async createForum(input:{title:string;description:string;imageUrl?:string|null}){
    const u=await actor();
    const uploaded=input.imageUrl?await uploadImage(input.imageUrl,'forum'):null;
    const {error}=await supabase.from('forum_posts').insert({title:input.title.trim(),description:input.description.trim(),image_url:uploaded?.publicUrl??null,usta_id:u.id,usta_name:u.full_name,usta_city:u.city});
    if(error){ if(uploaded) await removeUploadedImages([uploaded.path]); throw error; }
    return this.forum();
  },
  async comment(postId:string,text:string){ const u=await actor(); const {error}=await supabase.from('forum_comments').insert({forum_post_id:postId,text:text.trim(),usta_id:u.id,usta_name:u.full_name}); if(error) throw error; return this.forum(); },
  async deleteForum(id:string){ const {error}=await supabase.from('forum_posts').delete().eq('id',id); if(error) throw error; },
  async jobs(){ const {data,error}=await supabase.from('job_sharing_posts').select('*').order('created_at',{ascending:false}); if(error) throw error; return (data??[]).map(mapJob); },
  async createJob(input:{title:string;description:string}){ const u=await actor(); const {error}=await supabase.from('job_sharing_posts').insert({title:input.title.trim(),description:input.description.trim(),usta_id:u.id,usta_name:u.full_name,usta_city:u.city||'İstanbul',usta_avatar:u.profile_image_url}); if(error) throw error; return this.jobs(); },
  async deleteJob(id:string){ const {error}=await supabase.from('job_sharing_posts').delete().eq('id',id); if(error) throw error; return this.jobs(); },
  async showcase(){ const {data,error}=await supabase.from('showcase_items').select('*').order('created_at',{ascending:false}); if(error) throw error; return (data??[]).map(mapShowcase); },
  async createShowcase(input:{title:string;description:string;images:string[]}){
    const u=await actor();
    const uploaded: UploadedCommunityImage[]=[];
    try {
      for(const image of input.images.slice(0,5)) uploaded.push(await uploadImage(image,'showcase'));
      if(!uploaded.length) throw new Error('EMPTY_COMMUNITY_IMAGE');
      const imageUrls=uploaded.map(item=>item.publicUrl);
      const {error}=await supabase.from('showcase_items').insert({title:input.title.trim(),description:input.description.trim(),image:imageUrls[0],images:imageUrls,usta_id:u.id,usta_name:u.full_name,usta_city:u.city||'İstanbul',usta_avatar:u.profile_image_url});
      if(error) throw error;
      return this.showcase();
    } catch(error) {
      await removeUploadedImages(uploaded.map(item=>item.path));
      throw error;
    }
  },
  async deleteShowcase(id:string){
    const {data:item,error:readError}=await supabase.from('showcase_items').select('image,images').eq('id',id).maybeSingle();
    if(readError) throw readError;
    const {error}=await supabase.from('showcase_items').delete().eq('id',id);
    if(error) throw error;
    const urls=Array.from(new Set([item?.image,...(item?.images??[])].filter(Boolean))) as string[];
    await removeUploadedImages(urls.map(storagePathFromPublicUrl).filter((path):path is string=>Boolean(path)));
    return this.showcase();
  },
};

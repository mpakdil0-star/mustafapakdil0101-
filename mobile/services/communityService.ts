import { supabase } from './supabase';

const actor = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Oturum gerekli');
  const { data, error: profileError } = await supabase.from('users').select('id,full_name,city,profile_image_url').eq('id', user.id).single();
  if (profileError) throw profileError;
  return data;
};

const uploadImage = async (uri: string, folder: string) => {
  if (!uri || (!uri.startsWith('data:') && !uri.startsWith('file:') && !uri.startsWith('content:'))) return uri;
  const user = await actor();
  const response = await fetch(uri);
  const mime = response.headers.get('content-type') || 'image/jpeg';
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('community-media').upload(path, await response.arrayBuffer(), { contentType: mime });
  if (error) throw error;
  return supabase.storage.from('community-media').getPublicUrl(path).data.publicUrl;
};

const mapComment = (x:any) => ({...x,forumPostId:x.forum_post_id,ustaId:x.usta_id,ustaName:x.usta_name,createdAt:x.created_at});
const mapForum = (x:any) => ({...x,imageUrl:x.image_url,ustaId:x.usta_id,ustaName:x.usta_name,ustaCity:x.usta_city,createdAt:x.created_at,updatedAt:x.updated_at,comments:(x.forum_comments??[]).map(mapComment)});
const mapJob = (x:any) => ({...x,ustaId:x.usta_id,ustaName:x.usta_name,ustaCity:x.usta_city,ustaAvatar:x.usta_avatar,createdAt:x.created_at,updatedAt:x.updated_at});
const mapShowcase = (x:any) => ({...x,ustaId:x.usta_id,ustaName:x.usta_name,ustaCity:x.usta_city,ustaAvatar:x.usta_avatar,createdAt:x.created_at,updatedAt:x.updated_at});

export const communityService = {
  async forum(){ const {data,error}=await supabase.from('forum_posts').select('*,forum_comments(*)').order('created_at',{ascending:false}); if(error) throw error; return (data??[]).map(mapForum); },
  async createForum(input:{title:string;description:string;imageUrl?:string|null}){ const u=await actor(); const image=input.imageUrl?await uploadImage(input.imageUrl,'forum'):null; const {error}=await supabase.from('forum_posts').insert({title:input.title.trim(),description:input.description.trim(),image_url:image,usta_id:u.id,usta_name:u.full_name,usta_city:u.city}); if(error) throw error; return this.forum(); },
  async comment(postId:string,text:string){ const u=await actor(); const {error}=await supabase.from('forum_comments').insert({forum_post_id:postId,text:text.trim(),usta_id:u.id,usta_name:u.full_name}); if(error) throw error; return this.forum(); },
  async deleteForum(id:string){ const {error}=await supabase.from('forum_posts').delete().eq('id',id); if(error) throw error; },
  async jobs(){ const {data,error}=await supabase.from('job_sharing_posts').select('*').order('created_at',{ascending:false}); if(error) throw error; return (data??[]).map(mapJob); },
  async createJob(input:{title:string;description:string}){ const u=await actor(); const {error}=await supabase.from('job_sharing_posts').insert({title:input.title.trim(),description:input.description.trim(),usta_id:u.id,usta_name:u.full_name,usta_city:u.city||'İstanbul',usta_avatar:u.profile_image_url}); if(error) throw error; return this.jobs(); },
  async deleteJob(id:string){ const {error}=await supabase.from('job_sharing_posts').delete().eq('id',id); if(error) throw error; return this.jobs(); },
  async showcase(){ const {data,error}=await supabase.from('showcase_items').select('*').order('created_at',{ascending:false}); if(error) throw error; return (data??[]).map(mapShowcase); },
  async createShowcase(input:{title:string;description:string;images:string[]}){ const u=await actor(); const images=await Promise.all(input.images.map(x=>uploadImage(x,'showcase'))); const {error}=await supabase.from('showcase_items').insert({title:input.title.trim(),description:input.description.trim(),image:images[0],images,usta_id:u.id,usta_name:u.full_name,usta_city:u.city||'İstanbul',usta_avatar:u.profile_image_url}); if(error) throw error; return this.showcase(); },
  async deleteShowcase(id:string){ const {error}=await supabase.from('showcase_items').delete().eq('id',id); if(error) throw error; return this.showcase(); },
};

import { supabase } from './supabase';

const mapProduct=(x:any)=>({...x,sellerName:x.seller_name,sellerId:x.seller_id,sellerType:x.seller_type,isSold:x.is_sold,createdAt:x.created_at,updatedAt:x.updated_at});

const currentSeller=async()=>{
  const {data:{user},error}=await supabase.auth.getUser(); if(error||!user) throw error??new Error('Oturum gerekli');
  const {data,error:profileError}=await supabase.from('users').select('id,full_name,user_type').eq('id',user.id).single(); if(profileError) throw profileError; return data;
};

const upload=async(uri:string,userId:string)=>{
  if(!uri||(!uri.startsWith('data:')&&!uri.startsWith('file:')&&!uri.startsWith('content:'))) return uri;
  const response=await fetch(uri); const mime=response.headers.get('content-type')||'image/jpeg'; const ext=mime.includes('png')?'png':mime.includes('webp')?'webp':'jpg';
  const path=`${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const {error}=await supabase.storage.from('marketplace-media').upload(path,await response.arrayBuffer(),{contentType:mime}); if(error) throw error;
  return supabase.storage.from('marketplace-media').getPublicUrl(path).data.publicUrl;
};

export const marketplaceService={
  async list(){const {data,error}=await supabase.from('marketplace_products').select('*').order('created_at',{ascending:false});if(error)throw error;return(data??[]).map(mapProduct);},
  async create(input:{title:string;price:number;category:string;location:string;desc:string;images?:string[]}){
    const seller=await currentSeller(); const images=await Promise.all((input.images??[]).slice(0,5).map(x=>upload(x,seller.id)));
    const {error}=await supabase.from('marketplace_products').insert({title:input.title.trim(),price:input.price,category:input.category,seller_name:`${seller.full_name} (${seller.user_type==='ELECTRICIAN'?'Usta':'Vatandaş'})`,seller_id:seller.id,seller_type:seller.user_type,location:input.location.trim(),desc:input.desc.trim(),date:'Bugün',image:images[0]??null,images,is_sold:false});if(error)throw error;return this.list();
  },
  async remove(id:string){const {error}=await supabase.from('marketplace_products').delete().eq('id',id);if(error)throw error;},
  async markSold(id:string){const {error}=await supabase.from('marketplace_products').update({is_sold:true,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;},
};

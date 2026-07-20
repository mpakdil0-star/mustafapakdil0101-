import * as SecureStore from 'expo-secure-store';
import { MOCK_ELECTRICIANS } from '../data/mockElectricians';
import { supabase } from './supabase';
const KEY='elektrikciler_favorites';
export interface FavoriteElectrician{id:string;electricianId:string;createdAt:string;electrician:{id:string;fullName:string;profileImageUrl:string|null;rating:number;reviewCount:number;completedJobs:number;specialties:string[];isAvailable:boolean;};}
const local=async():Promise<string[]>=>JSON.parse(await SecureStore.getItemAsync(KEY)||'[]');
const save=(v:string[])=>SecureStore.setItemAsync(KEY,JSON.stringify(v));
const mock=(id:string):FavoriteElectrician|null=>{const e=MOCK_ELECTRICIANS.find(x=>x.id===id);return e?{id:`fav-${id}`,electricianId:id,createdAt:new Date().toISOString(),electrician:{id,fullName:e.name,profileImageUrl:e.imageUrl||null,rating:e.rating,reviewCount:e.reviewCount,completedJobs:e.completedJobs,specialties:e.services||[],isAvailable:e.isAvailable??true}}:null;};
const uid=async()=>{const{data}=await supabase.auth.getUser();if(!data.user)throw new Error('Oturum bulunamadı.');return data.user.id;};
export const favoriteService={
 async getFavorites(){const userId=await uid();const{data,error}=await supabase.from('favorites').select('*').eq('user_id',userId);if(error)throw error;const ids=(data||[]).map((r:any)=>r.electrician_id);const{data:cards}=ids.length?await supabase.from('public_electricians').select('*').in('id',ids):{data:[]};const mapCards=new Map((cards||[]).map((r:any)=>[r.id,r]));const result=(data||[]).map((r:any)=>{const e:any=mapCards.get(r.electrician_id);return{id:r.id,electricianId:r.electrician_id,createdAt:r.created_at,electrician:{id:e.id,fullName:e.full_name,profileImageUrl:e.profile_image_url,rating:Number(e.rating_average||0),reviewCount:e.total_reviews||0,completedJobs:e.completed_jobs_count||0,specialties:e.specialties||[],isAvailable:e.is_available}};});for(const id of await local()){const m=mock(id);if(m)result.push(m);}return result;},
 async addFavorite(electricianId:string){if(MOCK_ELECTRICIANS.some(e=>e.id===electricianId)){const v=await local();if(!v.includes(electricianId)){v.push(electricianId);await save(v);}return{success:true};}const{error}=await supabase.from('favorites').upsert({user_id:await uid(),electrician_id:electricianId},{onConflict:'user_id,electrician_id'});if(error)throw error;return{success:true};},
 async removeFavorite(electricianId:string){await save((await local()).filter(x=>x!==electricianId));const{error}=await supabase.from('favorites').delete().eq('user_id',await uid()).eq('electrician_id',electricianId);if(error)throw error;return{success:true};},
 async checkFavorite(electricianId:string){if((await local()).includes(electricianId))return{isFavorite:true};const{count,error}=await supabase.from('favorites').select('id',{count:'exact',head:true}).eq('user_id',await uid()).eq('electrician_id',electricianId);if(error)throw error;return{isFavorite:(count||0)>0};}
};
export default favoriteService;

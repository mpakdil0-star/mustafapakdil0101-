import { createClient } from 'npm:@supabase/supabase-js@2';

const cors={ 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type' };
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});

Deno.serve(async request=>{
  if(request.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(request.method!=='POST') return reply({error:'METHOD_NOT_ALLOWED'},405);
  const url=Deno.env.get('SUPABASE_URL'); const anon=Deno.env.get('SUPABASE_ANON_KEY'); const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!service) return reply({error:'SERVER_CONFIGURATION_ERROR'},500);
  const authorization=request.headers.get('Authorization')??'';
  const client=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user) return reply({error:'UNAUTHORIZED'},401);
  const admin=createClient(url,service,{auth:{persistSession:false}});
  const tombstone=`deleted-${user.id}@deleted.invalid`;
  const {error:updateError}=await admin.from('users').update({email:tombstone,phone:null,full_name:'Silinmiş Kullanıcı',profile_image_url:null,is_active:false,deleted_at:new Date().toISOString(),notification_settings:{}}).eq('id',user.id);
  if(updateError){console.error(updateError);return reply({error:'PROFILE_ANONYMIZATION_FAILED'},500);}
  await admin.from('push_tokens').delete().eq('user_id',user.id);
  const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);
  if(deleteError){console.error(deleteError);return reply({error:'AUTH_DELETE_FAILED'},500);}
  return reply({success:true});
});

import { supabase } from './supabase';

const cards = async (ids: string[]) => {
  if (!ids.length) return new Map<string, any>();
  const { data, error } = await supabase.from('users').select('id,full_name,email,phone,user_type').in('id', [...new Set(ids)]);
  if (error) throw error;
  return new Map((data ?? []).map(u => [u.id, { fullName: u.full_name, email: u.email, phone: u.phone, userType: u.user_type }]));
};

export const adminService = {
  async users(filters: { search?: string; userType?: string; city?: string; district?: string; serviceCategory?: string; page: number; limit: number }) {
    let query = supabase.from('users').select('*,electrician_profiles(*),locations(city,district,is_active)', { count: 'exact' }).is('deleted_at', null).order('created_at', { ascending: false });
    if (filters.search) query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    if (filters.userType && filters.userType !== 'ALL' && filters.userType !== 'ENGINEER') query = query.eq('user_type', filters.userType);
    if (filters.city) query = query.eq('city', filters.city);
    if (filters.district) query = query.eq('district', filters.district);
    const from = (filters.page - 1) * filters.limit;
    const { data, error, count } = await query.range(from, from + filters.limit - 1);
    if (error) throw error;
    let rows = data ?? [];
    if (filters.userType === 'ENGINEER') rows = rows.filter((u:any) => u.electrician_profiles?.is_authorized_engineer);
    if (filters.serviceCategory) rows = rows.filter((u:any) => u.electrician_profiles?.service_category === filters.serviceCategory);
    return { users: rows.map((u:any) => { const p=u.electrician_profiles; return { id:u.id,fullName:u.full_name,email:u.email,phone:u.phone,userType:u.user_type,profileImageUrl:u.profile_image_url,isVerified:u.is_verified,isActive:u.is_active,createdAt:u.created_at,creditBalance:Number(p?.credit_balance||0),verificationStatus:p?.verification_status,completedJobsCount:p?.completed_jobs_count,serviceCategory:p?.service_category,isAuthorizedEngineer:p?.is_authorized_engineer,locations:(u.locations??[]).filter((location:any)=>location.is_active&&location.city).map((location:any)=>({city:location.city,district:location.district||undefined})) }; }), totalPages: Math.max(1,Math.ceil((count??0)/filters.limit)) };
  },
  async setUserActive(id:string,value:boolean){ const {error}=await supabase.rpc('admin_set_user_active',{p_user_id:id,p_is_active:value}); if(error) throw error; },
  async deleteUser(id:string){
    const {data,error}=await supabase.functions.invoke('admin-delete-user',{body:{userId:id}});
    if(error){
      let details:any=null;
      try{ details=await (error as any).context?.json?.(); }catch{}
      throw new Error(details?.message||details?.error||error.message||'Kullanıcı silinemedi.');
    }
    if(!data?.success) throw new Error(data?.message||data?.error||'Kullanıcı silinemedi.');
    return data;
  },
  async addCredit(id:string,amount:number){ const {data,error}=await supabase.rpc('admin_add_credit',{p_user_id:id,p_amount:amount}); if(error) throw error; return Number(data); },
  async bulkNotify(ids:string[]|null,title:string,body:string){ const {data,error}=await supabase.rpc('admin_bulk_notify',{p_user_ids:ids,p_title:title,p_body:body}); if(error) throw error; return Number(data); },
  async verifications(){
    const {data,error}=await supabase.from('electrician_profiles').select('*,users!electrician_profiles_user_id_fkey(id,full_name,email,phone)').eq('verification_status','PENDING').order('updated_at',{ascending:false}); if(error) throw error;
    return (data??[]).filter((p:any)=>p.verification_documents).map((p:any)=>({userId:p.user_id,serviceCategory:p.service_category,licenseNumber:p.license_number,emoNumber:p.emo_number,smmNumber:p.smm_number,verificationDocuments:p.verification_documents,user:{id:p.users.id,fullName:p.users.full_name,email:p.users.email,phone:p.users.phone}}));
  },
  async processVerification(id:string,status:string,reason?:string){ const {error}=await supabase.rpc('admin_process_verification',{p_user_id:id,p_status:status,p_reason:reason??null}); if(error) throw error; },
  async dashboardStats(){
    const [users,electricians,citizens,jobs,pending]=await Promise.all([
      supabase.from('users').select('id',{count:'exact',head:true}).eq('is_active',true).is('deleted_at',null),
      supabase.from('users').select('id',{count:'exact',head:true}).eq('user_type','ELECTRICIAN').eq('is_active',true).is('deleted_at',null),
      supabase.from('users').select('id',{count:'exact',head:true}).eq('user_type','CITIZEN').eq('is_active',true).is('deleted_at',null),
      supabase.from('job_posts').select('id',{count:'exact',head:true}).eq('status','OPEN').is('deleted_at',null),
      supabase.from('electrician_profiles').select('id',{count:'exact',head:true}).eq('verification_status','PENDING')]);
    const error=[users,electricians,citizens,jobs,pending].find(x=>x.error)?.error; if(error) throw error;
    return {totalUsers:users.count??0,totalElectricians:electricians.count??0,totalCitizens:citizens.count??0,activeJobs:jobs.count??0,pendingVerifications:pending.count??0,totalRevenue:0};
  },
  async detailedStats(city='ALL') {
    let userQuery=supabase.from('users').select('id,user_type,city,district,electrician_profiles(service_category,is_available,verification_status)').eq('is_active',true).is('deleted_at',null);
    let jobQuery=supabase.from('job_posts').select('id,city,district,category').is('deleted_at',null);
    if(city!=='ALL'){ userQuery=userQuery.eq('city',city); jobQuery=jobQuery.eq('city',city); }
    const [{data:users,error:userError},{data:jobs,error:jobError},{data:cityRows,error:cityError}]=await Promise.all([userQuery,jobQuery,supabase.from('users').select('city').not('city','is',null)]);
    if(userError||jobError||cityError) throw userError||jobError||cityError;
    const count=(values:string[])=>Object.entries(values.reduce((a:any,v)=>{if(v)a[v]=(a[v]||0)+1;return a;},{})).map(([name,n])=>({name,count:Number(n)})).sort((a,b)=>b.count-a.count);
    const serviceDistribution=count((users??[]).map((u:any)=>u.electrician_profiles?.service_category).filter(Boolean));
    const districts=[...new Set([...(users??[]).map((u:any)=>u.district),...(jobs??[]).map((j:any)=>j.district)].filter(Boolean))];
    const heatmap=districts.map(d=>{const jobCount=(jobs??[]).filter((j:any)=>j.district===d).length;const masterCount=(users??[]).filter((u:any)=>u.district===d&&u.user_type==='ELECTRICIAN').length;const status: 'GREEN'|'RED'|'YELLOW'=masterCount>=jobCount?'GREEN':masterCount===0?'RED':'YELLOW';return {district:d,city:city==='ALL'?undefined:city,jobCount,masterCount,status};});
    return {kpis:{totalCitizens:(users??[]).filter((u:any)=>u.user_type==='CITIZEN').length,totalElectricians:(users??[]).filter((u:any)=>u.user_type==='ELECTRICIAN').length,pendingVerifications:(users??[]).filter((u:any)=>u.electrician_profiles?.verification_status==='PENDING').length},serviceDistribution,districtDistribution:count((users??[]).map((u:any)=>u.district).filter(Boolean)),liveData:{activeUstalar:(users??[]).filter((u:any)=>u.user_type==='ELECTRICIAN'&&u.electrician_profiles?.is_available).length,activeCitizens:(users??[]).filter((u:any)=>u.user_type==='CITIZEN').length},heatmap,availableCities:[...new Set((cityRows??[]).map((r:any)=>r.city).filter(Boolean))].sort()};
  },
  async supportTickets() {
    const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const users = await cards((data ?? []).map(t => t.user_id));
    return (data ?? []).map(t => ({ ...t, ticketType: t.ticket_type, createdAt: t.created_at, user: users.get(t.user_id) }));
  },
  async supportTicket(id: string) {
    const { data: ticket, error } = await supabase.from('support_tickets').select('*').eq('id', id).single();
    if (error) throw error;
    const { data: messages, error: messageError } = await supabase.from('support_ticket_messages').select('*').eq('ticket_id', id).order('created_at');
    if (messageError) throw messageError;
    return { ...ticket, createdAt: ticket.created_at, messages: (messages ?? []).map(m => ({ ...m, createdAt: m.created_at, isAdmin: m.is_admin })) };
  },
  async manageSupport(id: string, status?: string, message?: string) {
    const { error } = await supabase.rpc('admin_manage_support_ticket', { p_ticket_id: id, p_status: status ?? null, p_message: message?.trim() || null });
    if (error) throw error;
  },
  async reports() {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const users = await cards((data ?? []).flatMap(r => [r.reporter_id, r.reported_id]));
    return (data ?? []).map(r => ({ ...r, reporterId: r.reporter_id, reportedId: r.reported_id, jobId: r.job_id, createdAt: r.created_at, reporter: users.get(r.reporter_id), reported: users.get(r.reported_id) }));
  },
  async processReport(id: string, status: string, adminNotes: string, banUser = false) {
    const { error } = await supabase.rpc('admin_process_report', { p_report_id: id, p_status: status, p_admin_notes: adminNotes, p_ban_user: banUser });
    if (error) throw error;
  },
  async jobs(page: number, limit = 20) {
    const from = (page - 1) * limit;
    const { data, error, count } = await supabase.from('job_posts').select('*', { count: 'exact' }).is('deleted_at', null).order('created_at', { ascending: false }).range(from, from + limit - 1);
    if (error) throw error;
    return { data: data ?? [], hasMore: from + (data?.length ?? 0) < (count ?? 0) };
  },
  async deleteJob(id: string) {
    const { error } = await supabase.rpc('admin_delete_job', { p_job_id: id });
    if (error) throw error;
  },
};

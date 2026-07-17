import { supabase } from './supabase';

const cards = async (ids: string[]) => {
  if (!ids.length) return new Map<string, any>();
  const { data, error } = await supabase.from('users').select('id,full_name,email,phone,user_type').in('id', [...new Set(ids)]);
  if (error) throw error;
  return new Map((data ?? []).map(u => [u.id, { fullName: u.full_name, email: u.email, phone: u.phone, userType: u.user_type }]));
};

const mapAdminJob = (job: any) => ({
  ...job,
  citizenId: job.citizen_id,
  serviceCategory: job.service_category,
  urgencyLevel: job.urgency_level,
  estimatedBudget: job.estimated_budget == null ? null : Number(job.estimated_budget),
  budgetRange: job.budget_range,
  preferredTime: job.preferred_time,
  assignedElectricianId: job.assigned_electrician_id,
  acceptedBidId: job.accepted_bid_id,
  viewCount: Number(job.view_count || 0),
  bidCount: Number(job.bid_count || 0),
  createdAt: job.created_at,
  updatedAt: job.updated_at,
  completedAt: job.completed_at,
  cancelledAt: job.cancelled_at,
});

export const adminService = {
  async users(filters: { search?: string; userType?: string; city?: string; district?: string; serviceCategory?: string; page: number; limit: number }) {
    const { data, error } = await supabase.rpc('admin_list_users', {
      p_search: filters.search?.trim() || null,
      p_user_type: filters.userType || 'ALL',
      p_city: filters.city?.trim() || null,
      p_district: filters.district?.trim() || null,
      p_service_category: filters.serviceCategory?.trim() || null,
      p_page: filters.page,
      p_limit: filters.limit,
    });
    if (error) throw error;
    const result = (data ?? {}) as any;
    return {
      users: (result.users ?? []).map((user: any) => ({
        ...user,
        creditBalance: Number(user.creditBalance || 0),
        completedJobsCount: Number(user.completedJobsCount || 0),
      })),
      totalCount: Number(result.totalCount || 0),
      totalPages: Number(result.totalPages || 1),
    };
  },
  async setUserActive(id:string,value:boolean){ const {error}=await supabase.rpc('admin_set_user_active',{p_user_id:id,p_is_active:value}); if(error) throw error; },
  async createImpersonation(id: string) {
    const { data, error } = await supabase.functions.invoke('admin-impersonate-user', {
      body: { action: 'start', userId: id },
    });
    if (error) {
      let details: any = null;
      try { details = await (error as any).context?.json?.(); } catch {}
      throw new Error(details?.message || details?.error || error.message || 'Kullanıcı oturumu oluşturulamadı.');
    }
    if (!data?.success || !data?.tokenHash || !data?.expiresAt || !data?.sessionId) {
      throw new Error(data?.message || data?.error || 'Kullanıcı oturumu oluşturulamadı.');
    }
    return data as { success: true; tokenHash: string; expiresAt: string; sessionId: string };
  },
  async deleteUser(id:string,dryRun=false){
    const {data,error}=await supabase.functions.invoke('admin-delete-user',{body:{userId:id,dryRun}});
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
    const pending = (data??[]).filter((p:any)=>p.verification_documents?.path);
    const paths = pending.map((p:any)=>String(p.verification_documents.path));
    const signedUrls = new Map<string, string>();
    if (paths.length) {
      const { data: signed, error: signedError } = await supabase.storage
        .from('verification-documents')
        .createSignedUrls(paths, 60 * 30);
      if (signedError) throw signedError;
      (signed ?? []).forEach((item: any, index: number) => {
        if (item?.signedUrl) signedUrls.set(paths[index], item.signedUrl);
      });
    }
    return pending.map((p:any)=>({
      userId:p.user_id,
      serviceCategory:p.service_category,
      licenseNumber:p.license_number,
      emoNumber:p.emo_number,
      smmNumber:p.smm_number,
      verificationDocuments:{
        ...p.verification_documents,
        documentUrl:signedUrls.get(String(p.verification_documents.path)) ?? null,
      },
      user:{id:p.users.id,fullName:p.users.full_name,email:p.users.email,phone:p.users.phone}
    }));
  },
  async processVerification(id:string,status:string,reason?:string){ const {error}=await supabase.rpc('admin_process_verification',{p_user_id:id,p_status:status,p_reason:reason??null}); if(error) throw error; },
  async dashboardStats(){
    const { data, error } = await supabase.rpc('admin_statistics_snapshot', { p_city: null });
    if (error) throw error;
    const snapshot = (data ?? {}) as any;
    const kpis = snapshot.kpis ?? {};
    return {
      totalUsers: Number(kpis.registeredUsers || 0),
      totalElectricians: Number(kpis.totalElectricians || 0),
      totalCitizens: Number(kpis.totalCitizens || 0),
      activeJobs: Number(kpis.activeJobs || 0),
      completedJobs: Number(kpis.completedJobs || 0),
      pendingVerifications: Number(kpis.pendingVerifications || 0),
      totalRevenue: Number(kpis.listPriceRevenue || 0),
      successfulPurchases: Number(kpis.successfulPurchases || 0),
      pendingPurchases: Number(kpis.pendingPurchases || 0),
      generatedAt: snapshot.generatedAt as string | undefined,
    };
  },
  async detailedStats(city='ALL') {
    const { data, error } = await supabase.rpc('admin_statistics_snapshot', {
      p_city: city === 'ALL' ? null : city,
    });
    if (error) throw error;
    const snapshot = (data ?? {}) as any;
    const kpis = snapshot.kpis ?? {};
    return {
      ...snapshot,
      kpis: {
        registeredUsers: Number(kpis.registeredUsers || 0),
        totalCitizens: Number(kpis.totalCitizens || 0),
        totalElectricians: Number(kpis.totalElectricians || 0),
        pendingVerifications: Number(kpis.pendingVerifications || 0),
        activeJobs: Number(kpis.activeJobs || 0),
        completedJobs: Number(kpis.completedJobs || 0),
        successfulPurchases: Number(kpis.successfulPurchases || 0),
        pendingPurchases: Number(kpis.pendingPurchases || 0),
        listPriceRevenue: Number(kpis.listPriceRevenue || 0),
      },
      liveData: {
        activeUstalar: Number(snapshot.liveData?.activeUstalar || 0),
        activeCitizens: Number(snapshot.liveData?.activeCitizens || 0),
      },
      serviceDistribution: snapshot.serviceDistribution ?? [],
      districtDistribution: snapshot.districtDistribution ?? [],
      heatmap: snapshot.heatmap ?? [],
      availableCities: snapshot.availableCities ?? [],
    };
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
    const users = await cards([ticket.user_id]);
    return { ...ticket, ticketType: ticket.ticket_type, createdAt: ticket.created_at, user: users.get(ticket.user_id), messages: (messages ?? []).map(m => ({ ...m, createdAt: m.created_at, isAdmin: m.is_admin })) };
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
  async jobs(page: number, limit = 20, search?: string) {
    const { data, error } = await supabase.rpc('admin_list_jobs', {
      p_search: search?.trim() || null,
      p_page: page,
      p_limit: limit,
    });
    if (error) throw error;
    const result = (data ?? {}) as any;
    return {
      data: (result.jobs ?? []).map(mapAdminJob),
      hasMore: Number(result.page || page) < Number(result.totalPages || 1),
      totalCount: Number(result.totalCount || 0),
    };
  },
  async deleteJob(id: string) {
    const { error } = await supabase.rpc('admin_delete_job', { p_job_id: id });
    if (error) throw error;
  },
};

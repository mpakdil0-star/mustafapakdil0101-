import { supabase } from './supabase';

const sessionUser = async () => {
  const {data:{user},error}=await supabase.auth.getUser(); if(error||!user) throw error??new Error('Oturum gerekli');
  const {data,error:profileError}=await supabase.from('users').select('id,user_type').eq('id',user.id).single(); if(profileError) throw profileError;
  return data;
};

export const userInsightsService={
  async electricianStats(){
    const user=await sessionUser();
    const [{data:bids,error:bidError},{data:profile,error:profileError}]=await Promise.all([
      supabase.from('bids').select('amount,status,job_posts(status,category,completed_at)').eq('electrician_id',user.id),
      supabase.from('electrician_profiles').select('rating_average,total_reviews').eq('user_id',user.id).single()
    ]);
    if(bidError||profileError) throw bidError||profileError;
    const all=bids??[]; const accepted=all.filter((b:any)=>b.status==='ACCEPTED');
    const completed=accepted.filter((b:any)=>b.job_posts?.status==='COMPLETED');
    const activeJobs=accepted.filter((b:any)=>['IN_PROGRESS','PENDING_CONFIRMATION'].includes(b.job_posts?.status));
    const categoryCounts:Record<string,number>={}; completed.forEach((b:any)=>{const c=b.job_posts?.category||'Diğer';categoryCounts[c]=(categoryCounts[c]||0)+1;});
    const days=['Paz','Pzt','Sal','Çar','Per','Cum','Cmt']; const today=new Date();
    const weeklyEarnings=Array.from({length:7},(_,index)=>{const day=new Date(today);day.setDate(today.getDate()-(6-index));const key=day.toISOString().slice(0,10);const amount=completed.filter((b:any)=>b.job_posts?.completed_at?.slice(0,10)===key).reduce((s:number,b:any)=>s+Number(b.amount),0);return{day:days[day.getDay()],amount};});
    return {totalBids:all.length,activeBids:all.filter((b:any)=>b.status==='PENDING').length,activeJobs:activeJobs.length,completedJobs:completed.length,totalEarnings:completed.reduce((s:number,b:any)=>s+Number(b.amount),0),rating:Number(profile?.rating_average||0),reviewCount:profile?.total_reviews||0,weeklyEarnings,categoryDistribution:Object.entries(categoryCounts).map(([category,count])=>({category,count})).sort((a,b)=>b.count-a.count).slice(0,5)};
  },
  async jobHistory(){
    const user=await sessionUser();
    let query=supabase.from('job_posts').select('*').in('status',['COMPLETED','CANCELLED']).is('deleted_at',null).order('updated_at',{ascending:false}).limit(50);
    query=user.user_type==='ELECTRICIAN'?query.eq('assigned_electrician_id',user.id):query.eq('citizen_id',user.id);
    const {data:jobs,error}=await query; if(error) throw error; const rows=jobs??[]; if(!rows.length)return[];
    const ids=rows.map((j:any)=>j.id);
    const [{data:bids,error:bidError},{data:reviews,error:reviewError}]=await Promise.all([
      supabase.from('bids').select('job_post_id,electrician_id,amount,status').in('job_post_id',ids).eq('status','ACCEPTED'),
      supabase.from('reviews').select('job_post_id,rating,comment').in('job_post_id',ids)
    ]); if(bidError||reviewError) throw bidError||reviewError;
    const otherIds=rows.flatMap((j:any)=>[j.citizen_id,j.assigned_electrician_id]).filter(Boolean);
    const {data:cards,error:cardError}=await supabase.from('user_cards').select('*').in('id',[...new Set(otherIds)]);if(cardError)throw cardError;
    const cardMap=new Map((cards??[]).map((c:any)=>[c.id,{id:c.id,fullName:c.full_name,profileImageUrl:c.profile_image_url}]));
    return rows.map((j:any)=>{const bid=(bids??[]).find((b:any)=>b.job_post_id===j.id);const review=(reviews??[]).find((r:any)=>r.job_post_id===j.id);return{id:j.id,title:j.title,category:j.category,status:j.status,completedAt:j.completed_at,cancelledAt:j.cancelled_at,cancellationReason:j.cancellation_reason,createdAt:j.created_at,electrician:user.user_type==='CITIZEN'?cardMap.get(j.assigned_electrician_id)||null:null,citizen:user.user_type==='ELECTRICIAN'?cardMap.get(j.citizen_id)||null:null,finalPrice:bid?Number(bid.amount):null,hasReview:!!review,rating:review?.rating??null};});
  }
};

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const costs:Record<string,{min:number;max:number;note:string}>={
  elektrik:{min:500,max:3000,note:'İşin kapsamına ve malzemeye göre değişir'},tesisat:{min:500,max:3000,note:'Kaçak ve parça durumuna göre değişir'},cilingir:{min:300,max:1500,note:'Kapı ve kilit tipine göre değişir'},klima:{min:800,max:2500,note:'Bakım, gaz ve montaja göre değişir'},'beyaz-esya':{min:500,max:2500,note:'Parça ve işçiliğe göre değişir'},'kombi-servis':{min:500,max:4000,note:'Arıza ve değişen parçaya göre değişir'},temizlik:{min:500,max:2000,note:'Alan ve temizlik türüne göre değişir'},'boya-badana':{min:1500,max:6000,note:'Metrekare ve malzemeye göre değişir'},nakliyat:{min:2000,max:8000,note:'Mesafe ve eşya miktarına göre değişir'},'kucuk-nakliye':{min:500,max:2000,note:'Mesafe ve parça sayısına göre değişir'},'mobilya-montaj':{min:300,max:1500,note:'Montaj zorluğuna göre değişir'},'koltuk-hali':{min:300,max:1500,note:'Adet ve metrekareye göre değişir'},asansor:{min:1000,max:5000,note:'Bakım veya parça değişimine göre değişir'},'bocek-ilaclama':{min:400,max:1500,note:'Alan ve haşere türüne göre değişir'},'guvenlik-kamera':{min:1500,max:6000,note:'Kamera sayısı ve altyapıya göre değişir'}};

const fallback=(message:string,userType:string)=>{
  const m=message.toLocaleLowerCase('tr-TR');
  if(/duman|yanık|alev|yangın|çarp|kıvılcım|gaz kokusu|su baskını/.test(m)) return '🚨 ACİL: **Önce can güvenliğinizi sağlayın; elektriği veya gazı güvenli biçimde kapatın, bölgeden uzaklaşın ve 112’yi arayın.** Kendiniz müdahale etmeyin.';
  if(userType==='ELECTRICIAN'&&/teklif|fiyat hazırla/.test(m)) return 'İş kapsamını, malzeme listesini ve tahmini süreyi netleştirin.\n\n[TEKLİF ŞABLONU]\n{"items":[{"desc":"İşçilik: Keşif ve uygulama","amount":800},{"desc":"Malzeme: Gerekli parçalar","amount":500}],"total":1300,"note":"Nihai tutar keşif sonrası netleşir.","validity":"Bu teklif 7 gün geçerlidir."}';
  const category=m.includes('su')||m.includes('tesisat')?'tesisat':m.includes('kilit')||m.includes('kapı')?'cilingir':m.includes('klima')?'klima':m.includes('kombi')?'kombi-servis':'elektrik';
  return `Sorunun ne zamandır devam ettiğini, hangi cihaz veya hatta oluştuğunu ve varsa ses/koku/uyarı kodunu paylaşır mısınız? Güvenli değilse müdahale etmeyin.\n\n[TEŞHİS RAPORU]\n{"category":"${category}","subCategory":"diger","title":"Arıza kontrolü ve onarım","description":"Kullanıcının bildirdiği arızanın yerinde kontrol edilmesi gerekiyor."}`;
};

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')!;const anon=Deno.env.get('SUPABASE_ANON_KEY')!;const authorization=request.headers.get('Authorization')??'';
    const client=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const {data:{user},error}=await client.auth.getUser();if(error||!user)return reply({error:'UNAUTHORIZED'},401);
    const body=await request.json();
    if(body.action==='cost'){
      const category=String(body.category||'').toLowerCase().trim();const item=costs[category];
      return reply({success:true,data:item?{found:true,category,min:item.min,max:item.max,unit:'TL',note:item.note,label:`${item.min.toLocaleString('tr-TR')} – ${item.max.toLocaleString('tr-TR')} TL`}:{found:false,message:'Bu kategori için tahmin bulunamadı.'}});
    }
    const message=String(body.message||'');if(!message&&!body.image)return reply({error:'MESSAGE_REQUIRED'},400);
    const {data:profile}=await client.from('users').select('user_type').eq('id',user.id).single();const userType=profile?.user_type||'CITIZEN';
    const key=Deno.env.get('GEMINI_API_KEY');if(!key)return reply({success:true,data:{text:fallback(message,userType),fallback:true}});
    const system=userType==='ELECTRICIAN'?'Türkçe yanıt veren profesyonel usta asistanısın. Teknik güvenliği önceliklendir; teklif istenirse kalemli JSON TEKLİF ŞABLONU ekle.':'Türkçe yanıt veren ev arızası teşhis asistanısın. Tehlikede önce ACİL güvenlik uyarısı ver. Sorunu anladığında JSON TEŞHİS RAPORU ekle.';
    const contents=[...(Array.isArray(body.history)?body.history.map((h:any)=>({role:h.role==='model'?'model':'user',parts:[{text:String(h.text||'')}]})):[]),{role:'user',parts:[...(message?[{text:message}]:[]),...(body.image?.base64?[{inlineData:{mimeType:body.image.mimeType,data:body.image.base64}}]:[])]}];
    const model=Deno.env.get('GEMINI_MODEL')||'gemini-2.0-flash';
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents,systemInstruction:{parts:[{text:system}]},generationConfig:{temperature:.7,maxOutputTokens:1024}})});
    if(!response.ok)throw new Error(`GEMINI_${response.status}`);const json=await response.json();const text=json.candidates?.[0]?.content?.parts?.[0]?.text;if(!text)throw new Error('EMPTY_RESPONSE');
    return reply({success:true,data:{text,fallback:false}});
  }catch(error){console.error(error);return reply({error:'AI_PROCESSING_FAILED'},500);}
});

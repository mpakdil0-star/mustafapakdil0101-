import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json' },
});

const costs: Record<string, { min: number; max: number; note: string }> = {
  elektrik: { min: 500, max: 3000, note: 'İşin kapsamına ve malzemeye göre değişir' },
  tesisat: { min: 500, max: 3000, note: 'Kaçak ve parça durumuna göre değişir' },
  cilingir: { min: 300, max: 1500, note: 'Kapı ve kilit tipine göre değişir' },
  klima: { min: 800, max: 2500, note: 'Bakım, gaz ve montaja göre değişir' },
  'beyaz-esya': { min: 500, max: 2500, note: 'Parça ve işçiliğe göre değişir' },
  'kombi-servis': { min: 500, max: 4000, note: 'Arıza ve değişen parçaya göre değişir' },
  temizlik: { min: 500, max: 2000, note: 'Alan ve temizlik türüne göre değişir' },
  'boya-badana': { min: 1500, max: 6000, note: 'Metrekare ve malzemeye göre değişir' },
  nakliyat: { min: 2000, max: 8000, note: 'Mesafe ve eşya miktarına göre değişir' },
  'kucuk-nakliye': { min: 500, max: 2000, note: 'Mesafe ve parça sayısına göre değişir' },
  'mobilya-montaj': { min: 300, max: 1500, note: 'Montaj zorluğuna göre değişir' },
  'koltuk-hali': { min: 300, max: 1500, note: 'Adet ve metrekareye göre değişir' },
  asansor: { min: 1000, max: 5000, note: 'Bakım veya parça değişimine göre değişir' },
  'bocek-ilaclama': { min: 400, max: 1500, note: 'Alan ve haşere türüne göre değişir' },
  'guvenlik-kamera': { min: 1500, max: 6000, note: 'Kamera sayısı ve altyapıya göre değişir' },
};

type FallbackIssue = {
  id: string;
  category: string;
  subCategory: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  safetyAction?: string;
  confidence: number;
};

const fallbackIssues = (message: string): FallbackIssue[] => {
  const value = message.toLocaleLowerCase('tr-TR');
  const definitions = [
    { match: /elektrik|priz|sigorta|kablo|kıvılcım|çarp|yanık/, category: 'elektrik', title: 'Elektrik arızası' },
    { match: /su|musluk|tesisat|kaçak|damla|gider/, category: 'tesisat', title: 'Su ve tesisat arızası' },
    { match: /kombi|kalorifer|petek|e\d{1,3}/, category: 'kombi-servis', title: 'Kombi ve ısınma arızası' },
    { match: /klima|soğutm|ısıtmıyor/, category: 'klima', title: 'Klima arızası' },
    { match: /kilit|anahtar|kapıda kald/, category: 'cilingir', title: 'Kilit ve kapı sorunu' },
    { match: /buzdolabı|çamaşır|bulaşık|fırın|beyaz eşya/, category: 'beyaz-esya', title: 'Beyaz eşya arızası' },
  ];

  const emergency = /duman|yanık|alev|yangın|çarp|kıvılcım|gaz kokusu|su baskını/.test(value);
  const matched = definitions.filter((definition) => definition.match.test(value));
  const selected = matched.length ? matched : [{ category: 'diger', title: 'Teknik servis ihtiyacı' }];

  return selected.map((definition, index) => ({
    id: `issue-${index + 1}`,
    category: definition.category,
    subCategory: 'diger',
    title: definition.title,
    description: 'Belirtilerin kaynağının güvenli biçimde yerinde kontrol edilmesi önerilir.',
    severity: emergency && index === 0 ? 'critical' : 'medium',
    safetyAction: emergency && index === 0
      ? 'Tehlikeli bölgeden uzaklaşın, güvenliyse ana enerji kaynağını kapatın ve kendiniz müdahale etmeyin.'
      : undefined,
    confidence: matched.length ? 0.72 : 0.35,
  }));
};

const fallback = (message: string, userType: string) => {
  const normalized = message.toLocaleLowerCase('tr-TR');
  if (userType === 'ELECTRICIAN' && /teklif|fiyat hazırla/.test(normalized)) {
    return 'İş kapsamını, adetleri, malzeme kalitesini ve tahmini süreyi netleştirdim. Nihai fiyatı keşif sonrası doğrulayın.\n\n[TEKLİF ŞABLONU]\n{"items":[{"desc":"İşçilik: Keşif ve uygulama","amount":800},{"desc":"Malzeme: Gerekli parçalar","amount":500}],"total":1300,"note":"Nihai tutar keşif sonrası netleşir.","validity":"Bu teklif 7 gün geçerlidir."}';
  }

  const issues = fallbackIssues(message);
  const urgent = issues.some((issue) => issue.severity === 'critical');
  const intro = urgent
    ? '🚨 ACİL: Önce can güvenliğinizi sağlayın. Tehlikeli alandan uzaklaşın ve kendiniz müdahale etmeyin.'
    : issues.length > 1
      ? `Mesajınızda ${issues.length} ayrı konu belirledim. Her birini aşağıda ayrı takip edebilirsiniz.`
      : 'Sorunu ön değerlendirmeye aldım. Ne zamandır devam ettiğini ve varsa ses, koku veya hata kodunu paylaşın.';
  return `${intro}\n\n[ARIZA LİSTESİ]\n${JSON.stringify({ issues })}`;
};

const CITIZEN_SYSTEM = `Sen İşBitir uygulamasındaki Türkçe konuşan arıza analiz asistanısın.
KURALLAR:
1. En son kullanıcı mesajı her zaman önceliklidir. Kullanıcı konu değiştirdiyse eski konuya cevap vermeyi bırak.
2. Kullanıcı tek mesajda birden fazla bağımsız arıza anlatırsa bunları ASLA tek teşhiste birleştirme. Her arızayı ayrı konu olarak ele al.
3. Belirsiz veya eksik bilgi varsa en fazla 3 kısa ve hedefli soru sor. Kesin teşhis iddiasında bulunma.
4. Elektrik çarpması, kıvılcım, duman, yangın, gaz kokusu veya su baskını varsa yanıtın başında 🚨 ACİL: yaz; önce güvenlik adımlarını ver ve kullanıcıya teknik müdahale yaptırma.
5. Fiyat, standart veya parça bilgisi uydurma. Yerinde kontrol gerektiğini açıkça belirt.
6. Yanıtı Türkçe, doğal, kısa başlıklı ve anlaşılır yaz.
7. Sorunlar yeterince anlaşıldığında yanıtın SONUNA tam olarak [ARIZA LİSTESİ] ekle ve ardından yalnızca geçerli JSON üret:
{"issues":[{"id":"issue-1","category":"elektrik","subCategory":"diger","title":"Kısa başlık","description":"İlana uygun nesnel açıklama","severity":"low|medium|high|critical","safetyAction":"Gerekliyse kısa güvenlik adımı","confidence":0.0}]}
Her bağımsız sorun için ayrı nesne oluştur. category alanında uygulama kategorilerinden en uygun olanı kullan: elektrik, tesisat, cilingir, klima, kombi-servis, beyaz-esya, temizlik, boya-badana, nakliyat, kucuk-nakliye, mobilya-montaj, koltuk-hali, asansor, bocek-ilaclama, guvenlik-kamera, diger.`;

const ELECTRICIAN_SYSTEM = `Sen İşBitir uygulamasındaki Türkçe konuşan profesyonel usta asistanısın.
KURALLAR:
1. En son kullanıcı mesajı önceliklidir; yeni konuya geçildiğinde eski işe takılı kalma.
2. Birden fazla teknik konu varsa ayrı başlıklarla yanıtla.
3. Ölçüm yapılmadan kesin teşhis, kesin fiyat veya mevzuat iddiasında bulunma. Enerji altında çalışma önermeme ve iş güvenliğini önceliklendirme zorunludur.
4. Teklif istendiğinde kapsam, işçilik, malzeme, hariç tutulanlar ve geçerlilik süresini açıkla; yanıtın sonunda [TEKLİF ŞABLONU] ve geçerli JSON kullan.
5. Müşteri mesajı istendiğinde profesyonel ve kısa bir metin üret; sonunda [MESAJ ŞABLONU] ve geçerli JSON kullan.
6. Teknik sorularda gerekli ölçüm veya keşif adımlarını sıralı biçimde ver. Türkçe, profesyonel ve uygulanabilir yaz.`;

const parseIssueList = (text: string): FallbackIssue[] => {
  const marker = '[ARIZA LİSTESİ]';
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return [];
  const raw = text.slice(markerIndex + marker.length).trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.issues) ? parsed.issues : [];
  } catch {
    return [];
  }
};

const formatForClient = (text: string, supportsMultiIssue: boolean) => {
  if (supportsMultiIssue) return text;
  const issues = parseIssueList(text);
  if (!issues.length) return text;
  const markerIndex = text.indexOf('[ARIZA LİSTESİ]');
  const visibleText = markerIndex >= 0 ? text.slice(0, markerIndex).trim() : text;
  const first = issues[0];
  const legacyReport = {
    category: first.category || 'diger',
    subCategory: first.subCategory || 'diger',
    title: first.title || 'Teknik servis ihtiyacı',
    description: first.description || 'Yerinde kontrol edilmesi önerilir.',
  };
  return `${visibleText}\n\n[TEŞHİS RAPORU]\n${JSON.stringify(legacyReport)}`;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authorization = request.headers.get('Authorization') ?? '';
    const client = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return reply({ error: 'UNAUTHORIZED' }, 401);

    const body = await request.json();
    if (body.action === 'cost') {
      const category = String(body.category || '').toLowerCase().trim();
      const item = costs[category];
      return reply({
        success: true,
        data: item
          ? { found: true, category, min: item.min, max: item.max, unit: 'TL', note: item.note, label: `${item.min.toLocaleString('tr-TR')} – ${item.max.toLocaleString('tr-TR')} TL` }
          : { found: false, message: 'Bu kategori için tahmin bulunamadı.' },
      });
    }

    const message = String(body.message || '').trim().slice(0, 4000);
    if (!message && !body.image) return reply({ error: 'MESSAGE_REQUIRED' }, 400);

    const { data: profile } = await client.from('users').select('user_type').eq('id', user.id).single();
    const userType = profile?.user_type || 'CITIZEN';
    const supportsMultiIssue = Array.isArray(body.capabilities) && body.capabilities.includes('multi_issue_v2');
    let conversationId: string | null = typeof body.conversationId === 'string' ? body.conversationId : null;

    // Persistence is best-effort so a not-yet-applied migration never blocks the assistant.
    if (conversationId) {
      const { data: existing } = await client.from('ai_conversations').select('id').eq('id', conversationId).maybeSingle();
      if (!existing) conversationId = null;
    }
    if (!conversationId) {
      const { data: created } = await client.from('ai_conversations').insert({
        user_id: user.id,
        user_role: userType,
        title: message.slice(0, 80) || 'Fotoğraflı arıza analizi',
      }).select('id').maybeSingle();
      conversationId = created?.id || null;
    }
    if (conversationId) {
      await client.from('ai_messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'user',
        content: message || '[Fotoğraf gönderildi]',
        has_image: Boolean(body.image?.base64),
      });
    }

    const finalize = async (text: string, isFallback: boolean) => {
      const issues = parseIssueList(text);
      if (conversationId) {
        await client.from('ai_messages').insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'model',
          content: text,
          structured_output: issues.length ? { issues } : null,
          is_fallback: isFallback,
        });
        if (issues.length) {
          await client.from('ai_issues').upsert(issues.map((issue, index) => ({
            conversation_id: conversationId,
            user_id: user.id,
            issue_key: String(issue.id || `issue-${index + 1}`),
            category: String(issue.category || 'diger'),
            sub_category: issue.subCategory ? String(issue.subCategory) : null,
            title: String(issue.title || 'Teknik servis ihtiyacı'),
            description: issue.description ? String(issue.description) : null,
            severity: ['low', 'medium', 'high', 'critical'].includes(String(issue.severity)) ? issue.severity : 'medium',
            safety_action: issue.safetyAction ? String(issue.safetyAction) : null,
            confidence: typeof issue.confidence === 'number' ? issue.confidence : null,
            status: index === 0 ? 'active' : 'open',
            updated_at: new Date().toISOString(),
          })), { onConflict: 'conversation_id,issue_key' });
        }
        await client.from('ai_conversations').update({
          active_issue_id: issues[0]?.id || null,
          updated_at: new Date().toISOString(),
        }).eq('id', conversationId);
      }
      return reply({
        success: true,
        data: {
          text: formatForClient(text, supportsMultiIssue),
          fallback: isFallback,
          conversationId: conversationId || undefined,
        },
      });
    };

    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return await finalize(fallback(message, userType), true);

    const history = Array.isArray(body.history) ? body.history.slice(-20) : [];
    const contents = [
      ...history.map((item: { role?: string; text?: string }) => ({
        role: item.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(item.text || '').slice(0, 4000) }],
      })),
      {
        role: 'user',
        parts: [
          ...(message ? [{ text: message }] : []),
          ...(body.image?.base64 ? [{ inlineData: { mimeType: body.image.mimeType || 'image/jpeg', data: body.image.base64 } }] : []),
        ],
      },
    ];

    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: userType === 'ELECTRICIAN' ? ELECTRICIAN_SYSTEM : CITIZEN_SYSTEM }] },
        generationConfig: {
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingLevel: 'low' },
        },
      }),
    });

    if (!response.ok) throw new Error(`GEMINI_${response.status}`);
    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim();
    if (!text) throw new Error('EMPTY_RESPONSE');
    return await finalize(text, false);
  } catch (error) {
    console.error(error);
    return reply({ error: 'AI_PROCESSING_FAILED' }, 500);
  }
});

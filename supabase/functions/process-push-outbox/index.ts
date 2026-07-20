import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

type OutboxRow = {
  id: string;
  notification_id: string | null;
  user_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempt_count: number;
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return response({ error: 'SERVER_CONFIGURATION_ERROR' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: runtimeConfig, error: configError } = await admin
    .from('push_runtime_config').select('cron_secret').eq('id', 1).single();
  const suppliedSecret = request.headers.get('x-cron-secret');
  if (configError || !suppliedSecret || suppliedSecret !== runtimeConfig?.cron_secret) {
    return response({ error: 'UNAUTHORIZED' }, 401);
  }

  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  const expoHeaders = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
    ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
  };

  // Expo receipts are generally available after delivery processing. Check
  // tickets older than 15 minutes and disable permanently invalid devices.
  const receiptCutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: pendingReceipts } = await admin.from('push_delivery_tickets')
    .select('id,expo_ticket_id,expo_push_token')
    .not('expo_ticket_id', 'is', null)
    .is('receipt_checked_at', null)
    .lt('created_at', receiptCutoff)
    .limit(300);
  let receiptsChecked = 0;
  if (pendingReceipts?.length) {
    const receiptResponse = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST', headers: expoHeaders,
      body: JSON.stringify({ ids: pendingReceipts.map((ticket) => ticket.expo_ticket_id) }),
    });
    if (receiptResponse.ok) {
      const receiptPayload = await receiptResponse.json();
      for (const ticket of pendingReceipts) {
        const receipt = receiptPayload.data?.[ticket.expo_ticket_id as string];
        if (!receipt) continue;
        await admin.from('push_delivery_tickets').update({
          receipt_status: receipt.status,
          receipt_checked_at: new Date().toISOString(),
          error_code: receipt.details?.error || null,
          error_message: receipt.message || null,
        }).eq('id', ticket.id);
        if (receipt.details?.error === 'DeviceNotRegistered') {
          await admin.from('push_tokens').update({ is_active: false })
            .eq('expo_push_token', ticket.expo_push_token);
        }
        receiptsChecked += 1;
      }
    }
  }

  const { data: claimed, error: claimError } = await admin.rpc('claim_notification_outbox', { batch_size: 50 });
  if (claimError) return response({ error: claimError.message }, 500);

  const outboxRows = (claimed || []) as OutboxRow[];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of outboxRows) {
    try {
      const [{ data: notification }, { data: user }, { data: tokens }] = await Promise.all([
        item.notification_id
          ? admin.from('notifications').select('title,message,action_url').eq('id', item.notification_id).maybeSingle()
          : Promise.resolve({ data: null }),
        admin.from('users').select('notification_settings').eq('id', item.user_id).maybeSingle(),
        admin.from('push_tokens').select('expo_push_token').eq('user_id', item.user_id).eq('is_active', true),
      ]);

      const notificationSettings = (user?.notification_settings ?? {}) as Record<string, unknown>;
      const pushEnabled = typeof notificationSettings.pushEnabled === 'boolean'
        ? notificationSettings.pushEnabled
        : notificationSettings.push !== false;
      if (!pushEnabled || !tokens?.length) {
        await admin.from('notification_outbox').update({
          status: 'sent', processed_at: new Date().toISOString(), last_error: pushEnabled ? 'NO_ACTIVE_DEVICE' : 'PUSH_DISABLED',
        }).eq('id', item.id);
        skipped += 1;
        continue;
      }

      const messages = tokens.map(({ expo_push_token }) => ({
        to: expo_push_token,
        sound: 'default',
        title: notification?.title || String(item.payload.title || 'İşBitir'),
        body: notification?.message || String(item.payload.message || 'Yeni bir bildiriminiz var.'),
        data: { ...item.payload, actionUrl: notification?.action_url || undefined },
        priority: 'high',
        channelId: 'default',
      }));

      const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: expoHeaders,
        body: JSON.stringify(messages),
      });

      if (!pushResponse.ok) throw new Error(`EXPO_HTTP_${pushResponse.status}`);
      const pushResult = await pushResponse.json();
      const tickets = Array.isArray(pushResult.data) ? pushResult.data : [pushResult.data];
      const ticketRows = tickets.map((ticket: any, index: number) => ({
        outbox_id: item.id,
        user_id: item.user_id,
        expo_push_token: tokens[index]?.expo_push_token || '',
        expo_ticket_id: ticket?.id || null,
        status: ticket?.status === 'ok' ? 'ok' : 'error',
        error_code: ticket?.details?.error || null,
        error_message: ticket?.message || null,
      }));
      await admin.from('push_delivery_tickets').insert(ticketRows);

      const hasSuccess = tickets.some((ticket: any) => ticket?.status === 'ok');
      if (!hasSuccess) throw new Error(tickets[0]?.details?.error || tickets[0]?.message || 'EXPO_REJECTED');

      await admin.from('notification_outbox').update({ status: 'sent', processed_at: new Date().toISOString() }).eq('id', item.id);
      if (item.notification_id) await admin.from('notifications').update({ push_sent: true }).eq('id', item.notification_id);
      sent += 1;
    } catch (error) {
      const retryMinutes = Math.min(2 ** Math.max(item.attempt_count, 1), 60);
      await admin.from('notification_outbox').update({
        status: 'failed',
        last_error: error instanceof Error ? error.message.slice(0, 500) : 'UNKNOWN_ERROR',
        next_attempt_at: new Date(Date.now() + retryMinutes * 60_000).toISOString(),
      }).eq('id', item.id);
      failed += 1;
    }
  }

  return response({ claimed: outboxRows.length, sent, failed, skipped, receiptsChecked });
});

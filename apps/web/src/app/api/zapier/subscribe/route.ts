import { authenticateApiKey } from '@/lib/api-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * REST Hook subscribe endpoint. Zapier POSTs { target_url } here when a Zap
 * is turned on. We store it and fan-out to all subscriptions when a meeting
 * completes.
 */
export async function POST(req: NextRequest) {
  const userId = await authenticateApiKey(req);
  if (!userId) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const targetUrl = typeof body.target_url === 'string' ? body.target_url : '';
  if (!targetUrl.startsWith('https://')) {
    return NextResponse.json({ error: 'target_url must be https' }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { data, error } = await admin
    .from('webhook_subscriptions')
    .insert({
      user_id: userId,
      target_url: targetUrl,
      event_type: 'meeting.completed',
      source: 'zapier',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

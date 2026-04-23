import { authenticateApiKey } from '@/lib/api-auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Zapier's "test auth" endpoint. Hits this during Zap setup to verify the
 * user's API key. Returns the user's email so Zapier can display a
 * "Connected as X" label in the UI.
 */
export async function GET(req: NextRequest) {
  const userId = await authenticateApiKey(req);
  if (!userId) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const { data: userRow } = await admin.auth.admin.getUserById(userId);
  return NextResponse.json({
    id: userId,
    email: userRow.user?.email || null,
  });
}

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POC-only endpoint: returns the Deepgram API key to the authenticated
 * webview so it can open a WebSocket to Deepgram directly. Will be
 * replaced with scoped/ephemeral tokens before production ships.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'DEEPGRAM_API_KEY not configured' }, { status: 500 });
  }
  return NextResponse.json({ key });
}

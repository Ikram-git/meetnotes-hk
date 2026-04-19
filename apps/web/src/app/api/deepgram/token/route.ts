import { createClient } from '@/lib/supabase/server';
import { createClient as createDeepgram } from '@deepgram/sdk';
import { NextResponse } from 'next/server';

/**
 * Mints a short-lived Deepgram JWT (~30s TTL) that the webview can use
 * to open a WebSocket directly to Deepgram's streaming API. The master
 * API key never leaves the server.
 *
 * The JWT is only validated at WebSocket handshake — once connected,
 * the stream stays open beyond the token's expiry.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'DEEPGRAM_API_KEY not configured' }, { status: 500 });
  }

  try {
    const dg = createDeepgram(apiKey);
    const { result, error } = await dg.auth.grantToken();
    if (error) {
      console.error('[DeepgramToken] grantToken error:', error);
      return NextResponse.json({ error: error.message || 'Failed to mint token' }, { status: 500 });
    }
    return NextResponse.json({
      token: result.access_token,
      expires_in: result.expires_in,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DeepgramToken] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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
    if (error || !result?.access_token) {
      const errMsg = error?.message || 'No access_token returned';
      console.warn(
        `[DeepgramToken] grantToken failed (${errMsg}) — falling back to raw key. ` +
          'Upgrade your Deepgram key to "Member" scope or higher to mint short-lived tokens.',
      );
      return NextResponse.json({ token: apiKey, expires_in: 0, fallback: true });
    }
    return NextResponse.json({
      token: result.access_token,
      expires_in: result.expires_in,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[DeepgramToken] exception (${msg}) — falling back to raw key.`);
    return NextResponse.json({ token: apiKey, expires_in: 0, fallback: true });
  }
}

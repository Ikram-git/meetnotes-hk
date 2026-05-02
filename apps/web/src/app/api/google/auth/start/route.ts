import { createClient } from '@/lib/supabase/server';
import { buildOAuthClient, getRedirectUri, GOOGLE_SCOPES } from '@/lib/google/client';
import { getGates, tierUpgradeMessage } from '@/lib/billing/gates';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Kicks off the Google OAuth flow. Returns a consent URL the client
 * should redirect to. Passes the Supabase user id in `state` so the
 * callback can tie the tokens back to the right user without needing
 * cookies to survive the Google redirect.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();
  if (!getGates(profile?.subscription_tier).calendarSync) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${appUrl}/settings?upgrade=calendar&message=${encodeURIComponent(tierUpgradeMessage('Google Calendar integration', 'pro'))}`,
    );
  }

  try {
    const redirectUri = getRedirectUri(req);
    const client = buildOAuthClient(redirectUri);
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      state: user.id,
      include_granted_scopes: true,
    });
    return NextResponse.redirect(authUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

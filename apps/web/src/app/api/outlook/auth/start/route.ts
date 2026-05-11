import { createClient } from '@/lib/supabase/server';
import { buildAuthorizeUrl, getRedirectUri } from '@/lib/outlook/client';
import { getGates, tierUpgradeMessage } from '@/lib/billing/gates';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Kicks off the Microsoft OAuth flow. Passes the Supabase user id in
 * `state` so the callback can tie the tokens back to the right user
 * without relying on cookies surviving the Microsoft redirect.
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
      `${appUrl}/settings?upgrade=calendar&message=${encodeURIComponent(tierUpgradeMessage('Outlook Calendar integration', 'pro'))}`,
    );
  }

  try {
    const redirectUri = getRedirectUri(req);
    const authUrl = buildAuthorizeUrl({ redirectUri, state: user.id });
    return NextResponse.redirect(authUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

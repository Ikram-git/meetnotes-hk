import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, getMeInfo, getRedirectUri } from '@/lib/outlook/client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Microsoft redirects the user here with ?code=... after consent.
 * Exchange the code for tokens, fetch the user's profile via Graph,
 * upsert into outlook_integrations.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // Supabase user id
  const err = url.searchParams.get('error');
  const errDesc = url.searchParams.get('error_description');

  const settingsUrl = new URL('/settings', url.origin);

  if (err) {
    settingsUrl.searchParams.set('outlook', 'denied');
    if (errDesc) settingsUrl.searchParams.set('outlook_error', errDesc);
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state) {
    settingsUrl.searchParams.set('outlook', 'missing_params');
    return NextResponse.redirect(settingsUrl);
  }

  // Verify state matches the current session user.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== state) {
    settingsUrl.searchParams.set('outlook', 'state_mismatch');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const redirectUri = getRedirectUri(req);
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.access_token || !tokens.refresh_token) {
      settingsUrl.searchParams.set('outlook', 'no_refresh_token');
      return NextResponse.redirect(settingsUrl);
    }

    const info = await getMeInfo(tokens.access_token);

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      settingsUrl.searchParams.set('outlook', 'missing_service_key');
      return NextResponse.redirect(settingsUrl);
    }
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: upsertError } = await admin
      .from('outlook_integrations')
      .upsert({
        user_id: user.id,
        ms_oid: info.id,
        email: info.mail || info.userPrincipalName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scopes: (tokens.scope || '').split(' '),
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('[OutlookCallback] upsert failed:', upsertError.message);
      settingsUrl.searchParams.set('outlook', 'db_error');
      return NextResponse.redirect(settingsUrl);
    }

    settingsUrl.searchParams.set('outlook', 'connected');
    return NextResponse.redirect(settingsUrl);
  } catch (caught) {
    const msg = caught instanceof Error ? caught.message : String(caught);
    console.error('[OutlookCallback] failed:', msg);
    settingsUrl.searchParams.set('outlook', 'error');
    settingsUrl.searchParams.set('outlook_error', msg);
    return NextResponse.redirect(settingsUrl);
  }
}

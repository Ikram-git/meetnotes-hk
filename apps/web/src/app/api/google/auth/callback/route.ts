import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { buildOAuthClient, getRedirectUri } from '@/lib/google/client';
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Google redirects the user here with ?code=... after consent. We exchange
 * the code for tokens, fetch the user's Google email, and upsert into
 * google_integrations. The Supabase user id comes in via the state param
 * we signed when we built the consent URL.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // Supabase user id
  const err = url.searchParams.get('error');

  const settingsUrl = new URL('/settings', url.origin);

  if (err) {
    settingsUrl.searchParams.set('google', 'denied');
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state) {
    settingsUrl.searchParams.set('google', 'missing_params');
    return NextResponse.redirect(settingsUrl);
  }

  // Verify the state matches the current session user — so one user can't
  // finish another user's OAuth flow.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== state) {
    settingsUrl.searchParams.set('google', 'state_mismatch');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const redirectUri = getRedirectUri(req);
    const client = buildOAuthClient(redirectUri);
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      settingsUrl.searchParams.set('google', 'no_refresh_token');
      return NextResponse.redirect(settingsUrl);
    }
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data: info } = await oauth2.userinfo.get();

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      settingsUrl.searchParams.set('google', 'missing_service_key');
      return NextResponse.redirect(settingsUrl);
    }
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 55 * 60 * 1000).toISOString();

    const { error: upsertError } = await admin
      .from('google_integrations')
      .upsert({
        user_id: user.id,
        google_sub: info.id,
        email: info.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scopes: (tokens.scope || '').split(' '),
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error('[GoogleCallback] upsert failed:', upsertError.message);
      settingsUrl.searchParams.set('google', 'db_error');
      return NextResponse.redirect(settingsUrl);
    }

    settingsUrl.searchParams.set('google', 'connected');
    return NextResponse.redirect(settingsUrl);
  } catch (caught) {
    const msg = caught instanceof Error ? caught.message : String(caught);
    console.error('[GoogleCallback] failed:', msg);
    settingsUrl.searchParams.set('google', 'error');
    settingsUrl.searchParams.set('google_error', msg);
    return NextResponse.redirect(settingsUrl);
  }
}

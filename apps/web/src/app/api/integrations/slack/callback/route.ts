import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/settings/integrations?error=no_code', req.url));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/settings/integrations?error=not_configured', req.url));
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${appUrl}/api/integrations/slack/callback`,
      }),
    });

    const data = await response.json();
    if (!data.ok || !data.access_token) {
      throw new Error(data.error || 'Token exchange failed');
    }

    await supabase.from('integrations').upsert({
      user_id: user.id,
      provider: 'slack',
      access_token: data.access_token,
      provider_workspace_id: data.team?.id,
      provider_workspace_name: data.team?.name,
      metadata: { bot_user_id: data.bot_user_id, scope: data.scope },
    }, { onConflict: 'user_id,provider' });

    return NextResponse.redirect(new URL('/settings/integrations?success=slack', req.url));
  } catch (error) {
    console.error('[Slack OAuth]', error);
    return NextResponse.redirect(new URL('/settings/integrations?error=slack_failed', req.url));
  }
}

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/settings/integrations?error=no_code', req.url));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/settings/integrations?error=not_configured', req.url));
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${appUrl}/api/integrations/notion/callback`,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.access_token) {
      throw new Error(data.error || 'Token exchange failed');
    }

    // Upsert integration
    await supabase.from('integrations').upsert({
      user_id: user.id,
      provider: 'notion',
      access_token: data.access_token,
      provider_workspace_id: data.workspace_id,
      provider_workspace_name: data.workspace_name,
      metadata: { bot_id: data.bot_id, owner: data.owner },
    }, { onConflict: 'user_id,provider' });

    return NextResponse.redirect(new URL('/settings/integrations?success=notion', req.url));
  } catch (error) {
    console.error('[Notion OAuth]', error);
    return NextResponse.redirect(new URL('/settings/integrations?error=notion_failed', req.url));
  }
}

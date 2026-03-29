import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST — initiate OAuth
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Notion integration not configured' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/integrations/notion/callback`;
  const url = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&owner=user`;

  return NextResponse.json({ url });
}

// GET — check status
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase.from('integrations')
    .select('provider, provider_workspace_name, connected_at')
    .eq('user_id', user.id).eq('provider', 'notion').single();

  return NextResponse.json({ connected: !!data, workspace: data?.provider_workspace_name });
}

// DELETE — disconnect
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('integrations').delete().eq('user_id', user.id).eq('provider', 'notion');
  return NextResponse.json({ success: true });
}

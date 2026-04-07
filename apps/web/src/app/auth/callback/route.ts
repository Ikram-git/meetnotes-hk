import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to returnTo URL if present, otherwise home
  const returnTo = requestUrl.searchParams.get('returnTo');
  return NextResponse.redirect(new URL(returnTo || '/', requestUrl.origin));
}

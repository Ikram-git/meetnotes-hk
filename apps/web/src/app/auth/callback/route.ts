import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const returnTo = requestUrl.searchParams.get('returnTo') || '/meetings';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
      const url = new URL('/login', requestUrl.origin);
      url.searchParams.set('error', error.message);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.redirect(new URL(returnTo, requestUrl.origin));
}

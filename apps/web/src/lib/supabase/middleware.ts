import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes — accessible without login
  const publicPaths = ['/', '/login', '/signup', '/auth', '/privacy', '/terms', '/pricing', '/demo'];
  const isPublic = publicPaths.some(p =>
    p === '/' ? request.nextUrl.pathname === '/' : request.nextUrl.pathname.startsWith(p)
  );

  // Protected routes — redirect to login with return URL
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    const returnTo = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/signup'))
  ) {
    // Check if there's a returnTo URL
    const returnTo = request.nextUrl.searchParams.get('returnTo');
    const url = request.nextUrl.clone();
    url.pathname = returnTo || '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const serverSupabase = await createServerClient();

  // Auth check
  let { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (token) {
      const { data } = await serverSupabase.auth.getUser(token);
      user = data.user;
    }
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { storagePath, contentType } = await req.json();
  if (!storagePath) return NextResponse.json({ error: 'storagePath required' }, { status: 400 });

  // Use service role client — bypasses free plan upload limits
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await adminSupabase.storage
    .from('meeting-audio')
    .createSignedUploadUrl(storagePath);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token });
}

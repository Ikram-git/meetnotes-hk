import { createClient } from '@/lib/supabase/server';
import { generateApiKey } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * List the current user's API keys (metadata only — never the plaintext).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, last_used_at, created_at, revoked_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data });
}

/**
 * Create a new API key. Returns the plaintext ONCE — the frontend must warn
 * the user to save it now.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'API key';

  const { plaintext, prefix, hash } = generateApiKey();
  const { data, error } = await supabase
    .from('api_keys')
    .insert({ user_id: user.id, name, key_hash: hash, key_prefix: prefix })
    .select('id, name, key_prefix, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    name: data.name,
    prefix: data.key_prefix,
    plaintext, // only returned at creation
    created_at: data.created_at,
  });
}

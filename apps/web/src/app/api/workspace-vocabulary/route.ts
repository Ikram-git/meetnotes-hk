import { createClient } from '@/lib/supabase/server';
import { getActiveWorkspaceId } from '@/lib/workspace';
import { NextRequest, NextResponse } from 'next/server';

const MAX_TERM_LENGTH = 80;
const MAX_TERMS_PER_WORKSPACE = 200;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

  const { data, error } = await supabase
    .from('workspace_vocabulary')
    .select('id, term, created_by, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ terms: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);
  if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const raw = typeof body?.term === 'string' ? body.term.trim() : '';
  if (!raw) {
    return NextResponse.json({ error: 'Term is required' }, { status: 400 });
  }
  if (raw.length > MAX_TERM_LENGTH) {
    return NextResponse.json({ error: `Term must be ${MAX_TERM_LENGTH} characters or fewer` }, { status: 400 });
  }
  // Reject characters Deepgram won't accept in keywords (newlines, control chars)
  if (/[\n\r\t]/.test(raw)) {
    return NextResponse.json({ error: 'Term cannot contain line breaks or tabs' }, { status: 400 });
  }

  const { count } = await supabase
    .from('workspace_vocabulary')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);
  if ((count ?? 0) >= MAX_TERMS_PER_WORKSPACE) {
    return NextResponse.json(
      { error: `This workspace already has ${MAX_TERMS_PER_WORKSPACE} terms (the cap). Remove some first.` },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('workspace_vocabulary')
    .insert({ workspace_id: workspaceId, term: raw, created_by: user.id })
    .select('id, term, created_by, created_at')
    .single();
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'That term is already in your vocabulary' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ term: data });
}

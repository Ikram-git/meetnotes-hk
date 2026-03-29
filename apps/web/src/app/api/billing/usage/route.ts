import { createClient } from '@/lib/supabase/server';
import { getUserUsage } from '@/lib/billing/usage';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const usage = await getUserUsage(supabase, user.id);
  return NextResponse.json(usage);
}

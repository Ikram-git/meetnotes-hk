import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Count of open tasks assigned to the caller that are overdue or
 * due today. Used by the sidebar Tasks badge.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ count: 0 });

  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('assignee_user_id', user.id)
    .neq('status', 'done')
    .not('due_date', 'is', null)
    .lte('due_date', today);

  return NextResponse.json({ count: count ?? 0 });
}

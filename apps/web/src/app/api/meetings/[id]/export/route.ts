import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { exportType, language } = await req.json();

  // Get meeting with summary
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single();

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  const { data: summary } = await supabase
    .from('summaries')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!summary) {
    return NextResponse.json(
      { error: 'No summary available for export' },
      { status: 404 }
    );
  }

  // Record export
  await supabase.from('exports').insert({
    meeting_id: meetingId,
    user_id: user.id,
    export_type: exportType,
    export_language: language || 'en',
    status: 'completed',
  });

  // Return data for client-side export handling
  return NextResponse.json({
    meeting,
    summary,
    exportType,
  });
}

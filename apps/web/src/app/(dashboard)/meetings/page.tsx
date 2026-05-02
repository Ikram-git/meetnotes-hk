import { createClient } from '@/lib/supabase/server';
import { getActiveWorkspaceId } from '@/lib/workspace';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MeetingsListClient } from '@/components/meetings-list-client';
import { UpcomingMeetingsCard } from '@/components/upcoming-meetings-card';
import { RecordPanel } from '@/components/record-panel';

export const dynamic = 'force-dynamic';

export default async function MeetingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const workspaceId = await getActiveWorkspaceId(supabase, user.id);

  const meetingsQuery = supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false });
  const { data: meetings } = workspaceId
    ? await meetingsQuery.eq('workspace_id', workspaceId)
    : await meetingsQuery.eq('user_id', user.id);

  const { data: profile } = await supabase
    .from('profiles')
    .select('minutes_used_this_month, minutes_limit, subscription_tier')
    .eq('id', user.id)
    .single();

  const totalMeetings = meetings?.length || 0;
  const completedMeetings = meetings?.filter((m) => m.status === 'completed').length || 0;
  const minutesUsed = profile?.minutes_used_this_month || 0;
  const minutesLimit = profile?.minutes_limit || 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-6 max-w-[1400px] mx-auto">
      {/* Main feed */}
      <div className="min-w-0">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Home</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalMeetings} meeting{totalMeetings === 1 ? '' : 's'} ·{' '}
            <span className="text-emerald-400">{completedMeetings} completed</span> ·{' '}
            {minutesUsed}/{minutesLimit} mins used this month
          </p>
        </div>

        {!meetings || meetings.length === 0 ? (
          <div className="text-center py-16 bg-[#111916] rounded-xl border border-emerald-900/30">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white">No meetings yet</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-xs mx-auto">
              Upload an audio recording or record a live meeting to get started.
            </p>
            <Link href="/upload" className="mt-5 inline-flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-400 transition text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload your first meeting
            </Link>
          </div>
        ) : (
          <MeetingsListClient meetings={meetings} />
        )}
      </div>

      {/* Right panel */}
      <aside className="space-y-4">
        <RecordPanel />
        <UpcomingMeetingsCard />
      </aside>
    </div>
  );
}

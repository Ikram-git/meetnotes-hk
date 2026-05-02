import { createClient } from '@/lib/supabase/server';
import { getActiveWorkspaceId } from '@/lib/workspace';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MeetingsListClient } from '@/components/meetings-list-client';
import { UpcomingMeetingsCard } from '@/components/upcoming-meetings-card';

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
    .from('profiles').select('minutes_used_this_month, minutes_limit, subscription_tier').eq('id', user.id).single();

  const totalMeetings = meetings?.length || 0;
  const completedMeetings = meetings?.filter((m) => m.status === 'completed').length || 0;
  const minutesUsed = profile?.minutes_used_this_month || 0;
  const minutesLimit = profile?.minutes_limit || 100;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your meetings and transcriptions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger-children">
        <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Meetings</p>
          <p className="text-2xl font-bold text-white mt-1">{totalMeetings}</p>
        </div>
        <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completed</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{completedMeetings}</p>
        </div>
        <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Minutes Used</p>
          <p className="text-2xl font-bold text-white mt-1">{minutesUsed}<span className="text-sm font-normal text-gray-600">/{minutesLimit}</span></p>
        </div>
        <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1 capitalize">{profile?.subscription_tier || 'Free'}</p>
        </div>
      </div>

      <UpcomingMeetingsCard />

      {/* Chrome Extension Banner */}
      <div className="mb-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0h4a1 1 0 011 1v3a4 4 0 01-4 4h-1m-8 0H5a4 4 0 01-4-4V5a1 1 0 011-1h4m8 0H8" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">Record meetings from your browser</h3>
              <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">Install the Briva Chrome extension to capture Google Meet, Zoom, and Teams meetings with one click.</p>
            </div>
          </div>
          <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-400 transition whitespace-nowrap sm:flex-shrink-0">
            Get Extension
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* Meetings */}
      <h2 className="text-lg font-semibold text-white mb-4">Recent Meetings</h2>

      {!meetings || meetings.length === 0 ? (
        <div className="text-center py-20 bg-[#111916] rounded-xl border border-emerald-900/30">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">No meetings yet</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">Upload an audio recording or use the Chrome extension to record your first meeting.</p>
          <Link href="/upload" className="mt-6 inline-flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-400 transition text-sm font-medium">
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
  );
}

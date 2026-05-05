'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SettingsNav } from '@/components/settings-nav';
import { LanguageSelector } from '@/components/language-selector';
import { GoogleIntegrationCard } from '@/components/google-integration-card';
// API Keys / Zapier hidden from UI until public Zapier review is complete.
// See docs/zapier-status.md for current state and resume instructions.
// import { ApiKeysCard } from '@/components/api-keys-card';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [settings, setSettings] = useState({
    full_name: '', preferred_language: 'en', preferred_summary_style: 'concise', timezone: 'Asia/Hong_Kong',
    auto_email_recap: false,
  });
  const [tier, setTier] = useState<'free' | 'pro' | 'team' | 'enterprise'>('free');

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || '');
      const { data } = await supabase.from('profiles').select('full_name, preferred_language, preferred_summary_style, timezone, auto_email_recap, subscription_tier').eq('id', user.id).single();
      if (data) {
        setSettings({
          full_name: data.full_name || '',
          preferred_language: data.preferred_language || 'en',
          preferred_summary_style: data.preferred_summary_style || 'concise',
          timezone: data.timezone || 'Asia/Hong_Kong',
          auto_email_recap: !!data.auto_email_recap,
        });
        setTier((data.subscription_tier || 'free') as any);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true); setMessage(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update(settings).eq('id', user.id);
    setMessage(error ? { type: 'error', text: 'Failed to save settings.' } : { type: 'success', text: 'Settings saved successfully.' });
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile and preferences</p>
        <SettingsNav />
      </div>
      <div className="max-w-xl space-y-6">
        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-900/20">
            <h2 className="text-sm font-semibold text-white">Profile</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
              <input type="text" value={settings.full_name} onChange={(e) => setSettings({ ...settings, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white/5 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition" placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
              <input type="email" value={userEmail} disabled className="w-full px-3.5 py-2.5 bg-white/[0.02] border border-gray-800 rounded-lg text-sm text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-900/20">
            <h2 className="text-sm font-semibold text-white">Preferences</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Summary Language</label>
              <LanguageSelector
                value={settings.preferred_language}
                onChange={(code) => setSettings({ ...settings, preferred_language: code })}
                size="md"
                className="w-full"
              />
              <p className="text-xs text-gray-600 mt-1.5">The language used for AI-generated summaries. Audio is auto-detected and can be in any of 30+ languages.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Summary Style</label>
              <div className="flex gap-2">
                {[
                  { value: 'concise', label: 'Concise', desc: 'Short & scannable' },
                  { value: 'detailed', label: 'Detailed', desc: 'Full paragraphs' },
                  { value: 'bullet', label: 'Bullet Points', desc: 'Quick list' },
                ].map((opt) => {
                  const active = settings.preferred_summary_style === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSettings({ ...settings, preferred_summary_style: opt.value })}
                      className={`flex-1 px-3 py-2.5 rounded-lg border text-left transition ${
                        active
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                          : 'bg-white/5 border-emerald-900/30 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-600 mt-1.5">How your meeting summaries are formatted</p>
            </div>
          </div>
        </div>

        <div className="bg-[#111916] rounded-xl border border-emerald-900/30 overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-900/20">
            <h2 className="text-sm font-semibold text-white">Automation</h2>
          </div>
          <div className="p-6 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_email_recap}
                disabled={tier === 'free'}
                onChange={(e) => setSettings({ ...settings, auto_email_recap: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-gray-700 bg-white/5 text-emerald-500 focus:ring-emerald-500/30 disabled:opacity-50"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-white">Auto-email recap to attendees</span>
                  {tier === 'free' && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">PRO+</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  When a meeting finishes summarising and Briva auto-linked it to a Google Calendar event, send the recap to every attendee on the invite.
                  Skips short meetings (&lt;2 min) and only sends once per meeting.
                </p>
                {tier === 'free' && (
                  <p className="text-xs text-amber-400/80 mt-1.5">
                    Upgrade to Pro to enable auto-recap.
                  </p>
                )}
              </div>
            </label>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-emerald-500 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-emerald-400 transition disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <GoogleIntegrationCard />
        {/* <ApiKeysCard /> hidden — see docs/zapier-status.md */}
      </div>
    </div>
  );
}

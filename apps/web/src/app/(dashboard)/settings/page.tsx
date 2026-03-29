'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SettingsNav } from '@/components/settings-nav';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [settings, setSettings] = useState({
    full_name: '', preferred_language: 'en', preferred_summary_style: 'concise', timezone: 'Asia/Hong_Kong',
  });

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || '');
      const { data } = await supabase.from('profiles').select('full_name, preferred_language, preferred_summary_style, timezone').eq('id', user.id).single();
      if (data) setSettings({ full_name: data.full_name || '', preferred_language: data.preferred_language || 'en', preferred_summary_style: data.preferred_summary_style || 'concise', timezone: data.timezone || 'Asia/Hong_Kong' });
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
              <select value={settings.preferred_language} onChange={(e) => setSettings({ ...settings, preferred_language: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white/5 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition">
                <option value="en">English</option>
                <option value="zh-Hant">Traditional Chinese</option>
                <option value="both">Both / Bilingual</option>
              </select>
              <p className="text-xs text-gray-600 mt-1.5">The language used for AI-generated summaries</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Summary Style</label>
              <select value={settings.preferred_summary_style} onChange={(e) => setSettings({ ...settings, preferred_summary_style: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white/5 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition">
                <option value="concise">Concise</option>
                <option value="detailed">Detailed</option>
                <option value="bullet">Bullet Points</option>
              </select>
              <p className="text-xs text-gray-600 mt-1.5">How your meeting summaries are formatted</p>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-emerald-500 text-white py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-emerald-400 transition disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

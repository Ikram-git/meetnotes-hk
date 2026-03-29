'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IntegrationCard } from '@/components/integration-card';
import { SettingsNav } from '@/components/settings-nav';

interface Integration {
  provider: string;
  provider_workspace_name?: string;
}

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('integrations').select('provider, provider_workspace_name').eq('user_id', user.id);
      setIntegrations(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const isConnected = (provider: string) => integrations.some(i => i.provider === provider);
  const getWorkspace = (provider: string) => integrations.find(i => i.provider === provider)?.provider_workspace_name;

  const handleConnect = async (provider: string) => {
    setActionLoading(provider);
    try {
      const res = await fetch(`/api/integrations/${provider}`, { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || `${provider} integration is not configured yet. Add OAuth credentials to .env.local`);
      }
    } catch {
      alert(`Failed to connect ${provider}`);
    }
    setActionLoading(null);
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Disconnect ${provider}? You can reconnect any time.`)) return;
    setActionLoading(provider);
    try {
      const res = await fetch(`/api/integrations/${provider}`, { method: 'DELETE' });
      if (res.ok) {
        setIntegrations(prev => prev.filter(i => i.provider !== provider));
      }
    } catch {}
    setActionLoading(null);
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
        <p className="text-sm text-gray-500 mt-1">Integrations</p>
        <SettingsNav />
      </div>

      <div className="max-w-xl space-y-4">
        <IntegrationCard
          name="Notion"
          description="Export meeting notes as Notion pages with summaries, action items, and decisions."
          icon={<svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.29 2.36c-.466-.373-.98-.653-2.055-.56l-12.77.746c-.467.047-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.886l-15.177.84c-.56.047-.747.327-.747.98zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.449.327s0 .84-1.168.84l-3.222.187c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.234 4.764 7.28V9.2l-1.214-.14c-.094-.514.28-.886.748-.933zM2.332 1.567l13.215-.84c1.635-.14 2.055-.047 3.082.7l4.249 2.986c.7.514.934.653.934 1.213V20.5c0 1.167-.42 1.867-1.914 1.96L6.387 23.3c-1.12.047-1.68-.14-2.288-.84L1.305 19.3c-.7-.84-.98-1.447-.98-2.24V3.527c0-1.027.42-1.867 2.007-1.96z"/></svg>}
          connected={isConnected('notion')}
          workspaceName={getWorkspace('notion')}
          onConnect={() => handleConnect('notion')}
          onDisconnect={() => handleDisconnect('notion')}
          loading={actionLoading === 'notion'}
        />

        <IntegrationCard
          name="Slack"
          description="Share meeting summaries and action items directly to Slack channels."
          icon={<svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>}
          connected={isConnected('slack')}
          workspaceName={getWorkspace('slack')}
          onConnect={() => handleConnect('slack')}
          onDisconnect={() => handleDisconnect('slack')}
          loading={actionLoading === 'slack'}
        />
      </div>
    </div>
  );
}

'use client';

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  workspaceName?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  loading?: boolean;
}

export function IntegrationCard({ name, description, icon, connected, workspaceName, onConnect, onDisconnect, loading }: IntegrationCardProps) {
  return (
    <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{name}</h3>
            {connected && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
          {connected && workspaceName && (
            <p className="text-xs text-gray-600 mt-1">Workspace: {workspaceName}</p>
          )}
        </div>
        <div>
          {connected ? (
            <button onClick={onDisconnect} disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition disabled:opacity-50">
              {loading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          ) : (
            <button onClick={onConnect} disabled={loading}
              className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition disabled:opacity-50">
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

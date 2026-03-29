'use client';

interface UsageMeterProps {
  minutesUsed: number;
  minutesLimit: number;
  tier: string;
  compact?: boolean;
}

export function UsageMeter({ minutesUsed, minutesLimit, tier, compact = false }: UsageMeterProps) {
  const percent = minutesLimit > 0 ? Math.min(100, Math.round((minutesUsed / minutesLimit) * 100)) : 0;
  const isWarning = percent >= 80;
  const isOver = percent >= 100;

  const barColor = isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500';
  const textColor = isOver ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400';

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${percent}%` }} />
        </div>
        <span className={`text-xs font-medium ${textColor}`}>{minutesUsed}/{minutesLimit} min</span>
      </div>
    );
  }

  return (
    <div className="bg-[#111916] rounded-xl border border-emerald-900/30 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-white">Usage This Month</h3>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{tier} plan</p>
        </div>
        <span className={`text-lg font-bold ${textColor}`}>{percent}%</span>
      </div>
      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden mb-2">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{minutesUsed} minutes used</span>
        <span>{minutesLimit} minutes total</span>
      </div>
      {isOver && (
        <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          You've reached your monthly limit. Upgrade to continue transcribing.
        </p>
      )}
    </div>
  );
}

import { SkeletonSummary, SkeletonActionItems } from '@/components/skeleton-summary';

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Title bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="skeleton-shimmer h-7 rounded" style={{ width: '60%' }} />
          <div className="skeleton-shimmer h-3 rounded" style={{ width: '30%' }} />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <div className="skeleton-shimmer w-20 h-9 rounded-lg" />
          <div className="skeleton-shimmer w-9 h-9 rounded-lg" />
        </div>
      </div>

      {/* Audio player */}
      <div className="skeleton-shimmer h-16 rounded-xl mb-6" />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-emerald-900/20 pb-3">
        {['Summary', 'Transcript', 'Actions', 'Chat'].map((label) => (
          <div key={label} className="skeleton-shimmer h-7 w-20 rounded-md" />
        ))}
      </div>

      {/* Summary content */}
      <div className="space-y-8">
        <div>
          <div className="skeleton-shimmer h-4 w-32 rounded mb-3" />
          <SkeletonSummary />
        </div>
        <div>
          <div className="skeleton-shimmer h-4 w-32 rounded mb-3" />
          <SkeletonActionItems />
        </div>
      </div>
    </div>
  );
}

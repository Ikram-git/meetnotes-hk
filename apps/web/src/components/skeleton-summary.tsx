export function SkeletonSummary() {
  return (
    <div className="space-y-6" aria-label="Loading summary">
      {/* Summary paragraph */}
      <div className="space-y-2.5">
        <div className="skeleton-shimmer h-3 rounded" style={{ width: '96%' }} />
        <div className="skeleton-shimmer h-3 rounded" style={{ width: '92%' }} />
        <div className="skeleton-shimmer h-3 rounded" style={{ width: '85%' }} />
        <div className="skeleton-shimmer h-3 rounded" style={{ width: '70%' }} />
      </div>

      {/* Topic chips */}
      <div className="flex flex-wrap gap-2">
        <div className="skeleton-shimmer h-6 w-20 rounded-full" />
        <div className="skeleton-shimmer h-6 w-24 rounded-full" />
        <div className="skeleton-shimmer h-6 w-16 rounded-full" />
        <div className="skeleton-shimmer h-6 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonActionItems() {
  return (
    <div className="space-y-3" aria-label="Loading action items">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="skeleton-shimmer w-4 h-4 rounded flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-shimmer h-3 rounded" style={{ width: `${92 - i * 8}%` }} />
            <div className="flex items-center gap-2">
              <div className="skeleton-shimmer h-3 w-16 rounded" />
              <div className="skeleton-shimmer h-3 w-20 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

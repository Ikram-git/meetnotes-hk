export default function Loading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-6 max-w-[1400px] mx-auto">
      <div className="min-w-0">
        <div className="mb-6 space-y-2">
          <div className="skeleton-shimmer h-6 rounded" style={{ width: '120px' }} />
          <div className="skeleton-shimmer h-3 rounded" style={{ width: '320px' }} />
        </div>

        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#111916] border border-emerald-900/30 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="skeleton-shimmer w-10 h-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="skeleton-shimmer h-4 rounded" style={{ width: `${65 - i * 5}%` }} />
                <div className="skeleton-shimmer h-3 rounded" style={{ width: `${40 - i * 3}%` }} />
              </div>
              <div className="skeleton-shimmer w-16 h-7 rounded-md flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="bg-[#111916] border border-emerald-900/30 rounded-xl p-5 space-y-3">
          <div className="skeleton-shimmer h-4 w-40 rounded" />
          <div className="skeleton-shimmer h-3 w-56 rounded" />
          <div className="skeleton-shimmer h-10 rounded-lg" />
          <div className="skeleton-shimmer h-10 rounded-lg" />
        </div>
        <div className="bg-[#111916] border border-emerald-900/30 rounded-xl p-5 space-y-3">
          <div className="skeleton-shimmer h-3 w-32 rounded" />
          <div className="skeleton-shimmer h-10 rounded-lg" />
          <div className="skeleton-shimmer h-10 rounded-lg" />
        </div>
      </aside>
    </div>
  );
}

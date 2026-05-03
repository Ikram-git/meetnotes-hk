export default function Loading() {
  return (
    <div>
      <div className="mb-8 space-y-2">
        <div className="skeleton-shimmer h-7 w-20 rounded" />
        <div className="skeleton-shimmer h-3 w-72 rounded" />
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="bg-[#111916] border border-emerald-900/30 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-900/20">
            <div className="skeleton-shimmer h-4 w-24 rounded" />
          </div>
          <div className="p-6 space-y-3">
            <div className="skeleton-shimmer h-3 w-12 rounded" />
            <div className="skeleton-shimmer h-10 rounded-lg" />
          </div>
        </div>

        <div className="bg-[#111916] border border-emerald-900/30 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-900/20">
            <div className="skeleton-shimmer h-4 w-28 rounded" />
          </div>
          <div className="p-6 space-y-3">
            <div className="skeleton-shimmer h-3 w-20 rounded" />
            <div className="skeleton-shimmer h-10 rounded-lg" />
            <div className="skeleton-shimmer h-3 w-12 rounded" />
            <div className="flex gap-2">
              <div className="skeleton-shimmer h-10 flex-1 rounded-lg" />
              <div className="skeleton-shimmer h-10 flex-1 rounded-lg" />
            </div>
            <div className="skeleton-shimmer h-10 rounded-lg" />
          </div>
        </div>

        <div className="bg-[#111916] border border-emerald-900/30 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-emerald-900/20">
            <div className="skeleton-shimmer h-4 w-24 rounded" />
          </div>
          <div className="divide-y divide-emerald-900/20">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-6 py-3 flex items-center gap-3">
                <div className="skeleton-shimmer w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton-shimmer h-3 rounded" style={{ width: `${50 - i * 8}%` }} />
                  <div className="skeleton-shimmer h-3 rounded" style={{ width: `${35 - i * 5}%` }} />
                </div>
                <div className="skeleton-shimmer h-6 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

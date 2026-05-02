export default function Loading() {
  return (
    <div>
      <div className="mb-8 space-y-2">
        <div className="skeleton-shimmer h-7 w-32 rounded" />
        <div className="skeleton-shimmer h-3 w-56 rounded" />
        <div className="flex gap-1 mt-4">
          {['Profile', 'Team', 'Billing'].map((t) => (
            <div key={t} className="skeleton-shimmer h-8 w-20 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="max-w-xl space-y-6">
        {[0, 1].map((i) => (
          <div key={i} className="bg-[#111916] border border-emerald-900/30 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-emerald-900/20">
              <div className="skeleton-shimmer h-4 w-24 rounded" />
            </div>
            <div className="p-6 space-y-4">
              <div className="skeleton-shimmer h-3 w-20 rounded" />
              <div className="skeleton-shimmer h-10 rounded-lg" />
              <div className="skeleton-shimmer h-3 w-20 rounded" />
              <div className="skeleton-shimmer h-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
        <div className="bg-[#111916] border border-emerald-900/30 rounded-xl p-6 space-y-4">
          <div className="skeleton-shimmer h-5 w-40 rounded" />
          <div className="skeleton-shimmer h-3 w-64 rounded" />
          <div className="skeleton-shimmer h-2 w-full rounded-full" />
          <div className="skeleton-shimmer h-10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

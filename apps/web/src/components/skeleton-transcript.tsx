export function SkeletonTranscript() {
  // Deterministic widths so server + client match
  const rows = [
    { lineWidths: ['95%', '88%', '72%'] },
    { lineWidths: ['92%', '80%'] },
    { lineWidths: ['96%', '90%', '85%', '60%'] },
    { lineWidths: ['88%', '70%'] },
    { lineWidths: ['94%', '82%', '55%'] },
  ];

  return (
    <div className="space-y-5" aria-label="Loading transcript">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-3">
          {/* Speaker avatar */}
          <div className="skeleton-shimmer w-9 h-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            {/* Speaker + timestamp line */}
            <div className="flex items-center gap-2">
              <div className="skeleton-shimmer h-3 w-20 rounded" />
              <div className="skeleton-shimmer h-3 w-10 rounded" />
            </div>
            {/* Text lines */}
            {row.lineWidths.map((w, j) => (
              <div
                key={j}
                className="skeleton-shimmer h-3 rounded"
                style={{ width: w }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

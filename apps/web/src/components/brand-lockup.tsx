/**
 * Briva wordmark + slogan lockup. Drop this anywhere we want the
 * brand and tagline together (auth pages, sidebar, public share
 * pages, etc). The slogan is the company-wide tag — keep it
 * consistent everywhere it appears.
 */
export const BRIVA_SLOGAN = 'Hear Beyond Words.';

export function BrandLockup({
  size = 'md',
  showSlogan = true,
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  showSlogan?: boolean;
  className?: string;
}) {
  const logoSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5.5 h-5.5';
  const nameSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const tagSize = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[10px]';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${logoSize} bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0`}>
        <svg className={`${iconSize} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 15.94 Q5.6 4.69 11.25 4.69 L12.75 4.69 Q18.38 4.69 18.38 15.94" />
          <rect x="8.44" y="11.25" width="1.5" height="5.63" rx="0.75" fill="currentColor" stroke="none" />
          <rect x="11.25" y="9" width="1.5" height="7.88" rx="0.75" fill="currentColor" stroke="none" />
          <rect x="14.06" y="12.38" width="1.5" height="4.5" rx="0.75" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className={`${nameSize} font-bold text-white tracking-tight`}>Briva</div>
        {showSlogan && (
          <div className={`${tagSize} font-medium text-emerald-400/90 italic tracking-wide`}>
            {BRIVA_SLOGAN}
          </div>
        )}
      </div>
    </div>
  );
}

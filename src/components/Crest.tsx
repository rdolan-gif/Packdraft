// The PackDraft 38 crest: a shield with a torn-pack edge across the top (every season starts by
// ripping a pack open), "38" in the brand's italic display face.

const SHIELD = 'M6 18 L22 6 L38 18 L54 6 L66 14 L78 6 L94 18 L110 6 L126 18 L126 92 C126 122 98 142 66 152 C34 142 6 122 6 92 Z';

interface Props {
  size?: number;
  /** 'full': outlined shield with the wordmark; 'solid': filled shield, number only (small sizes). */
  variant?: 'full' | 'solid' | 'ink';
  className?: string;
  title?: string;
}

export function Crest({ size = 48, variant = 'full', className, title }: Props) {
  const h = (size * 156) / 132;
  return (
    <svg width={size} height={h} viewBox="0 0 132 156" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {variant === 'full' ? (
        <>
          <path d={SHIELD} fill="#151a26" stroke="#ff6a2b" strokeWidth="6" strokeLinejoin="round" />
          <path d="M18 34 L114 34" stroke="#ff6a2b" strokeWidth="3" opacity="0.5" />
          <text x="66" y="57" textAnchor="middle" fontFamily="'Saira Extra Condensed', sans-serif" fontWeight="800" fontSize="19" letterSpacing="2.5" fill="#f5f7fa">
            PACKDRAFT
          </text>
          <text x="66" y="116" textAnchor="middle" fontFamily="'Saira Extra Condensed', sans-serif" fontWeight="900" fontStyle="italic" fontSize="78" fill="#ff6a2b">
            38
          </text>
        </>
      ) : variant === 'ink' ? (
        <>
          <path d={SHIELD} fill="#0b0e16" />
          <text x="66" y="112" textAnchor="middle" fontFamily="'Saira Extra Condensed', sans-serif" fontWeight="900" fontStyle="italic" fontSize="84" fill="#ff6a2b">
            38
          </text>
        </>
      ) : (
        <>
          <path d={SHIELD} fill="#ff6a2b" />
          <text x="66" y="112" textAnchor="middle" fontFamily="'Saira Extra Condensed', sans-serif" fontWeight="900" fontStyle="italic" fontSize="84" fill="#0b0e16">
            38
          </text>
        </>
      )}
    </svg>
  );
}

/** "PACKDRAFT [38]" wordmark: heavy italic name with the angled Flare 38 tab. */
export function Wordmark({ className = '', big }: { className?: string; big?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display italic leading-none ${className}`}>
      <span className="text-white" style={{ fontWeight: 900 }}>
        PACKDRAFT
      </span>
      <span className="bg-flare-500 text-ink" style={{ fontWeight: 900, padding: big ? '0.02em 0.32em 0' : '0.04em 0.3em 0', clipPath: 'polygon(0.25em 0, 100% 0, calc(100% - 0.25em) 100%, 0 100%)' }}>
        38
      </span>
    </span>
  );
}

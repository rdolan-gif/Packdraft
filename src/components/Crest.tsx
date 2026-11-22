// The PackDraft 38 badge: a comic starburst (the sticker-album "NEW!" burst) with a big outlined 38.

const BURST = 'M66.0 13.0 L76.5 30.5 L92.9 19.7 L95.3 40.3 L114.5 38.3 L108.3 58.0 L126.4 65.1 L113.0 80.0 L126.4 94.9 L108.3 102.0 L114.5 121.7 L95.3 119.7 L92.9 140.3 L76.5 129.5 L66.0 147.0 L55.5 129.5 L39.1 140.3 L36.7 119.7 L17.5 121.7 L23.7 102.0 L5.6 94.9 L19.0 80.0 L5.6 65.1 L23.7 58.0 L17.5 38.3 L36.7 40.3 L39.1 19.7 L55.5 30.5 Z';
const FONT = "Bangers, Impact, sans-serif";

interface Props {
  size?: number;
  /** 'full': red burst, yellow 38, navy shadow; 'solid': yellow burst, red 38 (small sizes); 'ink': navy burst, yellow 38. */
  variant?: 'full' | 'solid' | 'ink';
  className?: string;
  title?: string;
}

const LOOK = {
  full: { burst: '#e62e2d', num: '#ffd400' },
  solid: { burst: '#ffd400', num: '#e62e2d' },
  ink: { burst: '#14183a', num: '#ffd400' },
};

export function Crest({ size = 48, variant = 'full', className, title }: Props) {
  const h = (size * 156) / 132;
  const c = LOOK[variant];
  return (
    <svg width={size} height={h} viewBox="0 0 132 156" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d={BURST} fill="#14183a" transform="translate(5 6)" />
      <path d={BURST} fill={c.burst} stroke="#14183a" strokeWidth="4" strokeLinejoin="round" />
      <text x="66" y="104" textAnchor="middle" fontFamily={FONT} fontSize="70" fill={c.num} stroke="#14183a" strokeWidth="7" strokeLinejoin="round" paintOrder="stroke" letterSpacing="1">
        38
      </text>
    </svg>
  );
}

/** "PACKDRAFT" in outlined comic yellow (sits beside the 38 badge). */
export function Wordmark({ className = '', big }: { className?: string; big?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-display leading-none ${className}`}>
      <span style={{ color: '#ffd400', WebkitTextStroke: big ? '3px #14183a' : '2px #14183a', paintOrder: 'stroke fill', textShadow: big ? '4px 4px 0 #14183a' : '2px 2px 0 #14183a' }}>PACKDRAFT</span>
    </span>
  );
}

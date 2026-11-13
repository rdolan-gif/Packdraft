import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { Crown, Star } from 'lucide-react';
import type { PlayerCard, Tier } from '../types/game';
import { getClub } from '../data/clubs';
import { PlayerCaricature } from './PlayerCaricature';
import { sfx } from '../engine/soundEffects';

export const TIER_LABEL: Record<Tier, string> = {
  STANDARD: 'Squad Regular',
  CULT_HERO: 'Cult Hero',
  VETERAN: 'Veteran',
  RISING_WORLD: 'Rising Star / World Class',
  PRIME_ICON: 'Prime Icon',
};

export const TIER_EMOJI: Record<Tier, string> = {
  STANDARD: '⬛',
  CULT_HERO: '🟥',
  VETERAN: '🟪',
  RISING_WORLD: '🟨',
  PRIME_ICON: '⬜',
};

export const TIER_TEXT: Record<Tier, string> = {
  STANDARD: 'text-slate-300',
  CULT_HERO: 'text-red-400',
  VETERAN: 'text-violet-300',
  RISING_WORLD: 'text-amber-300',
  PRIME_ICON: 'text-white',
};

type Size = 'xs' | 'sm' | 'md' | 'lg';

const DIM: Record<Size, { w: number; h: number; face: number; ovr: string; name: string; small: string }> = {
  xs: { w: 64, h: 92, face: 52, ovr: 'text-lg', name: 'text-[9px]', small: 'text-[6px]' },
  sm: { w: 92, h: 132, face: 74, ovr: 'text-2xl', name: 'text-[11px]', small: 'text-[7px]' },
  md: { w: 150, h: 220, face: 118, ovr: 'text-4xl', name: 'text-base', small: 'text-[9px]' },
  lg: { w: 196, h: 286, face: 156, ovr: 'text-5xl', name: 'text-xl', small: 'text-[11px]' },
};

interface Props {
  card: PlayerCard;
  size?: Size;
  onClick?: () => void;
  selected?: boolean;
  dimmed?: boolean;
  showStats?: boolean;
  tilt?: boolean;
  className?: string;
  style?: CSSProperties;
  footer?: React.ReactNode;
}

const STAT_KEYS: [keyof PlayerCard['stats'], string, string][] = [
  ['pac', 'PAC', 'DIV'],
  ['sho', 'SHO', 'HAN'],
  ['pas', 'PAS', 'KIC'],
  ['dri', 'DRI', 'REF'],
  ['def', 'DEF', 'SPD'],
  ['phy', 'PHY', 'POS'],
];

export function PlayerCardUI({ card, size = 'md', onClick, selected, dimmed, showStats, tilt = true, className = '', style, footer }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const d = DIM[size];
  const club = getClub(card.club);
  const prime = card.tier === 'PRIME_ICON';
  const world = card.tier === 'RISING_WORLD';
  const isGK = card.positions[0] === 'GK';
  const tiny = size === 'xs' || size === 'sm';

  const onMove = (e: PointerEvent) => {
    if (!tilt || !ref.current || e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const max = prime ? 16 : world ? 10 : 6;
    ref.current.style.transform = `perspective(700px) rotateY(${(px - 0.5) * max * 2}deg) rotateX(${(0.5 - py) * max * 2}deg) scale(1.04)`;
    ref.current.style.setProperty('--gx', `${px * 100}%`);
    ref.current.style.setProperty('--gy', `${py * 100}%`);
    ref.current.style.setProperty('--go', '1');
  };
  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = '';
    ref.current.style.setProperty('--go', '0');
  };

  return (
    <div
      ref={ref}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
      onPointerMove={onMove}
      onPointerEnter={(e) => onClick && e.pointerType === 'mouse' && sfx.hover()}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
      className={`card-base tier-${card.tier} ${card.tier === 'CULT_HERO' || card.tier === 'VETERAN' ? 'sweep' : ''} ${prime ? 'aura' : ''} ${
        selected ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-black' : ''
      } ${dimmed ? 'opacity-40 grayscale' : ''} ${onClick ? 'cursor-pointer' : ''} select-none shrink-0 ${className}`}
      style={{ width: d.w, height: d.h, ...style }}
    >
      {prime && <div className="holo" />}
      <div className="glare" />
      {(world || prime) && (
        <div className="sparkles absolute inset-0 pointer-events-none">
          {Array.from({ length: prime ? 8 : 5 }).map((_, i) => (
            <i key={i} style={{ left: `${(i * 37 + 11) % 90 + 5}%`, top: `${(i * 53 + 7) % 85 + 5}%`, animationDelay: `${(i * 0.37) % 2.4}s` }} />
          ))}
        </div>
      )}

      {/* club colour sash */}
      <div className="absolute -right-6 top-0 h-full w-10 rotate-12 opacity-40" style={{ background: `linear-gradient(${club.primary}, ${club.secondary})` }} />

      {/* top-left: OVR + position */}
      <div className={`absolute left-1.5 top-1 z-10 flex flex-col items-center leading-none ${prime ? 'text-slate-900 [text-shadow:0_1px_0_rgba(255,255,255,.9)]' : 'text-shadow'}`}>
        <span className={`font-display ${d.ovr}`}>{card.ovr}</span>
        <span className={`font-bold ${tiny ? 'text-[8px]' : 'text-xs'} tracking-wider`}>{card.positions[0]}</span>
        {!tiny && card.positions.length > 1 && <span className="mt-0.5 text-[8px] opacity-80">{card.positions.slice(1).join('/')}</span>}
        {prime && <Crown className={`${tiny ? 'h-3 w-3' : 'h-4 w-4'} mt-1 text-amber-400`} fill="currentColor" />}
        {world && !tiny && <Star className="mt-1 h-3.5 w-3.5 text-white" fill="currentColor" />}
      </div>

      {/* top-right: season era badge */}
      <div className="absolute right-1 top-1 z-10 flex flex-col items-end gap-0.5">
        <span className={`rounded px-1 py-[1px] font-black ${d.small} uppercase tracking-wider bg-black/60 text-white`}>
          {size === 'xs' ? card.season : `${card.season} ${card.era}`}
        </span>
        {!tiny && (
          <span className="rounded px-1 text-[9px] font-black" style={{ background: club.primary, color: club.secondary === club.primary ? '#fff' : club.secondary, border: `1px solid ${club.accent}` }}>
            {club.short}
          </span>
        )}
      </div>

      {/* portrait */}
      <div className="absolute left-1/2 z-[5] -translate-x-1/2" style={{ top: tiny ? d.h * 0.1 : d.h * 0.09 }}>
        <PlayerCaricature traits={card.traits} kitPrimaryColor={club.primary} kitSecondaryColor={club.secondary} seed={card.id} size={d.face} />
      </div>

      {/* name panel */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/65 to-transparent px-1.5 pb-1.5 pt-3 text-center text-white">
        <div className={`font-display ${d.name} leading-none truncate text-shadow`}>{card.shortName.toUpperCase()}</div>
        {!tiny && (
          <>
            <div className="mt-0.5 truncate text-[9px] font-semibold opacity-80">
              {club.name} · {card.nation}
            </div>
            <div className="mt-1 inline-block rounded-full border border-white/30 bg-white/10 px-2 py-[1px] text-[9px] font-bold uppercase tracking-wide">
              {card.archetype}
            </div>
            {showStats && (
              <div className="mt-1 grid grid-cols-6 gap-0.5 text-[8px] leading-tight">
                {STAT_KEYS.map(([k, label, gkLabel]) => (
                  <div key={k} className="flex flex-col">
                    <span className="font-black">{card.stats[k]}</span>
                    <span className="opacity-70">{isGK ? gkLabel : label}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {footer}
      </div>
    </div>
  );
}

/** Card back used during the face-down fan-out. */
export function CardBack({ size = 'md', glow, className = '', style }: { size?: Size; glow?: boolean; className?: string; style?: CSSProperties }) {
  const d = DIM[size];
  return (
    <div
      className={`card-base shrink-0 border-2 ${glow ? 'border-white aura animate-vibrate' : 'border-emerald-700'} ${className}`}
      style={{
        width: d.w,
        height: d.h,
        background: 'repeating-linear-gradient(45deg, #064e3b 0 8px, #065f46 8px 16px), #064e3b',
        ...style,
      }}
    >
      <div className="absolute inset-2 flex items-center justify-center rounded-lg border border-emerald-400/30">
        <div className="text-center">
          <div className="font-display text-4xl text-yellow-300 drop-shadow">38</div>
          <div className="text-[9px] font-black tracking-[0.3em] text-emerald-200">PACKDRAFT</div>
        </div>
      </div>
    </div>
  );
}

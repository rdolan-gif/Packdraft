import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { PlayerCard, Tier } from '../types/game';
import { getClub } from '../data/clubs';
import { PlayerCaricature } from './PlayerCaricature';
import { collarForSeason, kitForCard } from '../data/kits';
import { sfx } from '../engine/soundEffects';
import { eraColour } from '../data/eraColours';
import { devTheme } from '../data/devThemes';
import { DevScene } from './DevScene';
import { Crest } from './Crest';
import { ClubIcon } from './ClubIcon';
import { Flag } from './Flag';
import { portraitUrl } from '../data/portraits';
import './tradingCard.css';

export const TIER_LABEL: Record<Tier, string> = {
  STANDARD: 'Squad Regular',
  ELITE: 'Elite',
  RISING_WORLD: 'Gold',
  PRIME_ICON: 'Prime Icon',
  SECRET_DEV: 'Secret Rare',
};

export { cardEmoji } from '../data/eraColours';

export const TIER_TEXT: Record<Tier, string> = {
  STANDARD: 'text-slate-300',
  ELITE: 'text-sky-300',
  RISING_WORLD: 'text-amber-300',
  PRIME_ICON: 'text-white',
  SECRET_DEV: 'text-fuchsia-300',
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

const STAT_KEYS: [keyof PlayerCard['stats'], string][] = [
  ['pac', 'PAC'],
  ['sho', 'SHO'],
  ['pas', 'PAS'],
  ['dri', 'DRI'],
  ['def', 'DEF'],
  ['phy', 'PHY'],
];
// Keepers store shot-stopping in DEF, handling in DRI, kicking in PAS, speed in PAC and
// positioning in PHY; their SHO column is unused, so it isn't shown.
const GK_STAT_KEYS: [keyof PlayerCard['stats'], string][] = [
  ['def', 'DIV'],
  ['dri', 'HAN'],
  ['pas', 'KIC'],
  ['pac', 'SPD'],
  ['phy', 'POS'],
];

// The trading card is drawn at 230×336 and scaled to each size (all sizes share its shape).
const BASE_W = 230;

const lum = (c: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
/** Sunburst behind the player: the club's second colour, or a tint of its main colour when that would be near-white. */
function burst(primary: string, secondary: string) {
  if (lum(secondary) < 0.85) return secondary;
  return lum(primary) < 0.2 ? '#8b93a3' : `color-mix(in srgb, ${primary} 55%, white)`;
}

export function PlayerCardUI({ card, size = 'md', onClick, selected, dimmed, showStats, tilt = true, className = '', style, footer }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const d = DIM[size];
  const club = getClub(card.club);
  const prime = card.tier === 'PRIME_ICON';
  const secret = card.tier === 'SECRET_DEV';
  // Secret dev cards can carry a personal theme: a background scene, a banner and their club's kit.
  const theme = secret ? devTheme(card.basePlayerId) : undefined;
  const era = eraColour(card.era);
  const world = card.tier === 'RISING_WORLD';
  const shiny = world || prime || secret;
  const isGK = card.positions[0] === 'GK';
  const tiny = size === 'xs' || size === 'sm';
  const [broken, setBroken] = useState(false);
  const photo = broken ? undefined : portraitUrl(card.id);
  const stats = isGK ? GK_STAT_KEYS : STAT_KEYS;

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

  const vars = {
    ['--frame' as string]: lum(club.primary) > 0.85 ? club.secondary : club.primary,
    ['--bg' as string]: burst(club.primary, club.secondary),
    ['--e1' as string]: era.light,
    ['--e2' as string]: era.mid,
    ['--e3' as string]: era.dark,
    ['--cols' as string]: stats.length,
    transform: `scale(${d.w / BASE_W})`,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${card.name}, ${card.ovr} ${card.positions[0]}, ${club.name} ${card.season}`}
      onClick={onClick}
      onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
      onPointerMove={onMove}
      onPointerEnter={(e) => onClick && e.pointerType === 'mouse' && sfx.hover()}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
      className={`relative select-none shrink-0 rounded-[10px] transition-transform ${prime ? 'aura' : ''} ${selected ? '-translate-y-1' : ''} ${
        dimmed ? 'opacity-40 grayscale' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: d.w, height: d.h, ...style }}
    >
      <div className={`tc tc-${card.tier} ${tiny ? 'tc-tiny' : ''}`} style={vars}>
        <div className="tc-frame">
          <div className={`tc-photo ${shiny ? 'tc-foil' : ''}`}>
            {theme && <DevScene scene={theme.scene} />}
            {shiny && (
              <div className="tc-sparkles">
                {[[18, 22], [78, 14], [64, 46], [24, 60], [86, 70]].map(([x, y], i) => (
                  <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.37}s` }} />
                ))}
              </div>
            )}
            <div className="tc-portrait">
              {photo ? (
                <img src={photo} alt="" draggable={false} decoding="async" onError={() => setBroken(true)} />
              ) : (
                <PlayerCaricature
                  traits={card.traits}
                  kitPrimaryColor={club.primary}
                  kitSecondaryColor={club.secondary}
                  kitSleeveColor={club.sleeve}
                  kitCollarColor={club.collar}
                  collarStyle={collarForSeason(card.season)}
                  kit={kitForCard(card, theme?.fanClub)}
                  seed={card.id}
                  size={186}
                />
              )}
            </div>
            <div className="tc-star">
              <b>{card.ovr}</b>
              <span>{secret ? 'ANY' : card.positions[0]}</span>
            </div>
            <div className="tc-side">{theme ? theme.banner : `${card.season} · ${secret ? 'Secret rare' : card.era}`}</div>
            <div className="tc-badge">
              <ClubIcon code={card.club} size={40} />
            </div>
          </div>
          <div className="tc-ribbon">
            <b>{card.shortName}</b>
          </div>
          {!tiny && (
            <>
              <div className="tc-sub" title={`${club.name} · ${card.archetype} · ${card.nation}`}>
                <Flag nation={card.nation} width={20} />
                <span>{theme ? `Dev Team · ${theme.fanLabel}` : card.archetype}</span>
              </div>
              {showStats && (
                <div className="tc-stats">
                  {stats.map(([k, label]) => (
                    <div key={k}>
                      <b>{card.stats[k]}</b>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              )}
              {footer && <div className="tc-extra">{footer}</div>}
            </>
          )}
        </div>
        {shiny && <div className="tc-sheen" />}
        <div className="tc-glare" />
        {selected && <div className="tc-selected" />}
      </div>
    </div>
  );
}

/** Card back used during the face-down fan-out: navy frame, sunburst, the crest. */
export function CardBack({ size = 'md', glow, className = '', style }: { size?: Size; glow?: boolean; className?: string; style?: CSSProperties }) {
  const d = DIM[size];
  return (
    <div className={`relative shrink-0 rounded-[10px] ${glow ? 'aura animate-vibrate' : ''} ${className}`} style={{ width: d.w, height: d.h, ...style }}>
      <div className="tc" style={{ transform: `scale(${d.w / BASE_W})`, boxShadow: glow ? '0 0 0 4px #fff, 0 0 32px 8px #ff6a2b' : undefined }}>
        <div className="tc-frame" style={{ background: '#151a26', padding: 10 }}>
          <div
            className="tc-photo"
            style={{
              height: '100%',
              borderRadius: 10,
              background: 'repeating-conic-gradient(from 0deg at 50% 45%, rgba(255,106,43,.22) 0 9deg, transparent 9deg 18deg), radial-gradient(circle at 50% 45%, #2a3350, #151a26 75%)',
            }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Crest size={110} />
              <div style={{ fontSize: 30, fontWeight: 800, color: '#f5f0e4', letterSpacing: '0.06em', lineHeight: 1 }}>PACKDRAFT 38</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ff6a2b', letterSpacing: '0.3em' }}>RIP · DRAFT · SURVIVE</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

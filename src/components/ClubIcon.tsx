import { getClub } from '../data/clubs';
import { Crest } from './Crest';

// Hand-drawn club icons (Google Flow), one per club, in a white roundel. The dev team uses our own crest.
const ICONS = import.meta.glob('../assets/club-icons/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function clubIconUrl(code: string): string | undefined {
  return ICONS[`../assets/club-icons/${code}.png`];
}

export function ClubIcon({ code, size = 40, className, bare }: { code: string; size?: number; className?: string; /** Just the drawing, no roundel. */ bare?: boolean }) {
  const url = clubIconUrl(code);
  const club = getClub(code);
  if (bare)
    return url ? (
      <img src={url} alt={club.name} className={className} style={{ width: size, height: size, objectFit: 'contain', maxWidth: 'none' }} />
    ) : (
      <Crest size={size * 0.8} className={className} />
    );
  return (
    <span
      className={className}
      title={club.name}
      style={{ width: size, height: size, borderRadius: '50%', background: '#fff', border: `${Math.max(1.5, size / 22)}px solid #161c2b`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: 'none' }}
    >
      {url ? (
        <img src={url} alt={club.name} style={{ width: '80%', height: '80%', objectFit: 'contain', maxWidth: 'none' }} />
      ) : code === 'DEV' ? (
        <Crest size={size * 0.62} />
      ) : (
        <span style={{ fontSize: size * 0.32, fontWeight: 900, color: club.primary }}>{club.short}</span>
      )}
    </span>
  );
}

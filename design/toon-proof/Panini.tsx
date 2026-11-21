// Mockups: classic sticker-album (A) and 90s trading-card (B) frames for PackDraft 38 cards.
import type { CSSProperties } from 'react';
import type { PlayerCard } from '../types/game';
import { getClub } from '../data/clubs';
import { kitForCard } from '../data/kits';
import { eraColour } from '../data/eraColours';
import { Crest } from '../components/Crest';
import { Toon } from './Toon';
import { ClubIcon } from './ClubIcon';
import { Flag } from './Flag';
import './panini.css';

const STATS: [keyof PlayerCard['stats'], string][] = [['pac', 'PAC'], ['sho', 'SHO'], ['pas', 'PAS'], ['dri', 'DRI'], ['def', 'DEF'], ['phy', 'PHY']];
const GK: [keyof PlayerCard['stats'], string][] = [['pac', 'DIV'], ['sho', 'HAN'], ['pas', 'KIC'], ['dri', 'REF'], ['def', 'SPD'], ['phy', 'POS']];

function vars(card: PlayerCard): CSSProperties {
  const club = getClub(card.club);
  const era = eraColour(card.era);
  return { ['--c1' as string]: club.primary, ['--c2' as string]: club.secondary, ['--ca' as string]: club.accent, ['--e1' as string]: era.light, ['--e2' as string]: era.mid, ['--e3' as string]: era.dark } as CSSProperties;
}
const shiny = (c: PlayerCard) => c.tier === 'RISING_WORLD' || c.tier === 'PRIME_ICON' || c.tier === 'SECRET_DEV';
const boil = (c: PlayerCard) => c.tier === 'PRIME_ICON' || c.tier === 'SECRET_DEV';
const num = (c: PlayerCard) => String((c.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % 380) + 1).padStart(3, '0');

function Sparkles() {
  return (
    <div className="pn-sparkles">
      {[[18, 22], [78, 14], [64, 46], [24, 60], [86, 70]].map(([x, y], i) => (
        <span key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.37}s` }} />
      ))}
    </div>
  );
}

/** A: the sticker. Paper border (or the rarity material), club band, photo, name bar, stats. */
export function StickerCard({ card }: { card: PlayerCard }) {
  const club = getClub(card.club);
  const stats = card.positions[0] === 'GK' ? GK : STATS;
  return (
    <div className={`pn pn-${card.tier}`} style={vars(card)}>
      <div className="pn-inner">
        <div className="pn-band">
          <span>{club.name}</span>
          <b>{card.season}</b>
        </div>
        <div className={`pn-photo ${shiny(card) ? 'pn-foil' : ''}`}>
          {shiny(card) && <Sparkles />}
          <div className="pn-rating">
            <b>{card.ovr}</b>
            <span>{card.positions[0]}</span>
          </div>
          <div className="pn-badge">{club.short}</div>
          <div className="pn-era">{card.tier === 'SECRET_DEV' ? 'Secret' : card.era}</div>
          <div className="pn-toon">
            <Toon traits={card.traits} kit={kitForCard(card)} seed={card.id} size={196} boil={boil(card)} />
          </div>
        </div>
        <div className="pn-name">
          <b>{card.shortName}</b>
          <span>
            {card.archetype} · {card.nation}
          </span>
        </div>
        <div className="pn-stats">
          {stats.map(([k, l]) => (
            <div key={k}>
              <b>{card.stats[k]}</b>
              <span>{l}</span>
            </div>
          ))}
        </div>
        <div className="pn-no">Nº {num(card)}</div>
      </div>
      {shiny(card) && <div className="pn-sheen" />}
    </div>
  );
}

export function StickerBack() {
  return (
    <div className="pn pn-back">
      <div className="pn-inner">
        <div className="pn-back-body">
          <div className="pn-peel">Peel here ▸</div>
          <Crest size={86} />
          <div className="pn-back-title">PackDraft 38</div>
          <div className="pn-back-sub">Official sticker album · 1992 – 2026</div>
          <div className="pn-back-no">Nº 042</div>
        </div>
      </div>
    </div>
  );
}

/** B: the 90s trading card. Club-colour frame, sunburst photo, starburst rating, slanted name ribbon. */
export function TradingCard({ card }: { card: PlayerCard }) {
  const club = getClub(card.club);
  const stats = card.positions[0] === 'GK' ? GK : STATS;
  return (
    <div className={`tc tc-${card.tier}`} style={vars(card)}>
      <div className="tc-frame">
        <div className={`tc-photo ${shiny(card) ? 'pn-foil' : ''}`}>
          {shiny(card) && <Sparkles />}
          <div className="tc-toon">
            <Toon traits={card.traits} kit={kitForCard(card)} seed={card.id} size={158} boil={boil(card)} />
          </div>
          <div className="tc-star">
            <b>{card.ovr}</b>
            <span>{card.positions[0]}</span>
          </div>
          <div className="tc-side">
            {card.season} · {card.tier === 'SECRET_DEV' ? 'SECRET RARE' : card.era}
          </div>
          <div className="tc-badge">
            <ClubIcon code={card.club} size={40} />
          </div>
        </div>
        <div className="tc-ribbon">
          <b>{card.shortName}</b>
        </div>
        <div className="tc-sub">
          <Flag nation={card.nation} height={13} />
          <span>{card.archetype}</span>
        </div>
        <div className="tc-stats">
          {stats.map(([k, l]) => (
            <div key={k}>
              <b>{card.stats[k]}</b>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </div>
      {shiny(card) && <div className="pn-sheen" />}
    </div>
  );
}

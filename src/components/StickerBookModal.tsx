import { useMemo, useState } from 'react';
import { BookOpen, Star, Trophy, X } from 'lucide-react';
import { PLAYERS, PLAYERS_BY_ID } from '../data/players';
import { CLUBS, getClub } from '../data/clubs';
import { eraColour } from '../data/eraColours';
import { TIER_RANK } from '../engine/packGenerator';
import { loadBook } from '../engine/stickerBook';
import { sfx } from '../engine/soundEffects';
import type { PlayerCard, Position, Tier } from '../types/game';
import { PlayerCardUI } from './PlayerCardUI';

const POSITION_ORDER: Position[] = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST'];
const POSITION_NAME: Record<Position, string> = {
  GK: 'Goalkeepers', RB: 'Right-backs', CB: 'Centre-backs', LB: 'Left-backs', CDM: 'Holding midfielders', CM: 'Central midfielders',
  CAM: 'Attacking midfielders', RM: 'Right midfielders', LM: 'Left midfielders', RW: 'Right wingers', LW: 'Left wingers', ST: 'Strikers',
};
const TIER_NAME: Record<Tier, string> = { PRIME_ICON: 'Prime', RISING_WORLD: 'Gold', ELITE: 'Elite', STANDARD: 'Squad' };
const TIER_HINT: Record<Tier, string> = { PRIME_ICON: '#f8fafc', RISING_WORLD: '#facc15', ELITE: '#60a5fa', STANDARD: '#64748b' };

const pct = (a: number, b: number) => (b ? Math.floor((a / b) * 100) : 0);

export function StickerBookModal({ onClose }: { onClose: () => void }) {
  const book = useMemo(loadBook, []);
  const [tab, setTab] = useState<'clubs' | 'totw'>('clubs');
  const has = (c: PlayerCard) => !!book.pulled[c.id];

  // club -> its cards, ordered by position, then rarity (best first), then OVR
  const byClub = useMemo(() => {
    const m = new Map<string, PlayerCard[]>();
    PLAYERS.forEach((p) => m.set(p.club, [...(m.get(p.club) ?? []), p]));
    m.forEach((cards) =>
      cards.sort(
        (a, b) =>
          POSITION_ORDER.indexOf(a.positions[0]) - POSITION_ORDER.indexOf(b.positions[0]) ||
          TIER_RANK[b.tier] - TIER_RANK[a.tier] ||
          b.ovr - a.ovr ||
          a.season.localeCompare(b.season),
      ),
    );
    return m;
  }, []);
  const clubs = useMemo(() => Object.values(CLUBS).filter((c) => byClub.has(c.code)).sort((a, b) => a.name.localeCompare(b.name)), [byClub]);
  const [club, setClub] = useState(clubs[0]?.code ?? '');

  const total = PLAYERS.length;
  const got = PLAYERS.filter(has).length;
  const tierStats = (['PRIME_ICON', 'RISING_WORLD', 'ELITE', 'STANDARD'] as Tier[]).map((t) => {
    const all = PLAYERS.filter((p) => p.tier === t);
    return { t, have: all.filter(has).length, all: all.length };
  });
  const cards = byClub.get(club) ?? [];
  const clubInfo = getClub(club);
  const clubGot = cards.filter(has).length;
  const totw = Object.entries(book.totw)
    .map(([id, v]) => ({ card: PLAYERS_BY_ID[id], ...v }))
    .filter((x) => x.card)
    .sort((a, b) => b.count - a.count || b.card.ovr - a.card.ovr);

  let number = 0;
  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto overscroll-contain bg-black/90 p-2 sm:p-5" onClick={onClose} role="dialog" aria-label="Sticker book">
      <div className="mx-auto my-2 max-w-6xl animate-pop overflow-hidden rounded-3xl border-2 border-amber-200/60 bg-gradient-to-b from-[#1c1710] to-black" onClick={(e) => e.stopPropagation()}>
        {/* cover */}
        <div className="border-b border-amber-200/20 bg-gradient-to-r from-amber-900/40 via-amber-700/20 to-amber-900/40 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-amber-200" />
            <div className="min-w-0">
              <div className="font-display text-3xl leading-none text-white">STICKER BOOK</div>
              <div className="text-xs text-amber-100/70">Every card you've pulled in a pack, saved in this browser. ★ = you drafted it.</div>
            </div>
            <button onClick={onClose} className="ml-auto rounded-lg bg-black/40 p-2 text-white hover:bg-black/60" aria-label="Close sticker book">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="min-w-[200px] flex-1">
              <div className="flex justify-between text-xs font-bold text-white/80">
                <span>Collection</span>
                <span className="tabular-nums">
                  {got} / {total} · {pct(got, total)}%
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-200" style={{ width: `${pct(got, total)}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tierStats.map(({ t, have, all }) => (
                <span key={t} className="rounded-md border px-2 py-0.5 text-[11px] font-black tabular-nums text-white" style={{ borderColor: TIER_HINT[t] }}>
                  {TIER_NAME[t]} {have}/{all}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {(
              [
                ['clubs', 'Clubs'],
                ['totw', `Team of the Week honours (${totw.length})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => {
                  sfx.click();
                  setTab(k);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-black uppercase tracking-wider ${tab === k ? 'border-amber-200 bg-amber-200/20 text-amber-100' : 'border-white/15 bg-white/5 text-white/60'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'clubs' && (
          <div className="grid grid-cols-1 md:grid-cols-[230px_1fr]">
            {/* club index */}
            <nav className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-white/10 p-2 md:max-h-[70vh] md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
              {clubs.map((c) => {
                const list = byClub.get(c.code)!;
                const h = list.filter(has).length;
                const done = h === list.length;
                return (
                  <button
                    key={c.code}
                    onClick={() => {
                      sfx.flip();
                      setClub(c.code);
                    }}
                    className={`flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition md:w-full ${club === c.code ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/5'}`}
                  >
                    <span className="h-4 w-4 shrink-0 rounded-sm border border-black/40" style={{ background: `linear-gradient(135deg, ${c.primary} 50%, ${c.secondary} 50%)` }} />
                    <span className="min-w-0 flex-1 truncate font-bold">{c.name}</span>
                    <span className={`tabular-nums ${done ? 'font-black text-amber-200' : 'text-white/50'}`}>
                      {done ? '★' : ''}
                      {h}/{list.length}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* club page */}
            <section className="min-w-0 p-3 sm:p-5">
              <div className="mb-4 flex items-center gap-3 rounded-2xl p-3" style={{ background: `linear-gradient(120deg, ${clubInfo.primary}, ${clubInfo.primary}aa 60%, transparent)` }}>
                <span className="rounded-lg px-2 py-1 font-display text-2xl" style={{ background: clubInfo.secondary, color: clubInfo.primary, border: `2px solid ${clubInfo.accent}` }}>
                  {clubInfo.short}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-display text-3xl leading-none text-white [text-shadow:0_2px_4px_rgba(0,0,0,.6)]">{clubInfo.name}</div>
                  <div className="text-xs font-bold text-white/85">
                    {clubGot} of {cards.length} stickers · {pct(clubGot, cards.length)}%
                  </div>
                </div>
              </div>

              {POSITION_ORDER.filter((pos) => cards.some((c) => c.positions[0] === pos)).map((pos) => (
                <div key={pos} className="mb-4">
                  <div className="mb-2 flex items-baseline gap-2 border-b border-white/10 pb-1">
                    <span className="font-display text-xl text-white">{pos}</span>
                    <span className="text-xs text-white/50">{POSITION_NAME[pos]}</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {cards
                      .filter((c) => c.positions[0] === pos)
                      .map((c) => {
                        number += 1;
                        const owned = has(c);
                        const drafted = book.drafted[c.id];
                        return owned ? (
                          <div key={c.id} className="relative" title={`${c.season} ${c.name}${drafted ? ` · drafted ${drafted}×` : ''}`}>
                            <PlayerCardUI card={c} size="xs" tilt={false} />
                            {drafted ? (
                              <span className="absolute -right-1.5 -top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 text-black shadow">
                                <Star className="h-3 w-3" fill="currentColor" />
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <div
                            key={c.id}
                            className="flex h-[92px] w-[64px] flex-col items-center justify-center rounded-[14px] border-2 border-dashed bg-white/[0.03] text-center"
                            style={{ borderColor: c.tier === 'ELITE' ? `${eraColour(c.era).mid}aa` : `${TIER_HINT[c.tier]}88` }}
                            title="Not pulled yet"
                          >
                            <span className="font-display text-2xl leading-none text-white/25">{number}</span>
                            <span className="mt-1 text-[9px] font-black text-white/40">{c.positions[0]}</span>
                            <span className="text-[8px] text-white/35">{c.season}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === 'totw' && (
          <div className="p-4 sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
              <Trophy className="h-4 w-4 text-amber-200" /> Your players who made a Team of the Week, in any season. A bonus page: it doesn't count towards completion.
            </div>
            {totw.length === 0 ? (
              <div className="py-12 text-center text-white/50">No honours yet. Get one of your players into a Team of the Week to earn their foil sticker.</div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {totw.map(({ card, count }) => (
                  <div key={card.id} className="flex flex-col items-center gap-1">
                    <div className="relative rounded-[16px] p-[3px]" style={{ background: 'conic-gradient(from 0deg, #22d3ee, #a855f7, #f43f5e, #facc15, #22d3ee)' }}>
                      <PlayerCardUI card={card} size="sm" tilt={false} />
                      <span className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black px-2 text-[10px] font-black uppercase tracking-wider text-cyan-200 ring-1 ring-cyan-300">TOTW</span>
                    </div>
                    <span className="text-xs font-bold text-white/80">×{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

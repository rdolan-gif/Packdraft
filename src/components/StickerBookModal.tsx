import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PLAYERS, PLAYERS_BY_ID } from '../data/players';
import { CLUBS, getClub } from '../data/clubs';
import { eraColour } from '../data/eraColours';
import { TIER_RANK } from '../engine/packGenerator';
import { loadBook } from '../engine/stickerBook';
import { sfx } from '../engine/soundEffects';
import type { Club, PlayerCard, Position, Tier } from '../types/game';
import { PlayerCaricature } from './PlayerCaricature';

// A retro football sticker album: hardback cover, contents, one spread per club (stickers ordered
// by position, then rarity), printed empty slots, page turns, and foil honours at the back.

const POSITION_ORDER: Position[] = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST'];
const GROUP_NAME: Record<Position, string> = {
  GK: 'Goalkeepers', RB: 'Right-backs', CB: 'Centre-backs', LB: 'Left-backs', CDM: 'Holding midfield', CM: 'Central midfield',
  CAM: 'Playmakers', RM: 'Right midfield', LM: 'Left midfield', RW: 'Right wing', LW: 'Left wing', ST: 'Strikers',
};
const TIERS: Tier[] = ['PRIME_ICON', 'RISING_WORLD', 'ELITE', 'STANDARD'];
const TIER_NAME: Record<Tier, string> = { PRIME_ICON: 'Prime holo', RISING_WORLD: 'Gold foil', ELITE: 'Elite colour', STANDARD: 'Squad' };

const PAPER = '#f3ead3';
const INK = '#2b2118';

const pct = (a: number, b: number) => (b ? Math.floor((a / b) * 100) : 0);
const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
const tilt = (id: string) => ((Math.abs(hash(id)) % 50) - 25) / 10; // -2.5..2.5 deg

type Page = { kind: 'cover' } | { kind: 'contents' } | { kind: 'club'; code: string } | { kind: 'honours' };

export function StickerBookModal({ onClose }: { onClose: () => void }) {
  const book = useMemo(loadBook, []);
  const has = useCallback((c: PlayerCard) => !!book.pulled[c.id], [book]);

  // club -> its cards, ordered by position, then rarity (best first), then OVR; numbered through the album
  const { clubs, byClub, numberOf } = useMemo(() => {
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
    const list = Object.values(CLUBS).filter((c) => m.has(c.code)).sort((a, b) => a.name.localeCompare(b.name));
    const num: Record<string, number> = {};
    let n = 0;
    list.forEach((c) => m.get(c.code)!.forEach((p) => (num[p.id] = ++n)));
    return { clubs: list, byClub: m, numberOf: num };
  }, []);

  const pages: Page[] = useMemo(() => [{ kind: 'cover' }, { kind: 'contents' }, ...clubs.map((c) => ({ kind: 'club' as const, code: c.code })), { kind: 'honours' }], [clubs]);
  const [page, setPage] = useState(0);
  const [turn, setTurn] = useState<{ dir: 'next' | 'prev'; key: number } | null>(null);
  const turnTimer = useRef<number | null>(null);

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= pages.length || to === page) return;
      sfx.flip();
      setTurn({ dir: to > page ? 'next' : 'prev', key: Date.now() });
      if (turnTimer.current) clearTimeout(turnTimer.current);
      turnTimer.current = window.setTimeout(() => setTurn(null), 650);
      setPage(to);
      document.getElementById('album-scroll')?.scrollTo({ top: 0 });
    },
    [page, pages.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(page + 1);
      if (e.key === 'ArrowLeft') go(page - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, page]);

  // swipe to turn on touch screens
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const total = PLAYERS.length;
  const got = PLAYERS.filter(has).length;
  const current = pages[page];

  const totw = Object.entries(book.totw)
    .map(([id, v]) => ({ card: PLAYERS_BY_ID[id], ...v }))
    .filter((x) => x.card)
    .sort((a, b) => b.count - a.count || b.card.ovr - a.card.ovr);

  return (
    <div
      id="album-scroll"
      className="fixed inset-0 z-[95] overflow-y-auto overscroll-contain p-2 sm:p-5"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #4a3424, #20140c 70%)' }}
      onClick={onClose}
      role="dialog"
      aria-label="Sticker album"
    >
      {/* wood grain */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.12]" style={{ background: 'repeating-linear-gradient(95deg, #000 0 2px, transparent 2px 9px, #000 9px 10px, transparent 10px 23px)' }} />
      <div className="relative mx-auto max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center gap-2">
          <button onClick={() => go(1)} className="rounded-lg bg-black/40 px-2 py-1.5 text-xs font-black uppercase tracking-wider text-amber-100 hover:bg-black/60 sm:px-3">
            Contents
          </button>
          <select
            value={current.kind === 'club' ? current.code : ''}
            onChange={(e) => go(pages.findIndex((p) => p.kind === 'club' && p.code === e.target.value))}
            className="min-w-0 max-w-[34vw] rounded-lg sm:max-w-none border-0 bg-black/40 px-2 py-1.5 text-xs font-bold text-amber-100"
            aria-label="Jump to club"
          >
            <option value="" disabled>
              Jump to club…
            </option>
            {clubs.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <button onClick={() => go(pages.length - 1)} className="rounded-lg bg-black/40 px-2 py-1.5 text-xs font-black uppercase tracking-wider text-amber-100 hover:bg-black/60 sm:px-3">
            Honours
          </button>
          <span className="ml-auto hidden text-xs font-bold text-amber-100/70 sm:block">
            {got} / {total} stuck in · {pct(got, total)}%
          </span>
          <button onClick={onClose} className="rounded-lg bg-black/50 p-2 text-white hover:bg-black/70" aria-label="Close sticker album">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="relative [perspective:2400px]"
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s || e.pointerType === 'mouse') return;
            const dx = e.clientX - s.x;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(page + (dx < 0 ? 1 : -1));
          }}
        >
          {current.kind === 'cover' ? (
            <Cover got={got} total={total} book={book} onOpen={() => go(1)} />
          ) : (
            <Spread key={page} turn={turn}>
              {current.kind === 'contents' && <Contents clubs={clubs} byClub={byClub} has={has} got={got} total={total} pages={pages} go={go} />}
              {current.kind === 'club' && (
                <ClubSpread club={getClub(current.code)} cards={byClub.get(current.code)!} has={has} drafted={book.drafted} numberOf={numberOf} pageNo={page * 2} />
              )}
              {current.kind === 'honours' && <Honours totw={totw} pageNo={page * 2} />}
            </Spread>
          )}

          {/* page-turn arrows */}
          {page > 0 && (
            <button onClick={() => go(page - 1)} className="absolute -left-1 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/60 p-2 text-amber-100 shadow-lg hover:bg-black/80 sm:-left-5" aria-label="Previous page">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {page < pages.length - 1 && (
            <button onClick={() => go(page + 1)} className="absolute -right-1 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/60 p-2 text-amber-100 shadow-lg hover:bg-black/80 sm:-right-5" aria-label="Next page">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
        <div className="mt-2 text-center text-[11px] font-bold text-amber-100/60">
          {current.kind === 'cover' ? 'Tap to open' : `Spread ${page} of ${pages.length - 1}`} · ← → to turn pages{' '}
          <span className="sm:hidden">· swipe to turn</span>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── album furniture ─────────────────────────────

function Spread({ children, turn }: { children: ReactNode; turn: { dir: 'next' | 'prev'; key: number } | null }) {
  return (
    <div className="relative">
      {/* page edges peeking out underneath */}
      <div className="absolute inset-x-1 -bottom-1.5 top-1.5 rounded-md bg-[#d9cdb0]" />
      <div className="absolute inset-x-2 -bottom-3 top-3 rounded-md bg-[#c9bc9c]" />
      <div className="relative grid grid-cols-1 overflow-hidden rounded-md shadow-[0_25px_60px_rgba(0,0,0,.6)] md:grid-cols-2" style={{ background: PAPER }}>
        {/* paper fibre + print dots */}
        <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: 'radial-gradient(rgba(120,90,50,.08) 1px, transparent 1.2px) 0 0/6px 6px' }} />
        {/* spine shading */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-16 -translate-x-1/2 md:block" style={{ background: 'linear-gradient(90deg, transparent, rgba(60,40,20,.28) 45%, rgba(30,20,10,.45) 50%, rgba(60,40,20,.28) 55%, transparent)' }} />
        {children}
      </div>
      {/* the turning leaf */}
      {turn && (
        <div
          key={turn.key}
          className={`pointer-events-none absolute inset-y-0 z-20 hidden w-1/2 md:block ${turn.dir === 'next' ? 'left-1/2 origin-left animate-leafnext' : 'left-0 origin-right animate-leafprev'}`}
          style={{ background: `linear-gradient(${turn.dir === 'next' ? 90 : 270}deg, #e6dcc2, ${PAPER} 30%, #fffaf0)`, boxShadow: '0 0 40px rgba(0,0,0,.35)', backfaceVisibility: 'hidden' }}
        />
      )}
    </div>
  );
}

function PaperPage({ children, side, pageNo }: { children: ReactNode; side: 'left' | 'right'; pageNo?: number }) {
  return (
    <div className={`relative min-h-[420px] p-4 pb-8 sm:p-6 sm:pb-9 ${side === 'left' ? 'md:pr-9' : 'md:pl-9'}`} style={{ color: INK }}>
      {children}
      {pageNo !== undefined && <div className={`absolute bottom-2 font-display text-sm text-[#8a7a60] ${side === 'left' ? 'left-5' : 'right-5'}`}>{pageNo}</div>}
    </div>
  );
}

function Cover({ got, total, book, onOpen }: { got: number; total: number; book: ReturnType<typeof loadBook>; onOpen: () => void }) {
  // a few of your best stickers fanned across the cover
  const best = PLAYERS.filter((p) => book.pulled[p.id])
    .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || b.ovr - a.ovr)
    .slice(0, 5);
  return (
    <button onClick={onOpen} className="group relative mx-auto block w-full max-w-xl text-left" aria-label="Open the album">
      <div className="absolute inset-x-2 -bottom-2 top-2 rounded-r-2xl rounded-l-md bg-[#d9cdb0]" />
      <div
        className="relative overflow-hidden rounded-r-2xl rounded-l-md border-l-[14px] border-[#0c2d1b] px-6 pb-8 pt-6 shadow-[0_30px_70px_rgba(0,0,0,.7)] transition group-hover:-rotate-1"
        style={{ background: 'linear-gradient(160deg, #0f5132 0%, #0b3b25 55%, #072617 100%)' }}
      >
        {/* sunburst */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 opacity-25" style={{ background: 'repeating-conic-gradient(#facc15 0 6deg, transparent 6deg 18deg)', borderRadius: '50%' }} />
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'radial-gradient(rgba(255,255,255,.18) 1px, transparent 1.3px) 0 0/5px 5px' }} />
        <div className="relative">
          <div className="inline-block -rotate-3 rounded bg-yellow-300 px-2 py-0.5 font-display text-sm tracking-[0.25em] text-black">OFFICIAL COLLECTION</div>
          <div className="mt-3 font-display text-6xl leading-[0.85] text-white drop-shadow-[0_4px_0_rgba(0,0,0,.5)] sm:text-7xl">
            PACK<span className="text-yellow-300">DRAFT</span>
            <br />
            STICKER ALBUM
          </div>
          <div className="mt-2 font-display text-xl tracking-widest text-emerald-200">THIRTY YEARS OF THE PREMIER LEAGUE</div>
          <div className="relative mt-6 flex h-40 items-end justify-center">
            {best.length === 0 ? (
              <div className="font-display text-2xl text-white/60">Open packs to start collecting!</div>
            ) : (
              best.map((c, i) => (
                <div key={c.id} className="absolute bottom-0" style={{ transform: `translateX(${(i - (best.length - 1) / 2) * 62}px) rotate(${(i - (best.length - 1) / 2) * 8}deg)`, transformOrigin: 'bottom center' }}>
                  <Sticker card={c} />
                </div>
              ))
            )}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="relative flex h-24 w-24 shrink-0 rotate-6 items-center justify-center text-center" style={{ clipPath: 'polygon(50% 0,61% 15%,79% 7%,80% 26%,98% 30%,88% 47%,100% 62%,82% 69%,85% 88%,66% 85%,55% 100%,44% 86%,25% 94%,22% 75%,3% 70%,12% 53%,0 37%,18% 30%,17% 11%,36% 15%)', background: '#ef4444' }}>
              <span className="font-display text-xl leading-none text-white">
                {total}
                <br />
                <span className="text-xs">TO COLLECT</span>
              </span>
            </div>
            <div className="min-w-0 flex-1 text-right">
              <div className="font-display text-3xl leading-none text-white">
                {got} <span className="text-white/50">/ {total}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-black/40">
                <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-400" style={{ width: `${pct(got, total)}%` }} />
              </div>
              <div className="mt-2 font-display text-lg tracking-wider text-yellow-300 group-hover:underline">OPEN ALBUM →</div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function Contents({ clubs, byClub, has, got, total, pages, go }: { clubs: Club[]; byClub: Map<string, PlayerCard[]>; has: (c: PlayerCard) => boolean; got: number; total: number; pages: Page[]; go: (i: number) => void }) {
  const half = Math.ceil(clubs.length / 2);
  const row = (c: Club) => {
    const list = byClub.get(c.code)!;
    const h = list.filter(has).length;
    const idx = pages.findIndex((p) => p.kind === 'club' && p.code === c.code);
    return (
      <button key={c.code} onClick={() => go(idx)} className="flex w-full items-center gap-2 border-b border-dotted border-[#b9a988] py-1 text-left text-sm hover:bg-[#e8dcbf]">
        <span className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/30" style={{ background: `linear-gradient(135deg, ${c.primary} 50%, ${c.secondary} 50%)` }} />
        <span className="min-w-0 flex-1 truncate font-bold">{c.name}</span>
        {h === list.length && <span className="rounded bg-[#2b2118] px-1 text-[9px] font-black text-yellow-300">COMPLETE</span>}
        <span className="tabular-nums text-xs text-[#6b5b45]">
          {h}/{list.length}
        </span>
        <span className="w-6 text-right font-display text-base">{idx * 2}</span>
      </button>
    );
  };
  const tierCount = (t: Tier) => {
    const all = PLAYERS.filter((p) => p.tier === t);
    return `${all.filter(has).length}/${all.length}`;
  };
  return (
    <>
      <PaperPage side="left" pageNo={2}>
        <div className="font-display text-4xl leading-none">CONTENTS</div>
        <div className="mb-2 text-xs text-[#6b5b45]">Every club, in order. Tap one to turn to its page.</div>
        {clubs.slice(0, half).map(row)}
      </PaperPage>
      <PaperPage side="right" pageNo={3}>
        <div className="mt-11 md:mt-[60px]">{clubs.slice(half).map(row)}</div>
        <div className="mt-5 rounded-lg border-2 border-dashed border-[#b9a988] p-3">
          <div className="font-display text-xl leading-none">STICKER GUIDE</div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {TIERS.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className={`h-4 w-3 rounded-[2px] ${t === 'PRIME_ICON' ? 'foil-holo' : t === 'RISING_WORLD' ? 'foil-gold' : ''}`} style={t === 'ELITE' ? { background: '#3b82f6' } : t === 'STANDARD' ? { background: '#94a3b8' } : undefined} />
                <span className="font-bold">{TIER_NAME[t]}</span>
                <span className="ml-auto tabular-nums text-[#6b5b45]">{tierCount(t)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-[#6b5b45]">
            {got} of {total} stuck in ({pct(got, total)}%). Every card you pull in a pack sticks itself in. ★ = you drafted it.
          </div>
        </div>
      </PaperPage>
    </>
  );
}

function ClubSpread({ club, cards, has, drafted, numberOf, pageNo }: { club: Club; cards: PlayerCard[]; has: (c: PlayerCard) => boolean; drafted: Record<string, number>; numberOf: Record<string, number>; pageNo: number }) {
  // Split the squad across the two pages, never splitting a position group if we can help it.
  const groups = POSITION_ORDER.map((pos) => ({ pos, cards: cards.filter((c) => c.positions[0] === pos) })).filter((g) => g.cards.length);
  const left: typeof groups = [];
  const right: typeof groups = [];
  let n = 0;
  groups.forEach((g) => {
    // the left page also holds the club header, so give it a little less
    if (n + g.cards.length / 2 <= cards.length * 0.45 || !left.length) left.push(g);
    else right.push(g);
    n += g.cards.length;
  });
  const gotN = cards.filter(has).length;
  const block = (g: (typeof groups)[number]) => (
    <div key={g.pos} className="mb-3">
      <div className="mb-1.5 flex items-baseline gap-2 border-b-2 pb-0.5" style={{ borderColor: club.primary }}>
        <span className="font-display text-lg leading-none">{g.pos}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#6b5b45]">{GROUP_NAME[g.pos]}</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {g.cards.map((c) => (has(c) ? <Sticker key={c.id} card={c} number={numberOf[c.id]} drafted={drafted[c.id]} /> : <EmptySlot key={c.id} card={c} number={numberOf[c.id]} />))}
      </div>
    </div>
  );
  return (
    <>
      <PaperPage side="left" pageNo={pageNo}>
        {/* club masthead */}
        <div className="relative mb-4 overflow-hidden rounded-md p-3 text-white" style={{ background: club.primary }}>
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: `repeating-linear-gradient(115deg, ${club.secondary} 0 10px, transparent 10px 26px)` }} />
          <div className="pointer-events-none absolute inset-0 opacity-25" style={{ background: 'radial-gradient(rgba(0,0,0,.6) 1.2px, transparent 1.5px) 0 0/5px 5px' }} />
          <div className="relative flex items-center gap-3">
            <ClubFoil club={club} />
            <div className="min-w-0">
              <div className="font-display text-3xl leading-[0.9] drop-shadow-[0_2px_0_rgba(0,0,0,.45)] sm:text-4xl">{club.name.toUpperCase()}</div>
              <div className="mt-1 inline-block rounded bg-black/45 px-1.5 text-[11px] font-black tracking-wider">
                {gotN} / {cards.length} STICKERS {gotN === cards.length && '· COMPLETE ★'}
              </div>
            </div>
          </div>
        </div>
        {left.map(block)}
      </PaperPage>
      <PaperPage side="right" pageNo={pageNo + 1}>
        {right.map(block)}
        {right.length === 0 && <div className="pt-10 text-center font-display text-2xl text-[#b9a988]">AUTOGRAPHS</div>}
      </PaperPage>
    </>
  );
}

function Honours({ totw, pageNo }: { totw: { card: PlayerCard; count: number }[]; pageNo: number }) {
  return (
    <>
      <PaperPage side="left" pageNo={pageNo}>
        <div className="relative mb-4 overflow-hidden rounded-md p-3 text-white" style={{ background: '#111827' }}>
          <div className="pointer-events-none absolute inset-0 foil-holo opacity-40" />
          <div className="relative">
            <div className="font-display text-4xl leading-none">HALL OF FAME</div>
            <div className="text-xs font-bold text-white/85">Team of the Week honours · special foil stickers</div>
          </div>
        </div>
        <div className="text-sm">
          Every time one of your players makes a Team of the Week, he earns a foil sticker here. They're a bonus: they don't count towards completing the album.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {totw.slice(0, 8).map(({ card, count }) => (
            <Sticker key={card.id} card={card} totw={count} />
          ))}
        </div>
        {totw.length === 0 && <div className="mt-8 text-center font-display text-2xl text-[#b9a988]">NO HONOURS YET</div>}
      </PaperPage>
      <PaperPage side="right" pageNo={pageNo + 1}>
        <div className="flex flex-wrap gap-3 md:mt-2">
          {totw.slice(8).map(({ card, count }) => (
            <Sticker key={card.id} card={card} totw={count} />
          ))}
        </div>
        {totw.length <= 8 && <div className="pt-16 text-center font-display text-2xl text-[#b9a988]">MORE SPACE FOR LEGENDS</div>}
      </PaperPage>
    </>
  );
}

// ───────────────────────────── stickers ─────────────────────────────

function ClubFoil({ club }: { club: Club }) {
  return (
    <div className="foil-silver relative flex h-16 w-14 shrink-0 items-center justify-center rounded-[3px] border-2 border-white shadow-md" title="Club foil">
      <svg viewBox="0 0 40 46" className="h-12 w-11 drop-shadow">
        <path d="M20 2 L37 8 V22 C37 33 29 40 20 44 C11 40 3 33 3 22 V8 Z" fill={club.primary} stroke={club.accent} strokeWidth="2.5" />
        <path d="M20 2 L37 8 V22 C37 33 29 40 20 44 Z" fill={club.secondary} opacity=".35" />
        <text x="20" y="28" textAnchor="middle" fontSize="11" fontWeight="900" fill={club.secondary} style={{ fontFamily: 'Bebas Neue, Impact, sans-serif' }}>
          {club.short}
        </text>
      </svg>
    </div>
  );
}

/** A collected sticker: white border, portrait on a club-colour panel, name strip, finish by rarity. */
function Sticker({ card, number, drafted, totw }: { card: PlayerCard; number?: number; drafted?: number; totw?: number }) {
  const club = getClub(card.club);
  const era = eraColour(card.era);
  const finish = totw ? 'foil-holo' : card.tier === 'PRIME_ICON' ? 'foil-holo' : card.tier === 'RISING_WORLD' ? 'foil-gold' : '';
  const frame = totw || card.tier === 'PRIME_ICON' || card.tier === 'RISING_WORLD' ? undefined : card.tier === 'ELITE' ? era.mid : '#ffffff';
  return (
    <div className="group relative transition-transform hover:z-10 hover:!rotate-0 hover:scale-110" style={{ transform: `rotate(${tilt(card.id)}deg)` }} title={`${card.season} ${card.name} · ${card.positions[0]}${drafted ? ` · drafted ${drafted}×` : ''}`}>
      <div className={`relative h-[104px] w-[78px] rounded-[4px] p-[3px] shadow-[1px_2px_3px_rgba(0,0,0,.35)] ${finish}`} style={frame ? { background: frame } : undefined}>
        <div className="relative h-full w-full overflow-hidden rounded-[2px] bg-white">
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${club.primary} 0%, ${club.primary} 62%, ${club.secondary} 62%)` }} />
          <div className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(rgba(255,255,255,.6) 1px, transparent 1.3px) 0 0/4px 4px' }} />
          <div className="absolute left-1/2 top-2 -translate-x-1/2">
            <PlayerCaricature traits={card.traits} kitPrimaryColor={club.primary} kitSecondaryColor={club.secondary} kitSleeveColor={club.sleeve} kitCollarColor={club.collar} seed={card.id} size={60} />
          </div>
          <div className="absolute left-0.5 top-0.5 rounded-sm bg-black/60 px-0.5 text-[7px] font-black leading-tight text-white">{card.season}</div>
          <div className="absolute right-0.5 top-0.5 rounded-sm bg-white/85 px-0.5 font-display text-[10px] leading-tight text-black">{card.ovr}</div>
          <div className="absolute inset-x-0 bottom-0 bg-white px-0.5 py-[1px] text-center">
            <div className="truncate font-display text-[11px] leading-tight text-black">{card.shortName.toUpperCase()}</div>
            <div className="text-[6px] font-black uppercase leading-tight text-black/60">
              {card.positions[0]} · {club.short}
            </div>
          </div>
          {/* gloss */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-transparent" />
        </div>
        {/* peeling corner */}
        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-tl-[4px]" style={{ background: 'linear-gradient(135deg, #fff 40%, #d8cfbd 50%, rgba(0,0,0,.15))' }} />
      </div>
      {number !== undefined && <div className="mt-0.5 text-center font-display text-[10px] leading-none text-[#8a7a60]">{number}</div>}
      {drafted ? <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-black text-yellow-300 shadow">★</span> : null}
      {totw ? (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black px-1.5 text-[8px] font-black uppercase tracking-wider text-cyan-200 ring-1 ring-cyan-300">TOTW ×{totw}</span>
      ) : null}
    </div>
  );
}

/** A printed slot waiting for its sticker, like the real thing: number, name, position. */
function EmptySlot({ card, number }: { card: PlayerCard; number: number }) {
  const rare = card.tier === 'PRIME_ICON' || card.tier === 'RISING_WORLD';
  return (
    <div>
      <div className={`flex h-[104px] w-[78px] flex-col items-center justify-center rounded-[4px] border text-center ${rare ? 'border-[#c9a227]' : 'border-[#c4b594]'}`} style={{ background: '#e7dcc2', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.12)' }}>
        <svg viewBox="0 0 24 24" className="h-8 w-8 opacity-25" aria-hidden="true">
          <circle cx="12" cy="8" r="4.2" fill={INK} />
          <path d="M3.5 22c0-5 3.8-8 8.5-8s8.5 3 8.5 8z" fill={INK} />
        </svg>
        <div className="font-display text-xl leading-none text-[#9b8a6c]">{number}</div>
        <div className="mt-0.5 w-full truncate px-1 text-[8px] font-black uppercase leading-tight text-[#7d6d52]">{card.shortName}</div>
        <div className="text-[7px] font-bold leading-tight text-[#9b8a6c]">
          {card.positions[0]} · {card.season}
        </div>
        {rare && <div className="mt-0.5 text-[6px] font-black uppercase tracking-wider text-[#a8862a]">{card.tier === 'PRIME_ICON' ? 'Holo' : 'Gold'} foil</div>}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PLAYERS, PLAYERS_BY_ID } from '../data/players';
import { CLUBS, getClub } from '../data/clubs';
import { eraColour } from '../data/eraColours';
import { BORN, ageInSeason } from '../data/births';
import { TIER_RANK } from '../engine/packGenerator';
import { loadBook } from '../engine/stickerBook';
import { sfx } from '../engine/soundEffects';
import type { Club, PlayerCard, Position, Tier } from '../types/game';
import { PlayerCaricature } from './PlayerCaricature';
import { PlayerCardUI } from './PlayerCardUI';
import { Flag } from './Flag';
import { collarForSeason } from '../data/kits';

// A retro football sticker album that always fits the screen. Each club runs across as many pages as
// it needs: its first (left-hand) page carries the club banner and 3 rows of stickers, every page after
// that holds 4 rows. Stickers are ordered by position, then rarity. Tap a sticker for its card profile.

const POSITION_ORDER: Position[] = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST'];
const GROUP_NAME: Record<Position, string> = {
  GK: 'Goalkeepers', RB: 'Right-backs', CB: 'Centre-backs', LB: 'Left-backs', CDM: 'Holding mids', CM: 'Central mids',
  CAM: 'Playmakers', RM: 'Right mids', LM: 'Left mids', RW: 'Right wing', LW: 'Left wing', ST: 'Strikers',
};
const TIERS: Tier[] = ['PRIME_ICON', 'RISING_WORLD', 'ELITE', 'STANDARD'];
const TIER_NAME: Record<Tier, string> = { PRIME_ICON: 'Prime holo', RISING_WORLD: 'Gold foil', ELITE: 'Elite colour', STANDARD: 'Squad', SECRET_DEV: 'Secret rare' };
const TIER_ODDS: Record<Tier, string> = { PRIME_ICON: '2% of pack cards', RISING_WORLD: '8.5% of pack cards', ELITE: '26% of pack cards', STANDARD: '63.5% of pack cards', SECRET_DEV: 'Classified' };
// Secret dev cards are an easter egg: they're kept out of every count and page until you've pulled one.
const ALBUM = PLAYERS.filter((p) => p.tier !== 'SECRET_DEV');
const SECRETS = PLAYERS.filter((p) => p.tier === 'SECRET_DEV');

const PAPER = '#f3ead3';
const INK = '#2b2118';
const BASE_W = 78; // a sticker's design size; it's scaled to fit the page
const BASE_H = 104;
const GAP = 8;

const pct = (a: number, b: number) => (b ? Math.floor((a / b) * 100) : 0);
const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
const tilt = (id: string) => ((Math.abs(hash(id)) % 50) - 25) / 10; // -2.5..2.5 deg

type Cell = { kind: 'label'; pos: Position } | { kind: 'card'; card: PlayerCard } | { kind: 'honour'; card: PlayerCard; count: number } | { kind: 'secret'; card: PlayerCard } | { kind: 'gap' };
type Page =
  | { kind: 'contents'; part: 0 | 1 }
  | { kind: 'club'; code: string; part: number; parts: number; cells: Cell[] }
  | { kind: 'honours'; part: number; parts: number; cells: Cell[] }
  | { kind: 'secret'; part: number; parts: number; cells: Cell[] }
  | { kind: 'blank'; label: string };

// ───────────────────────────── layout: fit the screen ─────────────────────────────

interface Layout {
  twoUp: boolean;
  pageW: number;
  pageH: number;
  scale: number; // sticker scale
  cols: number;
  /** Rows of stickers on a club's first page (under the banner) and on every later page. */
  bannerRows: number;
  rows: number;
  pad: number;
}

function useLayout(): Layout {
  const measure = (): Layout => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const twoUp = vw >= 820;
    const pad = vw < 480 ? 12 : 18;
    const bookW = Math.min(1180, vw - (twoUp ? 72 : 24)); // room for the turn arrows on wide screens
    const pageW = twoUp ? bookW / 2 : bookW;
    const pageH = Math.max(360, Math.min(820, vh - (vw < 480 ? 92 : 108))); // toolbar + hint above and below
    // 4 rows (plus a small running header and the page number) must fit the page height
    const inner = pageH - 2 * pad - 18 - 26;
    const rowH = inner / 4;
    const scale = Math.max(0.5, Math.min(1.1, (rowH - GAP - 12) / BASE_H));
    const cols = Math.max(3, Math.floor((pageW - 2 * pad - (twoUp ? 14 : 0) + GAP) / (BASE_W * scale + GAP)));
    // Every sticker is the same size; taller pages simply hold more rows (at least 3 under a banner, 4 elsewhere).
    const row = BASE_H * scale + 12 + GAP;
    const rows = Math.max(4, Math.floor((inner + 26) / row - 0.02) - 0);
    const bannerRows = Math.max(3, Math.floor((inner + 26 - 84) / row));
    return { twoUp, pageW, pageH, scale, cols, bannerRows, rows: Math.max(rows, 4), pad };
  };
  const [l, setL] = useState(measure);
  useEffect(() => {
    let t = 0;
    const on = () => {
      clearTimeout(t);
      t = window.setTimeout(() => setL(measure()), 120);
    };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return l;
}

/** Split a list of cells into pages: the first page (under the banner) holds fewer rows than the rest. */
function paginate(cells: Cell[], cols: number, bannerRows: number, rows: number): Cell[][] {
  const out: Cell[][] = [];
  let i = 0;
  let first = true;
  while (i < cells.length || first) {
    const cap = cols * (first ? bannerRows : rows);
    out.push(cells.slice(i, i + cap));
    i += cap;
    first = false;
  }
  return out;
}

/**
 * A club's cells, row by row: every position group starts at the left of a new row with its printed
 * label, and the rest of its last row is left blank. Rows are always full, so pages break between rows.
 */
function clubCells(cards: PlayerCard[], cols: number): Cell[] {
  const cells: Cell[] = [];
  POSITION_ORDER.forEach((pos) => {
    const group = cards.filter((c) => c.positions[0] === pos);
    if (!group.length) return;
    cells.push({ kind: 'label', pos });
    group.forEach((card) => cells.push({ kind: 'card', card }));
    while (cells.length % cols) cells.push({ kind: 'gap' });
  });
  return cells;
}

// ───────────────────────────── the album ─────────────────────────────

export function StickerBookModal({ onClose }: { onClose: () => void }) {
  const book = useMemo(loadBook, []);
  const has = useCallback((c: PlayerCard) => !!book.pulled[c.id], [book]);
  const layout = useLayout();
  const [profile, setProfile] = useState<PlayerCard | null>(null);

  // club -> its cards, ordered by position, then rarity (best first), then OVR; numbered through the album
  const { clubs, byClub, numberOf } = useMemo(() => {
    const m = new Map<string, PlayerCard[]>();
    ALBUM.forEach((p) => m.set(p.club, [...(m.get(p.club) ?? []), p]));
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

  const totw = useMemo(
    () =>
      Object.entries(book.totw)
        .map(([id, v]) => ({ card: PLAYERS_BY_ID[id], ...v }))
        .filter((x) => x.card)
        .sort((a, b) => b.count - a.count || b.card.ovr - a.card.ovr),
    [book],
  );

  // Every page of the album for the current screen size, and how they pair into spreads.
  const { pages, views, firstPageOf } = useMemo(() => {
    const pages: Page[] = [{ kind: 'contents', part: 0 }, { kind: 'contents', part: 1 }];
    const firstPageOf: Record<string, number> = {};
    // on a two-page spread every section starts on a left-hand page
    const startLeft = (label: string) => {
      if (layout.twoUp && pages.length % 2 === 1) pages.push({ kind: 'blank', label });
    };
    clubs.forEach((c) => {
      startLeft('AUTOGRAPHS');
      firstPageOf[c.code] = pages.length;
      const parts = paginate(clubCells(byClub.get(c.code)!, layout.cols), layout.cols, layout.bannerRows, layout.rows);
      parts.forEach((cells, part) => pages.push({ kind: 'club', code: c.code, part, parts: parts.length, cells }));
    });
    startLeft('AUTOGRAPHS');
    firstPageOf['__honours'] = pages.length;
    const hparts = paginate(
      totw.map((t) => ({ kind: 'honour' as const, card: t.card, count: t.count })),
      layout.cols,
      layout.bannerRows,
      layout.rows,
    );
    hparts.forEach((cells, part) => pages.push({ kind: 'honours', part, parts: hparts.length, cells }));
    // The secret files: only exist once you've found at least one dev card.
    const found = SECRETS.filter((c) => book.pulled[c.id]);
    if (found.length) {
      startLeft('');
      firstPageOf['__secret'] = pages.length;
      const sparts = paginate(found.map((card) => ({ kind: 'secret' as const, card })), layout.cols, layout.bannerRows, layout.rows);
      sparts.forEach((cells, part) => pages.push({ kind: 'secret', part, parts: sparts.length, cells }));
    }
    if (layout.twoUp && pages.length % 2 === 1) pages.push({ kind: 'blank', label: found.length ? '' : 'MORE SPACE FOR LEGENDS' });
    const views: number[][] = [[-1]]; // -1 = the cover
    for (let i = 0; i < pages.length; i += layout.twoUp ? 2 : 1) views.push(layout.twoUp ? [i, i + 1] : [i]);
    return { pages, views, firstPageOf };
  }, [clubs, byClub, totw, book, layout.twoUp, layout.cols, layout.rows, layout.bannerRows]);

  const [view, setView] = useState(0);
  const anchor = useRef<number>(-1); // first page on screen, so a resize keeps your place
  useEffect(() => {
    const v = views.findIndex((vs) => vs.includes(anchor.current));
    setView(v >= 0 ? v : Math.min(view, views.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views]);

  const [turn, setTurn] = useState<{ dir: 'next' | 'prev'; key: number } | null>(null);
  const turnTimer = useRef<number | null>(null);
  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= views.length || to === view) return;
      sfx.flip();
      setTurn({ dir: to > view ? 'next' : 'prev', key: Date.now() });
      if (turnTimer.current) clearTimeout(turnTimer.current);
      turnTimer.current = window.setTimeout(() => setTurn(null), 650);
      anchor.current = views[to][0];
      setView(to);
    },
    [view, views],
  );
  const goPage = useCallback((p: number) => go(views.findIndex((vs) => vs.includes(p))), [go, views]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (profile) return;
      if (e.key === 'ArrowRight') go(view + 1);
      if (e.key === 'ArrowLeft') go(view - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, view, profile]);

  const swipe = useRef<{ x: number; y: number } | null>(null);
  const total = ALBUM.length;
  const got = ALBUM.filter(has).length;
  const shown = views[view] ?? [-1];
  const firstShown = shown[0] >= 0 ? pages[shown[0]] : null;
  const currentClub = firstShown?.kind === 'club' ? firstShown.code : '';

  const openProfile = (c: PlayerCard) => {
    sfx.select();
    setProfile(c);
  };

  const renderPage = (i: number, side: 'left' | 'right') => {
    const p = pages[i];
    const pageNo = i + 2;
    if (!p) return <PaperPage key={`x${i}`} side={side} layout={layout} />;
    if (p.kind === 'contents') return <ContentsPage key={i} part={p.part} side={side} layout={layout} pageNo={pageNo} clubs={clubs} byClub={byClub} has={has} got={got} total={total} firstPageOf={firstPageOf} goPage={goPage} />;
    if (p.kind === 'blank')
      return (
        <PaperPage key={i} side={side} layout={layout} pageNo={pageNo}>
          <div className="flex h-full items-center justify-center font-display text-3xl text-[#c9bb98]">{p.label}</div>
        </PaperPage>
      );
    if (p.kind === 'club') {
      const club = getClub(p.code);
      const cards = byClub.get(p.code)!;
      return (
        <PaperPage key={i} side={side} layout={layout} pageNo={pageNo}>
          {p.part === 0 ? <ClubBanner club={club} got={cards.filter(has).length} total={cards.length} /> : <RunningHeader club={club} part={p.part} parts={p.parts} />}
          <Grid layout={layout} cells={p.cells} club={club} has={has} drafted={book.drafted} numberOf={numberOf} onOpen={openProfile} />
        </PaperPage>
      );
    }
    if (p.kind === 'secret')
      return (
        <PaperPage key={i} side={side} layout={layout} pageNo={pageNo}>
          {p.part === 0 ? <SecretBanner count={p.cells.length} /> : <RunningHeader club={null} part={p.part} parts={p.parts} />}
          <Grid layout={layout} cells={p.cells} club={null} has={has} drafted={book.drafted} numberOf={numberOf} onOpen={openProfile} />
        </PaperPage>
      );
    return (
      <PaperPage key={i} side={side} layout={layout} pageNo={pageNo}>
        {p.part === 0 ? <HonoursBanner count={totw.length} /> : <RunningHeader club={null} part={p.part} parts={p.parts} />}
        {p.cells.length === 0 ? (
          <div className="mt-10 px-6 text-center text-sm text-[#6b5b45]">Every time one of your players makes a Team of the Week, he earns a foil sticker here. They're a bonus: they don't count towards completing the album.</div>
        ) : (
          <Grid layout={layout} cells={p.cells} club={null} has={has} drafted={book.drafted} numberOf={numberOf} onOpen={openProfile} />
        )}
      </PaperPage>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col overflow-hidden px-2 py-2 sm:px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #4a3424, #20140c 70%)' }}
      onClick={onClose}
      role="dialog"
      aria-label="Sticker album"
    >
      {/* wood grain */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.12]" style={{ background: 'repeating-linear-gradient(95deg, #000 0 2px, transparent 2px 9px, #000 9px 10px, transparent 10px 23px)' }} />
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-1 flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center gap-2">
          <button onClick={() => go(1)} className="rounded-lg bg-black/40 px-2 py-1.5 text-xs font-black uppercase tracking-wider text-amber-100 hover:bg-black/60 sm:px-3">
            Contents
          </button>
          <select
            value={currentClub}
            onChange={(e) => goPage(firstPageOf[e.target.value])}
            className="min-w-0 max-w-[34vw] rounded-lg border-0 bg-black/40 px-2 py-1.5 text-xs font-bold text-amber-100 sm:max-w-none"
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
          <button onClick={() => goPage(firstPageOf['__honours'])} className="rounded-lg bg-black/40 px-2 py-1.5 text-xs font-black uppercase tracking-wider text-amber-100 hover:bg-black/60 sm:px-3">
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
          className="relative flex flex-1 items-start justify-center [perspective:2400px]"
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s || e.pointerType === 'mouse') return;
            const dx = e.clientX - s.x;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(view + (dx < 0 ? 1 : -1));
          }}
        >
          {shown[0] === -1 ? (
            <Cover got={got} total={total} book={book} height={layout.pageH} onOpen={() => go(1)} />
          ) : (
            <Spread key={view} turn={layout.twoUp ? turn : null} layout={layout}>
              {renderPage(shown[0], 'left')}
              {layout.twoUp && renderPage(shown[1], 'right')}
            </Spread>
          )}

          {view > 0 && (
            <button onClick={() => go(view - 1)} className="absolute left-0 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/60 p-2 text-amber-100 shadow-lg hover:bg-black/80" aria-label="Previous page">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {view < views.length - 1 && (
            <button onClick={() => go(view + 1)} className="absolute right-0 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/60 p-2 text-amber-100 shadow-lg hover:bg-black/80" aria-label="Next page">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
        <div className="mt-1 text-center text-[11px] font-bold text-amber-100/60">
          {view === 0 ? 'Tap to open' : `${layout.twoUp ? 'Spread' : 'Page'} ${view} of ${views.length - 1}`} · tap a sticker for its card · <span className="hidden sm:inline">← → to turn pages</span>
          <span className="sm:hidden">swipe to turn</span>
        </div>
      </div>

      {profile && <StickerProfile card={profile} book={book} number={numberOf[profile.id]} onClose={() => setProfile(null)} />}
    </div>
  );
}

// ───────────────────────────── album furniture ─────────────────────────────

function Spread({ children, turn, layout }: { children: ReactNode; turn: { dir: 'next' | 'prev'; key: number } | null; layout: Layout }) {
  return (
    <div className="relative" style={{ width: layout.twoUp ? layout.pageW * 2 : layout.pageW }}>
      {/* page edges peeking out underneath */}
      <div className="absolute inset-x-1 -bottom-1.5 top-1.5 rounded-md bg-[#d9cdb0]" />
      <div className="absolute inset-x-2 -bottom-3 top-3 rounded-md bg-[#c9bc9c]" />
      <div className={`relative grid overflow-hidden rounded-md shadow-[0_25px_60px_rgba(0,0,0,.6)] ${layout.twoUp ? 'grid-cols-2' : 'grid-cols-1'}`} style={{ background: PAPER }}>
        {/* paper fibre + print dots */}
        <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: 'radial-gradient(rgba(120,90,50,.08) 1px, transparent 1.2px) 0 0/6px 6px' }} />
        {layout.twoUp && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-16 -translate-x-1/2" style={{ background: 'linear-gradient(90deg, transparent, rgba(60,40,20,.28) 45%, rgba(30,20,10,.45) 50%, rgba(60,40,20,.28) 55%, transparent)' }} />
        )}
        {children}
      </div>
      {turn && (
        <div
          key={turn.key}
          className={`pointer-events-none absolute inset-y-0 z-20 w-1/2 ${turn.dir === 'next' ? 'left-1/2 origin-left animate-leafnext' : 'left-0 origin-right animate-leafprev'}`}
          style={{ background: `linear-gradient(${turn.dir === 'next' ? 90 : 270}deg, #e6dcc2, ${PAPER} 30%, #fffaf0)`, boxShadow: '0 0 40px rgba(0,0,0,.35)', backfaceVisibility: 'hidden' }}
        />
      )}
    </div>
  );
}

function PaperPage({ children, side, pageNo, layout }: { children?: ReactNode; side: 'left' | 'right'; pageNo?: number; layout: Layout }) {
  const spine = layout.twoUp ? 14 : 0;
  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{
        color: INK,
        height: layout.pageH,
        paddingTop: layout.pad,
        paddingBottom: layout.pad + 16,
        paddingLeft: layout.pad + (side === 'right' ? spine : 0),
        paddingRight: layout.pad + (side === 'left' ? spine : 0),
      }}
    >
      {children}
      {pageNo !== undefined && <div className={`absolute bottom-2 font-display text-sm text-[#8a7a60] ${side === 'left' ? 'left-5' : 'right-5'}`}>{pageNo}</div>}
    </div>
  );
}

function ClubBanner({ club, got, total }: { club: Club; got: number; total: number }) {
  return (
    <div className="relative mb-2 shrink-0 overflow-hidden rounded-md px-3 py-2 text-white" style={{ background: club.primary }}>
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: `repeating-linear-gradient(115deg, ${club.secondary} 0 10px, transparent 10px 26px)` }} />
      <div className="pointer-events-none absolute inset-0 opacity-25" style={{ background: 'radial-gradient(rgba(0,0,0,.6) 1.2px, transparent 1.5px) 0 0/5px 5px' }} />
      <div className="relative flex items-center gap-3">
        <ClubFoil club={club} />
        <div className="min-w-0">
          <div className="truncate font-display text-3xl leading-[0.9] drop-shadow-[0_2px_0_rgba(0,0,0,.45)] sm:text-4xl">{club.name.toUpperCase()}</div>
          <div className="mt-1 inline-block rounded bg-black/45 px-1.5 text-[11px] font-black tracking-wider">
            {got} / {total} STICKERS {got === total && '· COMPLETE ★'}
          </div>
        </div>
      </div>
    </div>
  );
}

function HonoursBanner({ count }: { count: number }) {
  return (
    <div className="relative mb-2 shrink-0 overflow-hidden rounded-md px-3 py-2 text-white" style={{ background: '#111827' }}>
      <div className="foil-holo pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative">
        <div className="font-display text-4xl leading-none">HALL OF FAME</div>
        <div className="text-xs font-bold text-white/85">Team of the Week honours · {count} foil sticker{count === 1 ? '' : 's'}</div>
      </div>
    </div>
  );
}

function SecretBanner({ count }: { count: number }) {
  return (
    <div className="relative mb-2 shrink-0 overflow-hidden rounded-md px-3 py-2 text-white" style={{ background: '#09090b' }}>
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: 'linear-gradient(110deg, #f472b6, #fbbf24, #22d3ee, #a78bfa)', filter: 'blur(18px)' }} />
      <div className="relative">
        <div className="font-display text-4xl leading-none">SECRET FILES</div>
        <div className="text-xs font-bold text-white/85">Classified · {count} found · tell nobody</div>
      </div>
    </div>
  );
}

/** Small header on a club's follow-on pages, like a real album's running head. */
function RunningHeader({ club, part, parts }: { club: Club | null; part: number; parts: number }) {
  return (
    <div className="mb-2 flex h-[26px] shrink-0 items-center gap-2 border-b-2 pb-1" style={{ borderColor: club?.primary ?? '#111827' }}>
      <span className="h-3.5 w-3.5 rounded-sm border border-black/30" style={{ background: club ? `linear-gradient(135deg, ${club.primary} 50%, ${club.secondary} 50%)` : '#111827' }} />
      <span className="font-display text-lg leading-none">{club ? club.name.toUpperCase() : 'HALL OF FAME'}</span>
      <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-[#8a7a60]">
        Page {part + 1} of {parts}
      </span>
    </div>
  );
}

function Grid({ layout, cells, club, has, drafted, numberOf, onOpen }: { layout: Layout; cells: Cell[]; club: Club | null; has: (c: PlayerCard) => boolean; drafted: Record<string, number>; numberOf: Record<string, number>; onOpen: (c: PlayerCard) => void }) {
  const w = BASE_W * layout.scale;
  return (
    <div className="grid content-start justify-center" style={{ gridTemplateColumns: `repeat(${layout.cols}, ${w}px)`, columnGap: GAP, rowGap: GAP }}>
      {cells.map((cell, i) => {
        if (cell.kind === 'gap') return <div key={`g${i}`} style={{ width: w }} aria-hidden="true" />;
        if (cell.kind === 'label') return <PositionLabel key={`l${cell.pos}${i}`} pos={cell.pos} scale={layout.scale} colour={club?.primary ?? INK} />;
        if (cell.kind === 'secret')
          return (
            <Scaled key={cell.card.id} scale={layout.scale} label={undefined}>
              <Sticker card={cell.card} drafted={drafted[cell.card.id]} onClick={() => onOpen(cell.card)} />
            </Scaled>
          );
        if (cell.kind === 'honour')
          return (
            <Scaled key={cell.card.id} scale={layout.scale} label={undefined}>
              <Sticker card={cell.card} totw={cell.count} onClick={() => onOpen(cell.card)} />
            </Scaled>
          );
        const c = cell.card;
        return (
          <Scaled key={c.id} scale={layout.scale} label={numberOf[c.id]}>
            {has(c) ? <Sticker card={c} drafted={drafted[c.id]} onClick={() => onOpen(c)} /> : <EmptySlot card={c} number={numberOf[c.id]} onClick={() => onOpen(c)} />}
          </Scaled>
        );
      })}
    </div>
  );
}

/** Draws a sticker at its design size and scales it to the page; the sticker number sits underneath. */
function Scaled({ scale, children, label }: { scale: number; children: ReactNode; label: number | undefined }) {
  return (
    <div style={{ width: BASE_W * scale }}>
      <div style={{ width: BASE_W * scale, height: BASE_H * scale }}>
        <div style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
      </div>
      <div className="h-3 text-center font-display text-[10px] leading-3 text-[#8a7a60]">{label ?? ''}</div>
    </div>
  );
}

/** A printed box introducing each position group. */
function PositionLabel({ pos, scale, colour }: { pos: Position; scale: number; colour: string }) {
  return (
    <div style={{ width: BASE_W * scale, height: BASE_H * scale }} className="flex flex-col items-center justify-center rounded-[4px] border-2 border-dashed text-center" aria-label={GROUP_NAME[pos]}>
      <div className="font-display leading-none" style={{ fontSize: 30 * scale, color: colour }}>
        {pos}
      </div>
      <div className="font-black uppercase leading-tight text-[#6b5b45]" style={{ fontSize: Math.max(7, 9 * scale) }}>
        {GROUP_NAME[pos]}
      </div>
    </div>
  );
}

function Cover({ got, total, book, height, onOpen }: { got: number; total: number; book: ReturnType<typeof loadBook>; height: number; onOpen: () => void }) {
  const best = PLAYERS.filter((p) => book.pulled[p.id])
    .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || b.ovr - a.ovr)
    .slice(0, 5);
  const k = Math.min(1, height / 640); // shrink the whole cover on short screens
  return (
    <div style={{ height }} className="flex w-full items-start justify-center">
      <button onClick={onOpen} className="group relative block w-[560px] max-w-full text-left" style={{ transform: `scale(${k})`, transformOrigin: 'top center' }} aria-label="Open the album">
        <div className="absolute inset-x-2 -bottom-2 top-2 rounded-l-md rounded-r-2xl bg-[#d9cdb0]" />
        <div
          className="relative overflow-hidden rounded-l-md rounded-r-2xl border-l-[14px] border-[#0c2d1b] px-6 pb-8 pt-6 shadow-[0_30px_70px_rgba(0,0,0,.7)] transition group-hover:-rotate-1"
          style={{ background: 'linear-gradient(160deg, #0f5132 0%, #0b3b25 55%, #072617 100%)' }}
        >
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
    </div>
  );
}

function ContentsPage({
  part, side, layout, pageNo, clubs, byClub, has, got, total, firstPageOf, goPage,
}: {
  part: 0 | 1; side: 'left' | 'right'; layout: Layout; pageNo: number; clubs: Club[]; byClub: Map<string, PlayerCard[]>; has: (c: PlayerCard) => boolean;
  got: number; total: number; firstPageOf: Record<string, number>; goPage: (p: number) => void;
}) {
  const half = Math.ceil(clubs.length / 2);
  const list = part === 0 ? clubs.slice(0, half) : clubs.slice(half);
  const tierCount = (t: Tier) => {
    const all = PLAYERS.filter((p) => p.tier === t);
    return `${all.filter(has).length}/${all.length}`;
  };
  return (
    <PaperPage side={side} layout={layout} pageNo={pageNo}>
      {part === 0 ? (
        <div className="mb-1 shrink-0">
          <div className="font-display text-4xl leading-none">CONTENTS</div>
          <div className="text-xs text-[#6b5b45]">Every club, in order. Tap one to turn to its page.</div>
        </div>
      ) : (
        <div className="mb-1 h-[52px] shrink-0" />
      )}
      {/* rows share the page height evenly so the list always fits */}
      <div className="flex min-h-0 flex-1 flex-col">
        {list.map((c) => {
          const cards = byClub.get(c.code)!;
          const h = cards.filter(has).length;
          return (
            <button key={c.code} onClick={() => goPage(firstPageOf[c.code])} className="flex min-h-0 flex-1 items-center gap-2 border-b border-dotted border-[#b9a988] text-left text-[13px] leading-none hover:bg-[#e8dcbf]">
              <span className="h-3 w-3 shrink-0 rounded-sm border border-black/30" style={{ background: `linear-gradient(135deg, ${c.primary} 50%, ${c.secondary} 50%)` }} />
              <span className="min-w-0 flex-1 truncate font-bold">{c.name}</span>
              {h === cards.length && <span className="rounded bg-[#2b2118] px-1 text-[9px] font-black text-yellow-300">COMPLETE</span>}
              <span className="tabular-nums text-xs text-[#6b5b45]">
                {h}/{cards.length}
              </span>
              <span className="w-7 text-right font-display text-base">{firstPageOf[c.code] + 2}</span>
            </button>
          );
        })}
      </div>
      {part === 1 && (
        <div className="mt-2 shrink-0 rounded-lg border-2 border-dashed border-[#b9a988] p-2">
          <div className="font-display text-lg leading-none">STICKER GUIDE</div>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
            {TIERS.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className={`h-3.5 w-2.5 rounded-[2px] ${t === 'PRIME_ICON' ? 'foil-holo' : t === 'RISING_WORLD' ? 'foil-gold' : ''}`} style={t === 'ELITE' ? { background: '#3b82f6' } : t === 'STANDARD' ? { background: '#94a3b8' } : undefined} />
                <span className="font-bold">{TIER_NAME[t]}</span>
                <span className="ml-auto tabular-nums text-[#6b5b45]">{tierCount(t)}</span>
              </div>
            ))}
          </div>
          <div className="mt-1 text-[10px] text-[#6b5b45]">
            {got} of {total} stuck in ({pct(got, total)}%). ★ = you drafted it. Tap any sticker to see its card.
          </div>
        </div>
      )}
    </PaperPage>
  );
}

// ───────────────────────────── stickers ─────────────────────────────

function ClubFoil({ club }: { club: Club }) {
  return (
    <div className="foil-silver relative flex h-14 w-12 shrink-0 items-center justify-center rounded-[3px] border-2 border-white shadow-md" title="Club foil">
      <svg viewBox="0 0 40 46" className="h-11 w-10 drop-shadow">
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
function Sticker({ card, drafted, totw, onClick }: { card: PlayerCard; drafted?: number; totw?: number; onClick?: () => void }) {
  const club = getClub(card.club);
  const era = eraColour(card.era);
  const finish = card.tier === 'SECRET_DEV' ? 'foil-holo' : totw ? 'foil-holo' : card.tier === 'PRIME_ICON' ? 'foil-holo' : card.tier === 'RISING_WORLD' ? 'foil-gold' : '';
  const frame = totw || card.tier === 'PRIME_ICON' || card.tier === 'RISING_WORLD' || card.tier === 'SECRET_DEV' ? undefined : card.tier === 'ELITE' ? era.mid : '#ffffff';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`group relative block text-left transition-transform hover:z-10 hover:!rotate-0 ${onClick ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500' : ''}`}
      style={{ transform: `rotate(${tilt(card.id)}deg)` }}
      aria-label={`${card.season} ${card.name}`}
    >
      <div className={`relative h-[104px] w-[78px] rounded-[4px] p-[3px] shadow-[1px_2px_3px_rgba(0,0,0,.35)] ${finish}`} style={frame ? { background: frame } : undefined}>
        <div className="relative h-full w-full overflow-hidden rounded-[2px] bg-white">
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${club.primary} 0%, ${club.primary} 62%, ${club.secondary} 62%)` }} />
          <div className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(rgba(255,255,255,.6) 1px, transparent 1.3px) 0 0/4px 4px' }} />
          <div className="absolute left-1/2 top-2 -translate-x-1/2">
            <PlayerCaricature traits={card.traits} kitPrimaryColor={club.primary} kitSecondaryColor={club.secondary} kitSleeveColor={club.sleeve} kitCollarColor={club.collar} collarStyle={collarForSeason(card.season)} seed={card.id} size={60} />
          </div>
          <div className="absolute left-0.5 top-0.5 rounded-sm bg-black/60 px-0.5 text-[7px] font-black leading-tight text-white">{card.season}</div>
          <div className="absolute right-0.5 top-0.5 rounded-sm bg-white/85 px-0.5 font-display text-[10px] leading-tight text-black">{card.ovr}</div>
          <div className="absolute inset-x-0 bottom-0 bg-white px-0.5 py-[1px] text-center">
            <div className="truncate font-display text-[11px] leading-tight text-black">{card.shortName.toUpperCase()}</div>
            <div className="text-[6px] font-black uppercase leading-tight text-black/60">
              {card.positions[0]} · {club.short}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-transparent" />
        </div>
        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-tl-[4px]" style={{ background: 'linear-gradient(135deg, #fff 40%, #d8cfbd 50%, rgba(0,0,0,.15))' }} />
      </div>
      {drafted ? <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-black text-yellow-300 shadow">★</span> : null}
      {totw ? (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black px-1.5 text-[8px] font-black uppercase tracking-wider text-cyan-200 ring-1 ring-cyan-300">TOTW ×{totw}</span>
      ) : null}
    </Tag>
  );
}

/** A printed slot waiting for its sticker, like the real thing: number, name, position. */
function EmptySlot({ card, number, onClick }: { card: PlayerCard; number: number; onClick: () => void }) {
  const rare = card.tier === 'PRIME_ICON' || card.tier === 'RISING_WORLD';
  return (
    <button
      onClick={onClick}
      className={`flex h-[104px] w-[78px] flex-col items-center justify-center rounded-[4px] border text-center hover:bg-[#ece2c8] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${rare ? 'border-[#c9a227]' : 'border-[#c4b594]'}`}
      style={{ background: '#e7dcc2', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.12)' }}
      aria-label={`Sticker ${number}: ${card.name} ${card.season}, not collected yet`}
    >
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
    </button>
  );
}

// ───────────────────────────── card profile ─────────────────────────────

/** Tap a sticker: the full card with stats (or, for a missing sticker, just what's printed in the slot). */
function StickerProfile({ card, book, number, onClose }: { card: PlayerCard; book: ReturnType<typeof loadBook>; number: number; onClose: () => void }) {
  const owned = !!book.pulled[card.id];
  const club = getClub(card.club);
  const age = ageInSeason(BORN[card.basePlayerId], card.season);
  const era = eraColour(card.era);
  const drafted = book.drafted[card.id] ?? 0;
  const totw = book.totw[card.id]?.count ?? 0;
  const pulled = book.pulled[card.id];
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopImmediatePropagation(), onClose()); // close just the card, not the album
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);
  const rows: [string, ReactNode][] = [
    ['Club', club.name],
    ['Season', card.season],
    ['Nation', <span key="n" className="inline-flex items-center gap-1.5"><Flag nation={card.nation} width={22} className="rounded-[2px] shadow-sm" />{card.nation}</span>],
    ['Age that season', age ?? '—'],
    ['Positions', card.positions.join(' / ')],
    ['Rarity', `${TIER_NAME[card.tier]} · ${TIER_ODDS[card.tier]}`],
  ];
  if (owned) {
    rows.splice(5, 0, ['Archetype', card.archetype], ['Era label', <span key="e" className="rounded px-1.5 text-[11px] font-black text-white" style={{ background: era.mid }}>{card.era}</span>]);
    rows.push(['First pulled', pulled ? new Date(pulled).toLocaleDateString() : '—'], ['Drafted', drafted ? `${drafted}×` : 'Not yet'], ['Team of the Week', totw ? `${totw}×` : '—']);
  }
  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center overflow-y-auto bg-black/75 p-3" onClick={onClose} role="dialog" aria-label={`${card.name} card`}>
      <div className="relative flex w-full max-w-2xl animate-pop flex-col items-center gap-4 rounded-2xl border-2 p-4 sm:flex-row sm:items-start sm:p-5" style={{ background: PAPER, color: INK, borderColor: club.primary }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-2 top-2 rounded-lg bg-black/10 p-1.5 hover:bg-black/20" aria-label="Close card">
          <X className="h-5 w-5" />
        </button>
        <div className="shrink-0">
          {owned ? (
            <PlayerCardUI card={card} size="lg" showStats tilt={false} />
          ) : (
            <div className="flex h-[286px] w-[196px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#b9a988] bg-[#e7dcc2] text-center">
              <svg viewBox="0 0 24 24" className="h-20 w-20 opacity-25" aria-hidden="true">
                <circle cx="12" cy="8" r="4.2" fill={INK} />
                <path d="M3.5 22c0-5 3.8-8 8.5-8s8.5 3 8.5 8z" fill={INK} />
              </svg>
              <div className="font-display text-4xl text-[#9b8a6c]">{number}</div>
              <div className="px-3 text-xs font-bold text-[#7d6d52]">Not collected yet. Pull it in a pack to see the full card.</div>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 self-stretch">
          <div className="text-[11px] font-black uppercase tracking-widest text-[#8a7a60]">{number ? `Sticker ${number}` : 'Secret file'}</div>
          <div className="font-display text-4xl leading-none">{card.name.toUpperCase()}</div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-bold text-[#6b5b45]">{k}</dt>
                <dd className="min-w-0">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

import { AlertTriangle, ArrowLeftRight, Hand, Info, Link2, MousePointerClick, RefreshCw } from 'lucide-react';
import { FORMATIONS, pitchY } from '../data/formations';
import { MANAGERS_BY_ID } from '../data/managers';
import { fitFor, neighbours } from '../engine/chemistry';
import type { FormationId, Lineup, ManagerId, PlayerCard, TeamRating } from '../types/game';
import { PlayerCardUI } from './PlayerCardUI';
import { Pressable, useFinePointer } from './Pressable';

interface Props {
  formationId: FormationId;
  lineup: Lineup;
  rating: TeamRating;
  managerId: ManagerId | null;
  pendingCard: PlayerCard | null;
  swapSource: string | null;
  onSlotClick: (slotId: string) => void;
  /** Open the stats panel for a filled slot. */
  onInspect?: (slotId: string) => void;
  /** Open the manager objective panel. */
  onManagerInfo?: () => void;
  rerollAvailable?: boolean;
  compact?: boolean;
}

// Link lines: every possible link is drawn in faint grey; once two players link it fills with a colour
// for how much chemistry it gives: weak (1) white, medium (2) orange, strong (3–4) green. Famous duos are striped.
const STRENGTH_COLOR = ['', '#fff6e0', '#ff8a1f', '#2fd16a', '#2fd16a'] as const;
const STRENGTH_LABEL = ['', 'Weak', 'Medium', 'Strong', 'Strong'] as const;
const LINK_EMPTY = 'rgba(255,255,255,0.28)';
const DUO_STRIPE = '#ffd400';
const LINK_INK = '#14183a';
const FIT_STYLE = {
  natural: 'border-emerald-400 bg-emerald-400/20 text-emerald-200',
  secondary: 'border-lime-300 bg-lime-300/15 text-lime-200',
  adjacent: 'border-amber-400 bg-amber-400/15 text-amber-200',
  oop: 'border-rose-500 bg-rose-500/15 text-rose-200',
} as const;

export function TacticalPitch({ formationId, lineup, rating, managerId, pendingCard, swapSource, onSlotClick, onInspect, onManagerInfo, rerollAvailable, compact }: Props) {
  const fine = useFinePointer();
  const formation = FORMATIONS[formationId];
  const slotById = Object.fromEntries(formation.slots.map((s) => [s.id, s]));
  const fitById = Object.fromEntries(rating.fits.map((f) => [f.slotId, f]));
  const manager = managerId ? MANAGERS_BY_ID[managerId] : null;
  const filled = formation.slots.filter((s) => lineup[s.id]).length;

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Rating bar */}
      {!compact && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-[14px] border-4 border-ink bg-flare-500 p-2 text-ink shadow-[5px_5px_0_#14183a]">
            <div className="text-[11px] font-black uppercase tracking-widest">Team Rating</div>
            <div className="font-display text-[40px] leading-none">{filled ? rating.overall.toFixed(1) : '--'}</div>
            <div className="text-[10px] text-white/50">
              base {filled ? rating.baseAvg.toFixed(1) : '--'} {rating.chemBonus >= 0 ? '+' : ''}
              {rating.chemBonus.toFixed(1)} chem
            </div>
          </div>
          <div className="rounded-[14px] border-4 border-ink bg-white p-2 text-ink shadow-[5px_5px_0_#14183a]">
            <div className="text-[11px] font-black uppercase tracking-widest">Chemistry</div>
            <div className="font-display text-[40px] leading-none text-album-blue">{rating.chemistry}</div>
            <div className="mx-auto mt-1 h-2.5 w-full overflow-hidden rounded-md border-2 border-ink bg-album-cream">
              <div className="h-full bg-album-blue transition-all duration-500" style={{ width: `${rating.chemistry}%` }} />
            </div>
          </div>
          <Pressable
            onTap={onManagerInfo}
            onHold={onManagerInfo}
            showHoldRing={false}
            ariaLabel="Show manager objective"
            className={`group rounded-[14px] border-4 border-ink p-2 text-ink shadow-[5px_5px_0_#14183a] transition active:translate-y-0.5 ${rating.managerActive ? 'bg-white' : 'bg-album-cream'}`}
          >
            <Info className="absolute right-1.5 top-1.5 h-3 w-3 text-ink/40 group-hover:text-album-red" />
            <div className="text-[11px] font-black uppercase tracking-widest">Manager</div>
            <div className={`font-display text-[40px] leading-none ${rating.managerBonus > 0 ? 'text-album-red' : 'text-ink/40'}`}>
              {manager?.id === 'fergie_time' ? '⌚' : `+${rating.managerBonus.toFixed(1)}`}
            </div>
            <div className="truncate text-[10px] font-bold text-ink/60">{manager?.emoji} {rating.managerActive ? 'ACTIVE' : 'inactive'}</div>
          </Pressable>
        </div>
      )}

      {/* Pitch */}
      <div className="pitch relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-[22px] border-[5px] border-ink shadow-[8px_8px_0_#14183a]">
        {/* markings */}
        <svg viewBox="0 0 100 125" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-40">
          <g fill="none" stroke="white" strokeWidth="0.4">
            <rect x="3" y="3" width="94" height="119" />
            <line x1="3" y1="62.5" x2="97" y2="62.5" />
            <circle cx="50" cy="62.5" r="10" />
            <rect x="25" y="3" width="50" height="17" />
            <rect x="38" y="3" width="24" height="6" />
            <rect x="25" y="105" width="50" height="17" />
            <rect x="38" y="116" width="24" height="6" />
            <path d="M 40 105 A 10 10 0 0 1 60 105" />
            <path d="M 40 20 A 10 10 0 0 0 60 20" />
          </g>
        </svg>

        {/* chemistry lines */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          {(() => {
            // total strength per neighbouring pair (all reasons added), and which pairs a famous duo covers
            const key = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);
            const strength: Record<string, number> = {};
            const duo = new Set<string>();
            rating.links.forEach((l) => {
              const k = key(l.a, l.b);
              if (l.kind === 'duo') duo.add(k);
              else strength[k] = Math.max(strength[k] ?? 0, l.strength);
            });
            const pairs = neighbours(formation).map(([a, b]) => key(a, b));
            return pairs.map((k) => {
              const [ia, ib] = k.split('|');
              const a = slotById[ia];
              const b = slotById[ib];
              if (!a || !b) return null;
              const isDuo = duo.has(k);
              const lvl = Math.min(4, (strength[k] ?? 0) + (isDuo ? 3 : 0));
              const pts = { x1: a.x, y1: pitchY(a.y), x2: b.x, y2: pitchY(b.y) };
              if (!lvl) return <line key={k} {...pts} stroke={LINK_EMPTY} strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
              return (
                <g key={k}>
                  <line {...pts} stroke={LINK_INK} strokeWidth={11} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  <line {...pts} stroke={STRENGTH_COLOR[lvl]} strokeWidth={7} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  {isDuo && <line {...pts} stroke={DUO_STRIPE} strokeWidth={7} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />}
                </g>
              );
            });
          })()}
        </svg>

        {formation.slots.map((slot) => {
          const card = lineup[slot.id];
          const fit = fitById[slot.id];
          const preview = pendingCard && !card ? fitFor(pendingCard, slot.label) : null;
          const isSwapSrc = swapSource === slot.id;
          const swapTarget = swapSource && swapSource !== slot.id;
          return (
            <Pressable
              key={slot.id}
              // Touch: tap = place / swap, hold = stats. Mouse: click = stats, unless placing or swapping.
              onTap={() => onSlotClick(slot.id)}
              onHold={card && onInspect ? () => onInspect(slot.id) : undefined}
              mouseAction={card && onInspect && !pendingCard && !swapSource ? 'hold' : 'tap'}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform max-sm:scale-[0.8] hover:z-20 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 rounded-[14px]"
              style={{ left: `${slot.x}%`, top: `${pitchY(slot.y)}%` }}
              ariaLabel={`${slot.label} slot${card ? `: ${card.name}` : ''}`}
            >
              {card ? (
                <div className={`relative ${isSwapSrc ? 'scale-110 rounded-[14px] ring-4 ring-sky-400' : swapTarget ? 'opacity-90' : ''}`}>
                  <PlayerCardUI card={card} size="xs" tilt={false} />
                  {fit && fit.fit !== 'natural' && (
                    <span
                      className={`absolute -bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-full border px-1.5 text-[8px] font-black ${FIT_STYLE[fit.fit]}`}
                      title={`Playing at ${slot.label}`}
                    >
                      {fit.fit === 'oop' && <AlertTriangle className="h-2.5 w-2.5" />}
                      {slot.label} −{fit.penalty}
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className={`flex h-[92px] w-[64px] flex-col items-center justify-center rounded-[14px] border-2 border-dashed text-center ${
                    preview ? `${FIT_STYLE[preview.fit]} animate-pulse` : swapTarget ? 'border-sky-400 bg-sky-400/10 text-sky-200' : 'border-album-cream/90 bg-ink/20 text-album-cream'
                  }`}
                >
                  <span className="font-display text-xl leading-none">{slot.label}</span>
                  {preview && <span className="mt-1 text-[8px] font-black uppercase">{preview.fit === 'natural' ? (preview.penalty ? 'good' : 'perfect') : `${preview.fit} −${preview.penalty}`}</span>}
                  {!preview && <span className="mt-1 text-[8px] font-black uppercase">stick here</span>}
                </div>
              )}
            </Pressable>
          );
        })}
      </div>

      {!compact && (
        <div className="flex flex-col gap-1.5 text-[11px]">
          <div className="flex flex-wrap items-center justify-center gap-3 font-bold text-ink/75">
            {[1, 2, 3].map((n) => (
              <span key={n} className="flex items-center gap-1">
                <span className="inline-block h-2 w-5 rounded-full border-2 border-ink" style={{ background: STRENGTH_COLOR[n] }} /> {STRENGTH_LABEL[n]}
              </span>
            ))}
            <span className="flex items-center gap-1" title="Links add up: same club 2 (3 in the same decade), same nation +1, same decade +1, up to 4">
              <Link2 className="h-3 w-3" /> club › nation › decade
            </span>
            {rating.links.some((l) => l.kind === 'duo') && (
              <span className="flex items-center gap-1 font-bold text-album-red">
                <span className="inline-block h-2 w-5 rounded-full border-2 border-ink" style={{ background: `repeating-linear-gradient(90deg, ${STRENGTH_COLOR[4]} 0 4px, ${DUO_STRIPE} 4px 8px)` }} /> Famous duo
              </span>
            )}
            {fine ? (
              <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> Click a player for stats &amp; Move</span>
            ) : (
              <>
                <span className="flex items-center gap-1"><ArrowLeftRight className="h-3 w-3" /> Tap two players to swap</span>
                <span className="flex items-center gap-1"><Hand className="h-3 w-3" /> Hold a player for stats</span>
              </>
            )}
            {rerollAvailable !== undefined && (
              <span className={`flex items-center gap-1 ${rerollAvailable ? 'text-album-blue' : 'text-ink/35 line-through'}`}>
                <RefreshCw className="h-3 w-3" /> Scout Reroll {rerollAvailable ? 'ready' : 'used'}
              </span>
            )}
          </div>
          {manager && (
            <button onClick={onManagerInfo} className="rounded-lg border-2 border-ink bg-white px-2 py-1 text-center font-semibold text-ink transition hover:bg-album-cream">
              {manager.emoji} {rating.managerNote} <span className="text-album-red">· details</span>
            </button>
          )}
          {rating.balanceNote && <div className="rounded-lg border-2 border-ink bg-flare-200 px-2 py-1 text-center font-semibold text-ink">⚠ {rating.balanceNote}</div>}
          {rating.oopPenalty > 0.3 && <div className="rounded-lg border-2 border-ink bg-album-red px-2 py-1 text-center font-semibold text-white">⚠ Out-of-position penalties cost {rating.oopPenalty.toFixed(1)} team rating.</div>}
        </div>
      )}
    </div>
  );
}

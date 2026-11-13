import { AlertTriangle, ArrowLeftRight, Hand, Info, Link2, MousePointerClick, RefreshCw } from 'lucide-react';
import { FORMATIONS, pitchY } from '../data/formations';
import { MANAGERS_BY_ID } from '../data/managers';
import { fitFor } from '../engine/chemistry';
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

const LINK_COLOR = { club: '#facc15', nation: '#22d3ee', decade: '#a78bfa' } as const;
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
          <div className="rounded-xl border border-white/10 bg-black/40 p-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Team Rating</div>
            <div className="font-display text-3xl leading-none text-yellow-300">{filled ? rating.overall.toFixed(1) : '--'}</div>
            <div className="text-[10px] text-white/50">
              base {filled ? rating.baseAvg.toFixed(1) : '--'} {rating.chemBonus >= 0 ? '+' : ''}
              {rating.chemBonus.toFixed(1)} chem
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/40 p-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Chemistry</div>
            <div className="font-display text-3xl leading-none text-cyan-300">{rating.chemistry}</div>
            <div className="mx-auto mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500" style={{ width: `${rating.chemistry}%` }} />
            </div>
          </div>
          <Pressable
            onTap={onManagerInfo}
            onHold={onManagerInfo}
            showHoldRing={false}
            ariaLabel="Show manager objective"
            className={`group rounded-xl border p-2 transition hover:border-yellow-300/70 active:scale-95 ${rating.managerActive ? 'border-yellow-400/60 bg-yellow-400/10' : 'border-white/10 bg-black/40'}`}
          >
            <Info className="absolute right-1.5 top-1.5 h-3 w-3 text-white/40 group-hover:text-yellow-300" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Manager</div>
            <div className={`font-display text-3xl leading-none ${rating.managerBonus > 0 ? 'text-yellow-300' : 'text-white/40'}`}>
              {manager?.id === 'fergie_time' ? '⌚' : `+${rating.managerBonus.toFixed(1)}`}
            </div>
            <div className="truncate text-[10px] text-white/50">{manager?.emoji} {rating.managerActive ? 'ACTIVE' : 'inactive'}</div>
          </Pressable>
        </div>
      )}

      {/* Pitch */}
      <div className="pitch relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-2xl border-2 border-white/15 shadow-2xl">
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
          {rating.links.map((l) => {
            const a = slotById[l.a];
            const b = slotById[l.b];
            if (!a || !b) return null;
            return (
              <line
                key={`${l.a}-${l.b}`}
                x1={a.x}
                y1={pitchY(a.y)}
                x2={b.x}
                y2={pitchY(b.y)}
                stroke={LINK_COLOR[l.kind]}
                strokeWidth={0.35 + l.strength * 0.18}
                strokeLinecap="round"
                opacity="0.85"
                style={{ filter: `drop-shadow(0 0 1.2px ${LINK_COLOR[l.kind]})` }}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
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
                    preview ? `${FIT_STYLE[preview.fit]} animate-pulse` : swapTarget ? 'border-sky-400 bg-sky-400/10 text-sky-200' : 'border-white/35 bg-black/25 text-white/70'
                  }`}
                >
                  <span className="font-display text-xl leading-none">{slot.label}</span>
                  {preview && <span className="mt-1 text-[8px] font-black uppercase">{preview.fit === 'natural' ? (preview.penalty ? 'good' : 'perfect') : `${preview.fit} −${preview.penalty}`}</span>}
                  {!preview && <span className="mt-1 text-[8px] font-bold uppercase opacity-60">empty</span>}
                </div>
              )}
            </Pressable>
          );
        })}
      </div>

      {!compact && (
        <div className="flex flex-col gap-1.5 text-[11px]">
          <div className="flex flex-wrap items-center justify-center gap-3 text-white/60">
            <span className="flex items-center gap-1"><Link2 className="h-3 w-3" style={{ color: LINK_COLOR.club }} /> Club</span>
            <span className="flex items-center gap-1"><Link2 className="h-3 w-3" style={{ color: LINK_COLOR.nation }} /> Nation</span>
            <span className="flex items-center gap-1"><Link2 className="h-3 w-3" style={{ color: LINK_COLOR.decade }} /> Decade</span>
            {fine ? (
              <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> Click a player for stats &amp; Move</span>
            ) : (
              <>
                <span className="flex items-center gap-1"><ArrowLeftRight className="h-3 w-3" /> Tap two players to swap</span>
                <span className="flex items-center gap-1"><Hand className="h-3 w-3" /> Hold a player for stats</span>
              </>
            )}
            {rerollAvailable !== undefined && (
              <span className={`flex items-center gap-1 ${rerollAvailable ? 'text-sky-300' : 'text-white/30 line-through'}`}>
                <RefreshCw className="h-3 w-3" /> Scout Reroll {rerollAvailable ? 'ready' : 'used'}
              </span>
            )}
          </div>
          {manager && (
            <button onClick={onManagerInfo} className="rounded-lg bg-white/5 px-2 py-1 text-center text-white/70 transition hover:bg-white/10">
              {manager.emoji} {rating.managerNote} <span className="text-yellow-300/80">· details</span>
            </button>
          )}
          {rating.balanceNote && <div className="rounded-lg bg-amber-500/10 px-2 py-1 text-center text-amber-200">⚠ {rating.balanceNote}</div>}
          {rating.oopPenalty > 0.3 && <div className="rounded-lg bg-rose-500/10 px-2 py-1 text-center text-rose-200">⚠ Out-of-position penalties cost {rating.oopPenalty.toFixed(1)} team rating.</div>}
        </div>
      )}
    </div>
  );
}

import { useEffect, type ReactNode } from 'react';
import { ArrowLeftRight, Check, Link2, X } from 'lucide-react';
import { FORMATIONS } from '../data/formations';
import { MANAGERS_BY_ID } from '../data/managers';
import { getClub } from '../data/clubs';
import { managerContribution } from '../engine/chemistry';
import type { FormationId, Lineup, ManagerId, PlayerCard, TeamRating } from '../types/game';
import { PlayerCardUI, TIER_LABEL, TIER_TEXT } from './PlayerCardUI';

function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-label={label}>
      <div
        className="relative max-h-[92vh] w-full max-w-2xl animate-pop overflow-y-auto rounded-t-3xl border border-white/15 bg-gradient-to-b from-zinc-900 to-black p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-3 top-3 z-10 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

const FIT_LABEL = {
  natural: { text: 'Natural position', pts: 4, cls: 'text-emerald-300 bg-emerald-400/15 border-emerald-400/40' },
  secondary: { text: 'Secondary position', pts: 3, cls: 'text-lime-200 bg-lime-300/10 border-lime-300/40' },
  adjacent: { text: 'Adjacent position', pts: 1, cls: 'text-amber-200 bg-amber-400/10 border-amber-400/40' },
  oop: { text: 'Out of position', pts: 0, cls: 'text-rose-200 bg-rose-500/15 border-rose-500/40' },
} as const;

const STATS: [keyof PlayerCard['stats'], string, string][] = [
  ['pac', 'Pace', 'Diving'],
  ['sho', 'Shooting', 'Handling'],
  ['pas', 'Passing', 'Kicking'],
  ['dri', 'Dribbling', 'Reflexes'],
  ['def', 'Defending', 'Speed'],
  ['phy', 'Physical', 'Positioning'],
];

function statColor(v: number) {
  return v >= 90 ? 'bg-yellow-300' : v >= 82 ? 'bg-emerald-400' : v >= 70 ? 'bg-lime-400' : v >= 55 ? 'bg-amber-400' : 'bg-rose-500';
}

export function PlayerInspectPanel({
  slotId,
  formationId,
  lineup,
  rating,
  managerId,
  onClose,
  onMove,
}: {
  slotId: string;
  formationId: FormationId;
  lineup: Lineup;
  rating: TeamRating;
  managerId: ManagerId | null;
  onClose: () => void;
  onMove: () => void;
}) {
  const card = lineup[slotId];
  const slot = FORMATIONS[formationId].slots.find((s) => s.id === slotId);
  if (!card || !slot) return null;
  const fit = rating.fits.find((f) => f.slotId === slotId);
  const fitInfo = FIT_LABEL[fit?.fit ?? 'natural'];
  const club = getClub(card.club);
  const isGK = card.positions[0] === 'GK';
  const manager = managerId ? MANAGERS_BY_ID[managerId] : null;
  const helps = managerContribution(managerId, card, slot.label);

  const links = rating.links
    .filter((l) => l.a === slotId || l.b === slotId)
    .map((l) => {
      const other = lineup[l.a === slotId ? l.b : l.a]!;
      const kinds: string[] = [];
      if (other.club === card.club) kinds.push(other.decade === card.decade ? 'Club + era' : 'Club');
      if (other.nation === card.nation) kinds.push('Nation');
      if (other.decade === card.decade) kinds.push('Decade');
      return { other, kinds, strength: l.strength };
    })
    .sort((a, b) => b.strength - a.strength);
  const linkPts = links.reduce((s, l) => s + l.strength, 0);
  const raw = fitInfo.pts + linkPts;
  const total = Math.min(10, raw);

  return (
    <Sheet onClose={onClose} label={`${card.name} details`}>
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex shrink-0 justify-center">
          <PlayerCardUI card={card} size="lg" showStats />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="pr-8">
            <div className={`text-[10px] font-black uppercase tracking-widest ${TIER_TEXT[card.tier]}`}>
              {TIER_LABEL[card.tier]} · {card.season} {card.era}
            </div>
            <div className="font-display text-3xl leading-none text-white">{card.name}</div>
            <div className="mt-1 text-xs text-white/60">
              {club.name} · {card.nation} · {card.archetype} · {card.positions.join(' / ')}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {STATS.map(([k, label, gk]) => (
              <div key={k} className="grid grid-cols-[78px_1fr_28px] items-center gap-2 text-xs">
                <span className="font-bold text-white/70">{isGK ? gk : label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-white/10">
                  <span className={`block h-full rounded-full ${statColor(card.stats[k])}`} style={{ width: `${card.stats[k]}%` }} />
                </span>
                <span className="text-right font-black tabular-nums text-white">{card.stats[k]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chemistry */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Chemistry at {slot.label}</div>
          <div className="font-display text-2xl leading-none text-white">
            {total}
            <span className="text-base text-white/40">/10</span>
          </div>
        </div>
        <div className="mt-2 flex gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className={`h-2 flex-1 rounded-sm ${i < total ? 'bg-cyan-400' : 'bg-white/10'}`} />
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-1.5 text-sm">
          <div className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 ${fitInfo.cls}`}>
            <span>
              {fitInfo.text} {fit && fit.penalty > 0 && <span className="opacity-80">· plays as {fit.effectiveOvr} (−{fit.penalty} OVR)</span>}
            </span>
            <b>+{fitInfo.pts}</b>
          </div>
          {links.length === 0 && <div className="rounded-lg bg-white/5 px-2.5 py-1.5 text-white/60">No links with neighbouring players yet.</div>}
          {links.map((l) => (
            <div key={l.other.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-white/85">
              <span className="flex min-w-0 items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-yellow-300" />
                <span className="truncate">
                  {l.other.season} {l.other.shortName}
                </span>
                <span className="truncate text-xs text-white/50">{l.kinds.join(' · ')}</span>
              </span>
              <b>+{l.strength}</b>
            </div>
          ))}
          {raw > 10 && <div className="text-xs text-white/50">Capped at 10 ({raw} earned).</div>}
        </div>
      </div>

      {/* Manager */}
      {manager && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-yellow-300">
            {manager.emoji} {manager.name}
          </div>
          {helps.length ? (
            <ul className="mt-2 flex flex-col gap-1">
              {helps.map((h) => (
                <li key={h} className="flex items-center gap-2 text-sm text-white/85">
                  <Check className="h-4 w-4 text-emerald-400" /> {h}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-sm text-white/55">{managerId === 'fergie_time' ? "Fergie Time applies to the whole team, not individual players." : "Doesn't count toward this manager's objective in this slot."}</div>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={onMove} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 font-display text-xl tracking-wider text-black hover:bg-sky-400">
          <ArrowLeftRight className="h-5 w-5" /> MOVE / SWAP
        </button>
        <button onClick={onClose} className="flex-1 rounded-xl border border-white/20 px-4 py-2.5 font-display text-xl tracking-wider text-white hover:bg-white/10">
          CLOSE
        </button>
      </div>
    </Sheet>
  );
}

export function ManagerObjectivePanel({ managerId, rating, onClose }: { managerId: ManagerId; rating: TeamRating; onClose: () => void }) {
  const m = MANAGERS_BY_ID[managerId];
  const metCount = rating.managerChecks.filter((c) => c.done).length;
  return (
    <Sheet onClose={onClose} label={`${m.name} objective`}>
      <div className={`relative -mx-4 -mt-4 overflow-hidden rounded-t-3xl bg-gradient-to-br ${m.gradient} p-5 sm:-mx-6 sm:-mt-6`}>
        <div className="absolute -right-6 -top-6 text-[120px] leading-none opacity-15">{m.emoji}</div>
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/75">{m.inspiredBy}</div>
        <div className="mt-1 font-display text-4xl leading-none text-white text-shadow">{m.name}</div>
        <div className="mt-1 text-sm font-bold italic text-yellow-100">“{m.tagline}”</div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Current bonus</div>
          <div className={`font-display text-4xl leading-none ${rating.managerBonus > 0 ? 'text-yellow-300' : 'text-white/40'}`}>
            {managerId === 'fergie_time' ? '⌚ Clutch' : `+${rating.managerBonus.toFixed(1)}`}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${rating.managerActive ? 'bg-yellow-300 text-black' : 'bg-white/10 text-white/60'}`}>
          {rating.managerActive ? 'Active' : `${metCount}/${rating.managerChecks.length} met`}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-white/80">{m.bonusText}</div>

      <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-white/50">Objective</div>
      <ul className="mt-2 flex flex-col gap-2">
        {rating.managerChecks.map((c) => (
          <li key={c.label} className={`rounded-xl border p-3 ${c.done ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-start gap-2 text-sm font-semibold text-white">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${c.done ? 'bg-emerald-400 text-black' : 'border border-white/30 text-white/40'}`}>{c.done ? '✓' : ''}</span>
                {c.label}
              </span>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-black tabular-nums ${c.done ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/10 text-white/70'}`}>{c.progress}</span>
            </div>
            {c.who && <div className="mt-1.5 pl-7 text-xs text-white/55">{c.who}</div>}
          </li>
        ))}
      </ul>
      <div className="mt-4 text-xs text-white/45">Updates live as you draft and move players around the pitch.</div>
      <button onClick={onClose} className="mt-4 w-full rounded-xl border border-white/20 px-4 py-2.5 font-display text-xl tracking-wider text-white hover:bg-white/10">
        CLOSE
      </button>
    </Sheet>
  );
}

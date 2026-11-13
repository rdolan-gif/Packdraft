import { useMemo, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { FORMATIONS } from '../data/formations';
import { PLAYERS } from '../data/players';
import { computeTeamRating, fitFor } from '../engine/chemistry';
import { generatePack } from '../engine/packGenerator';
import { sfx } from '../engine/soundEffects';
import type { FormationId, Lineup, ManagerId, PlayerCard } from '../types/game';
import { PackOpener } from './PackOpener';
import { TacticalPitch } from './TacticalPitch';

interface Props {
  formationId: FormationId;
  lineup: Lineup;
  managerId: ManagerId;
  position: number;
  points: number;
  onSign: (card: PlayerCard, slotId: string) => void;
  onSkip: () => void;
}

const FIT_TEXT = { natural: 'natural position', secondary: 'secondary position', adjacent: 'adjacent position', oop: 'out of position' } as const;

/** January transfer window: one pack, sign one card to replace one player. */
export function TransferWindow({ formationId, lineup, managerId, position, points, onSign, onSkip }: Props) {
  const [stage, setStage] = useState<'intro' | 'pack'>('intro');
  const [selected, setSelected] = useState<PlayerCard | null>(null);
  const [outSlot, setOutSlot] = useState<string | null>(null);

  // One pack, dealt once. Nobody already in your XI can appear in it.
  const pack = useMemo(() => {
    const inXI = new Set(Object.values(lineup).filter(Boolean).map((c) => c!.basePlayerId));
    return generatePack({ packNumber: 8, pool: PLAYERS, draftedBaseIds: inXI, formationId, lineup });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const before = useMemo(() => computeTeamRating(formationId, lineup, managerId), [formationId, lineup, managerId]);
  const slot = outSlot ? FORMATIONS[formationId].slots.find((s) => s.id === outSlot) : null;
  const outgoing = outSlot ? lineup[outSlot] : null;
  const after = useMemo(
    () => (selected && outSlot ? computeTeamRating(formationId, { ...lineup, [outSlot]: selected }, managerId) : null),
    [selected, outSlot, formationId, lineup, managerId],
  );
  const fit = selected && slot ? fitFor(selected, slot.label) : null;
  const delta = after ? after.overall - before.overall : 0;

  return (
    <div className="fixed inset-0 z-[92] overflow-y-auto overscroll-contain bg-black/90" role="dialog" aria-label="January transfer window">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col p-3 sm:p-5">
        <div className="mb-3 overflow-hidden rounded-2xl border-2 border-sky-300/60 bg-gradient-to-r from-sky-950 via-black to-sky-950">
          <div className="bg-sky-300 px-4 py-1.5 text-center text-[11px] font-black uppercase tracking-[0.35em] text-black">January Transfer Window</div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="font-display text-3xl leading-none text-white sm:text-4xl">ONE PACK. ONE SIGNING.</div>
              <div className="mt-1 text-sm text-white/70">
                Halfway there: you're {position}
                {position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} on {points} pts. Rip the pack, pick one card and choose who makes way.
              </div>
            </div>
            <button
              onClick={() => {
                sfx.click();
                onSkip();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/5 px-4 py-2 text-sm font-black uppercase tracking-wider text-white/80 hover:bg-white/10"
            >
              <X className="h-4 w-4" /> Keep my squad
            </button>
          </div>
        </div>

        {stage === 'intro' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="max-w-md text-white/75">
              The board has released funds. You get one transfer pack: sign any card from it to replace a player in your XI, or keep your squad as it is.
            </div>
            <button
              onClick={() => {
                sfx.select();
                setStage('pack');
              }}
              className="rounded-2xl bg-gradient-to-r from-sky-300 via-cyan-300 to-sky-300 px-8 py-4 font-display text-3xl tracking-wider text-black shadow-xl shadow-sky-500/30 transition hover:scale-105"
            >
              OPEN TRANSFER PACK
            </button>
          </div>
        )}

        {stage === 'pack' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
            <section className="rounded-3xl border border-white/10 bg-black/40 p-3 sm:p-5">
              <PackOpener
                packNumber={8}
                cards={pack}
                packKey={1}
                selectedId={selected?.id ?? null}
                onSelect={(c) => {
                  setSelected(c);
                  setOutSlot(null);
                }}
                rerollAvailable={false}
                onReroll={() => {}}
                title="JANUARY TRANSFER PACK"
                subtitle="Pick one card, then tap the player he replaces"
                packLabel="January Window"
              />
            </section>
            <section className="flex flex-col gap-3">
              <div className="text-center text-xs font-bold uppercase tracking-widest text-white/60">
                {selected ? `Tap the player ${selected.shortName} replaces` : 'Your XI'}
              </div>
              <TacticalPitch
                formationId={formationId}
                lineup={lineup}
                rating={before}
                managerId={managerId}
                pendingCard={selected}
                swapSource={outSlot}
                onSlotClick={(id) => {
                  if (!selected) return;
                  sfx.click();
                  setOutSlot(id);
                }}
                compact
              />
              {selected && outgoing && slot && after && fit && (
                <div className="animate-pop rounded-2xl border border-sky-300/50 bg-sky-500/10 p-4">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-center text-sm font-bold text-white">
                    <span className="rounded-lg bg-emerald-500/20 px-2 py-1 text-emerald-200">
                      IN: {selected.season} {selected.shortName} ({selected.ovr})
                    </span>
                    <ArrowRight className="h-4 w-4 text-white/50" />
                    <span className="rounded-lg bg-rose-500/20 px-2 py-1 text-rose-200">
                      OUT: {outgoing.shortName} ({outgoing.ovr})
                    </span>
                  </div>
                  <div className="mt-2 text-center text-xs text-white/70">
                    Plays {slot.label}: {FIT_TEXT[fit.fit]}
                    {fit.penalty > 0 ? ` (−${fit.penalty} OVR)` : ''}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-black/40 p-2">
                      <div className="text-[10px] font-black uppercase text-white/50">Team rating</div>
                      <div className="font-display text-2xl text-white">
                        {before.overall.toFixed(1)} → <span className={delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{after.overall.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2">
                      <div className="text-[10px] font-black uppercase text-white/50">Chemistry</div>
                      <div className="font-display text-2xl text-white">
                        {before.chemistry} → <span className={after.chemistry >= before.chemistry ? 'text-emerald-300' : 'text-rose-300'}>{after.chemistry}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      sfx.fanfare();
                      onSign(selected, outSlot!);
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-300 px-4 py-3 font-display text-2xl tracking-wider text-black transition hover:scale-[1.02]"
                  >
                    <Check className="h-5 w-5" /> CONFIRM SIGNING
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

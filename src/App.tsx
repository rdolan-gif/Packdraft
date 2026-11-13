import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wand2, Lock, Play, Sparkles } from 'lucide-react';
import { Header } from './components/Header';
import { ManagerDraftModal } from './components/ManagerDraftModal';
import { FormationPicker } from './components/FormationPicker';
import { PackOpener } from './components/PackOpener';
import { TacticalPitch } from './components/TacticalPitch';
import { SeasonBroadcast } from './components/SeasonBroadcast';
import { SeasonReviewCard } from './components/SeasonReviewCard';
import { TrophyVaultModal } from './components/TrophyVaultModal';
import { PlayerCardUI } from './components/PlayerCardUI';
import { ManagerObjectivePanel, PlayerInspectPanel } from './components/InspectPanels';
import { MANAGERS, MANAGERS_BY_ID } from './data/managers';
import { FORMATIONS } from './data/formations';
import { PLAYERS } from './data/players';
import { bestSlotFor, computeTeamRating, fitFor } from './engine/chemistry';
import { generatePack, TOTAL_PACKS } from './engine/packGenerator';
import { buildLeague, buildSummary, SeasonSim } from './engine/seasonSimulator';
import { loadCareer, loadVault, qualifiesForVault, recordRun, saveToVault, deleteFromVault } from './engine/vault';
import { sfx } from './engine/soundEffects';
import { goldConfetti } from './engine/fx';
import type { FormationId, Lineup, ManagerCard, ManagerId, PlayerCard, SeasonSummary, VaultEntry } from './types/game';

type Phase = 'title' | 'manager' | 'formation' | 'draft' | 'season' | 'review';

function emptyLineup(f: FormationId): Lineup {
  return Object.fromEntries(FORMATIONS[f].slots.map((s) => [s.id, null]));
}

/** Re-seat existing players into a different formation, best fits first. */
function remapLineup(old: Lineup, to: FormationId): Lineup {
  const next = emptyLineup(to);
  const cards = Object.values(old).filter(Boolean) as PlayerCard[];
  const pairs: { card: PlayerCard; slot: string; pen: number }[] = [];
  cards.forEach((card) => FORMATIONS[to].slots.forEach((s) => pairs.push({ card, slot: s.id, pen: fitFor(card, s.label).penalty })));
  pairs.sort((a, b) => a.pen - b.pen || b.card.ovr - a.card.ovr);
  const placed = new Set<string>();
  for (const p of pairs) {
    if (placed.has(p.card.id) || next[p.slot]) continue;
    next[p.slot] = p.card;
    placed.add(p.card.id);
  }
  return next;
}

function dealManagers(): ManagerCard[] {
  return [...MANAGERS].sort(() => Math.random() - 0.5).slice(0, 3);
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('title');
  const [managerOffers, setManagerOffers] = useState<ManagerCard[]>(dealManagers);
  const [managerId, setManagerId] = useState<ManagerId | null>(null);
  const [formationId, setFormationId] = useState<FormationId>('4-3-3');
  const [formationLocked, setFormationLocked] = useState(false);
  const [lineup, setLineup] = useState<Lineup>(() => emptyLineup('4-3-3'));
  const [packNumber, setPackNumber] = useState(1);
  const [packCards, setPackCards] = useState<PlayerCard[]>([]);
  const [packKey, setPackKey] = useState(0);
  const [drafted, setDrafted] = useState<Set<string>>(new Set());
  const [rerollUsed, setRerollUsed] = useState(false);
  const [selected, setSelected] = useState<PlayerCard | null>(null);
  const [swapSource, setSwapSource] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('PackDraft XI');
  const [sim, setSim] = useState<SeasonSim | null>(null);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [savedToVault, setSavedToVault] = useState(false);
  const [vault, setVault] = useState<VaultEntry[]>(loadVault);
  const [career, setCareer] = useState(loadCareer);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [inspectSlot, setInspectSlot] = useState<string | null>(null);
  const [managerInfoOpen, setManagerInfoOpen] = useState(false);

  const rating = useMemo(() => computeTeamRating(formationId, lineup, managerId), [formationId, lineup, managerId]);
  const picksMade = Object.values(lineup).filter(Boolean).length;
  const draftComplete = picksMade >= 11;
  const manager = managerId ? MANAGERS_BY_ID[managerId] : null;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2400);
  };

  const dealPack = useCallback(
    (num: number, lu: Lineup, draftedIds: Set<string>, f: FormationId) => {
      setPackCards(generatePack({ packNumber: num, pool: PLAYERS, draftedBaseIds: draftedIds, formationId: f, lineup: lu }));
      setPackKey((k) => k + 1);
      setSelected(null);
    },
    [],
  );

  const newRun = () => {
    setPhase('title');
    setManagerOffers(dealManagers());
    setManagerId(null);
    setFormationId('4-3-3');
    setFormationLocked(false);
    setLineup(emptyLineup('4-3-3'));
    setPackNumber(1);
    setPackCards([]);
    setDrafted(new Set());
    setRerollUsed(false);
    setSelected(null);
    setSwapSource(null);
    setSim(null);
    setSummary(null);
    setSavedToVault(false);
    window.scrollTo({ top: 0 });
  };

  const changeFormation = (f: FormationId) => {
    if (formationLocked) return;
    setFormationId(f);
    setLineup((lu) => remapLineup(lu, f));
    setSwapSource(null);
  };

  const startDraft = () => {
    sfx.select();
    setPhase('draft');
    dealPack(1, lineup, drafted, formationId);
    window.scrollTo({ top: 0 });
  };

  const place = (card: PlayerCard, slotId: string) => {
    const nextLineup = { ...lineup, [slotId]: card };
    const nextDrafted = new Set(drafted).add(card.basePlayerId);
    setLineup(nextLineup);
    setDrafted(nextDrafted);
    setSelected(null);
    sfx.select();
    if (card.tier === 'PRIME_ICON') goldConfetti(0.5);
    const picks = Object.values(nextLineup).filter(Boolean).length;
    if (picks >= 3 && !formationLocked) {
      setFormationLocked(true);
      flash(`Formation locked in: ${formationId}`);
    }
    if (packNumber < TOTAL_PACKS) {
      const n = packNumber + 1;
      setPackNumber(n);
      window.setTimeout(() => dealPack(n, nextLineup, nextDrafted, formationId), 450);
    } else {
      setPackCards([]);
      sfx.fanfare();
    }
  };

  const onSlotClick = (slotId: string) => {
    if (selected) {
      if (lineup[slotId]) {
        sfx.error();
        flash('That slot is taken. Tap an empty slot, or move players around first.');
        return;
      }
      place(selected, slotId);
      return;
    }
    if (!swapSource) {
      if (lineup[slotId]) {
        sfx.click();
        setSwapSource(slotId);
      }
      return;
    }
    if (swapSource === slotId) {
      setSwapSource(null);
      return;
    }
    sfx.slide();
    setLineup((lu) => ({ ...lu, [slotId]: lu[swapSource], [swapSource]: lu[slotId] }));
    setSwapSource(null);
  };

  const autoPlace = () => {
    if (!selected) return;
    const slot = bestSlotFor(selected, formationId, lineup);
    if (slot) place(selected, slot);
  };

  const reroll = () => {
    if (rerollUsed) return;
    setRerollUsed(true);
    dealPack(packNumber, lineup, drafted, formationId);
    flash('Scout reroll used: fresh pack incoming!');
  };

  const kickOff = () => {
    if (!managerId) return;
    sfx.whistle();
    const teams = buildLeague({ teamName: teamName.trim() || 'PackDraft XI', formationId, lineup, rating, managerId });
    setSim(new SeasonSim(teams, managerId, rating));
    setPhase('season');
    window.scrollTo({ top: 0 });
  };

  const finishSeason = () => {
    if (!sim || !managerId) return;
    const s = buildSummary(sim, formationId, lineup, rating);
    setSummary(s);
    const r = s.record;
    setCareer(recordRun({ grade: s.grade, position: s.position, lost: r.lost, won: r.won, points: r.points, gf: r.gf }));
    if (qualifiesForVault(s.grade, r.lost)) {
      const top = sim.leaders('goals', 50).find((p) => p.isUser);
      const entry: VaultEntry = {
        id: `${Date.now()}`,
        savedAt: new Date().toISOString(),
        grade: s.grade,
        managerId,
        formationId,
        teamName: teamName.trim() || 'PackDraft XI',
        lineup: Object.entries(lineup).filter(([, c]) => c).map(([slotId, c]) => ({ slotId, cardId: c!.id })),
        record: { w: r.won, d: r.drawn, l: r.lost, gf: r.gf, ga: r.ga, pts: r.points, pos: s.position },
        teamRating: rating.overall,
        mvpName: s.mvp?.name ?? null,
        topScorer: top ? { name: top.name, goals: top.goals } : null,
        invincible: r.lost === 0,
      };
      setVault(saveToVault(entry));
      setSavedToVault(true);
    }
    setPhase('review');
    window.scrollTo({ top: 0 });
  };

  // Keyboard: Esc cancels selection/swap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSwapSource(null);
        setVaultOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="stadium-bg min-h-screen">
      <Header phase={phase} packNumber={packNumber} picksMade={picksMade} vaultCount={vault.length} onOpenVault={() => setVaultOpen(true)} onNewRun={newRun} />
      <main id="app-shell" className="pb-16">
        {phase === 'title' && <TitleScreen onStart={() => (sfx.unlock(), sfx.select(), setPhase('manager'))} career={career} vaultCount={vault.length} onVault={() => setVaultOpen(true)} />}

        {phase === 'manager' && (
          <ManagerDraftModal
            offers={managerOffers}
            onPick={(m) => {
              setManagerId(m.id);
              const f = m.preferredFormations[0];
              setFormationId(f);
              setLineup(emptyLineup(f));
              setPhase('formation');
              window.scrollTo({ top: 0 });
            }}
          />
        )}

        {phase === 'formation' && manager && (
          <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-8">
            <div className="text-xs font-black uppercase tracking-[0.4em] text-emerald-400">Step 2 · The Shape</div>
            <h1 className="mt-1 text-center font-display text-5xl leading-none text-white sm:text-6xl">CHOOSE YOUR FORMATION</h1>
            <p className="mt-2 max-w-xl text-center text-sm text-white/60">
              {manager.emoji} <b className="text-white">{manager.name}</b> favours the starred shapes. Lock one in now, or keep it flexible: you can change it until your third pick, when it locks for good.
            </p>
            <div className="mt-6 w-full">
              <FormationPicker current={formationId} onChange={changeFormation} preferred={manager.preferredFormations} />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  setFormationLocked(true);
                  startDraft();
                }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-amber-500 px-6 py-3 font-display text-2xl tracking-wider text-black shadow-lg shadow-amber-500/30 transition hover:scale-105"
              >
                <Lock className="h-5 w-5" /> LOCK {formationId} & OPEN PACK 1
              </button>
              <button onClick={startDraft} className="rounded-xl border-2 border-white/20 bg-white/5 px-6 py-3 font-display text-2xl tracking-wider text-white transition hover:bg-white/10">
                DECIDE AFTER PACK 3
              </button>
            </div>
          </div>
        )}

        {phase === 'draft' && manager && (
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-3 py-5 sm:px-4 lg:grid-cols-[1.35fr_1fr]">
            <section className="rounded-3xl border border-white/10 bg-black/35 p-3 sm:p-5">
              {!draftComplete ? (
                <>
                  <PackOpener
                    packNumber={packNumber}
                    cards={packCards}
                    packKey={packKey}
                    selectedId={selected?.id ?? null}
                    onSelect={(c) => {
                      setSelected(c);
                      setSwapSource(null);
                    }}
                    rerollAvailable={!rerollUsed}
                    onReroll={reroll}
                  />
                  {selected && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-3">
                      <span className="text-sm font-bold text-white">
                        Drafting <span className="text-emerald-300">{selected.season} {selected.name}</span>
                      </span>
                      <button onClick={autoPlace} className="flex items-center gap-1 rounded-lg bg-emerald-400 px-3 py-1.5 text-sm font-black text-black hover:bg-emerald-300">
                        <Wand2 className="h-4 w-4" /> Auto-Place
                      </button>
                      <button onClick={() => setSelected(null)} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-bold text-white/70 hover:bg-white/10">
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <KickoffPanel teamName={teamName} setTeamName={setTeamName} lineup={lineup} rating={rating} onKickOff={kickOff} />
              )}
            </section>
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{manager.emoji}</span>
                  <div>
                    <div className="font-display text-xl leading-none text-white">{manager.name}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">{manager.inspiredBy}</div>
                  </div>
                </div>
                <FormationPicker variant="inline" current={formationId} onChange={changeFormation} locked={formationLocked} preferred={manager.preferredFormations} />
              </div>
              <TacticalPitch
                formationId={formationId}
                lineup={lineup}
                rating={rating}
                managerId={managerId}
                pendingCard={selected}
                swapSource={swapSource}
                onSlotClick={onSlotClick}
                onInspect={(id) => {
                  sfx.flip();
                  setInspectSlot(id);
                }}
                onManagerInfo={() => {
                  sfx.click();
                  setManagerInfoOpen(true);
                }}
                rerollAvailable={!rerollUsed}
              />
            </section>
          </div>
        )}

        {phase === 'season' && sim && <SeasonBroadcast sim={sim} onFinish={finishSeason} />}

        {phase === 'review' && summary && managerId && (
          <SeasonReviewCard
            summary={summary}
            teamName={teamName.trim() || 'PackDraft XI'}
            formationId={formationId}
            lineup={lineup}
            managerId={managerId}
            rating={rating}
            savedToVault={savedToVault}
            onNewRun={newRun}
            onOpenVault={() => setVaultOpen(true)}
          />
        )}
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[99] -translate-x-1/2 animate-pop rounded-xl border border-white/20 bg-black/90 px-4 py-2 text-sm font-bold text-white shadow-2xl">{toast}</div>
      )}

      {inspectSlot && lineup[inspectSlot] && (
        <PlayerInspectPanel
          slotId={inspectSlot}
          formationId={formationId}
          lineup={lineup}
          rating={rating}
          managerId={managerId}
          onClose={() => setInspectSlot(null)}
          onMove={() => {
            setSwapSource(inspectSlot);
            setSelected(null);
            setInspectSlot(null);
            flash('Now tap the slot to move him to (or another player to swap).');
          }}
        />
      )}

      {managerInfoOpen && managerId && <ManagerObjectivePanel managerId={managerId} rating={rating} onClose={() => setManagerInfoOpen(false)} />}

      {vaultOpen && (
        <TrophyVaultModal
          vault={vault}
          career={career}
          onClose={() => setVaultOpen(false)}
          onDelete={(id) => setVault(deleteFromVault(id))}
        />
      )}
    </div>
  );
}

function KickoffPanel({ teamName, setTeamName, lineup, rating, onKickOff }: { teamName: string; setTeamName: (s: string) => void; lineup: Lineup; rating: ReturnType<typeof computeTeamRating>; onKickOff: () => void }) {
  const cards = (Object.values(lineup).filter(Boolean) as PlayerCard[]).sort((a, b) => b.ovr - a.ovr);
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="text-xs font-black uppercase tracking-[0.4em] text-emerald-400">Draft complete</div>
      <h2 className="font-display text-5xl leading-none text-white">YOUR XI IS SET</h2>
      <div className="flex flex-wrap justify-center gap-1.5">
        {cards.slice(0, 3).map((c) => (
          <PlayerCardUI key={c.id} card={c} size="sm" />
        ))}
      </div>
      <div className="grid w-full max-w-md grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/5 p-2">
          <div className="text-[10px] font-black uppercase text-white/50">Rating</div>
          <div className="font-display text-3xl text-yellow-300">{rating.overall.toFixed(1)}</div>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <div className="text-[10px] font-black uppercase text-white/50">Attack</div>
          <div className="font-display text-3xl text-rose-300">{rating.attack.toFixed(1)}</div>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <div className="text-[10px] font-black uppercase text-white/50">Defence</div>
          <div className="font-display text-3xl text-sky-300">{rating.defence.toFixed(1)}</div>
        </div>
      </div>
      <label className="flex w-full max-w-md flex-col gap-1 text-left">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Club name</span>
        <input
          value={teamName}
          maxLength={24}
          onChange={(e) => setTeamName(e.target.value)}
          className="rounded-xl border border-white/20 bg-black/50 px-4 py-2.5 font-display text-2xl tracking-wide text-white outline-none focus:border-emerald-400"
        />
      </label>
      <button
        onClick={onKickOff}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-yellow-300 px-8 py-4 font-display text-3xl tracking-wider text-black shadow-xl shadow-emerald-500/30 transition hover:scale-105 active:scale-95"
      >
        <Play className="h-7 w-7" fill="currentColor" /> KICK OFF 38-GAME SEASON
      </button>
      <div className="text-xs text-white/50">You can still swap players around on the pitch before kick-off.</div>
    </div>
  );
}

function TitleScreen({ onStart, career, vaultCount, onVault }: { onStart: () => void; career: ReturnType<typeof loadCareer>; vaultCount: number; onVault: () => void }) {
  const showcase = useMemo(() => {
    const ids = ['henry_thierry_0304', 'ronaldo_cristiano_0708', 'gerrard_steven_0506', 'vandijk_virgil_1819', 'salah_mohamed_1718'];
    const found = ids.map((id) => PLAYERS.find((p) => p.id === id)).filter(Boolean) as PlayerCard[];
    return found.length >= 3 ? found : PLAYERS.filter((p) => p.tier === 'PRIME_ICON').slice(0, 5);
  }, []);
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-10 pt-10 text-center sm:pt-14">
      <div className="flex items-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] text-yellow-200">
        <Sparkles className="h-3.5 w-3.5" /> 11 packs · 249 cards · 38 matchweeks
      </div>
      <h1 className="mt-4 font-display text-7xl leading-[0.85] text-white drop-shadow-[0_6px_0_rgba(0,0,0,.5)] sm:text-9xl">
        PACK<span className="text-emerald-400">DRAFT</span>
        <span className="block text-yellow-300">38</span>
      </h1>
      <p className="mt-4 max-w-xl text-base text-white/70">
        Rip 11 packs. Draft one legend from each across every era of the Premier League. Then survive a live 38-game season and chase the holy grail: <b className="text-yellow-300">38-0. Invincible.</b>
      </p>

      <div className="relative mt-8 flex h-[240px] w-full max-w-3xl items-center justify-center">
        {showcase.map((c, i) => {
          const mid = (showcase.length - 1) / 2;
          const off = i - mid;
          return (
            <div
              key={c.id}
              className="absolute transition-transform hover:z-30"
              style={{ transform: `translateX(${off * 110}px) translateY(${Math.abs(off) * 14}px) rotate(${off * 6}deg)`, zIndex: 10 - Math.abs(off) }}
            >
              <PlayerCardUI card={c} size="md" />
            </div>
          );
        })}
      </div>

      <button
        onClick={onStart}
        className="group relative mt-12 overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 px-10 py-4 font-display text-4xl tracking-wider text-black shadow-2xl shadow-amber-500/40 transition hover:scale-105 active:scale-95"
      >
        <span className="relative z-10">START THE DRAFT</span>
        <span className="absolute inset-0 -translate-x-full bg-white/50 transition duration-700 group-hover:translate-x-full" />
      </button>

      <div className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-3 text-left sm:grid-cols-4">
        {[
          ['🎩', 'Mystery Manager', 'Pick 1 of 3 tactical philosophies with passive buffs.'],
          ['✂️', 'Rip 11 Packs', 'Rarity tells, walkout flares, 1 pick per pack.'],
          ['📺', 'Live Season', 'Table, ticker, leaderboards and touchline calls.'],
          ['👑', 'Grade F → S+', 'Go unbeaten and enter the 38-0 Trophy Vault.'],
        ].map(([e, t, d]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-black/35 p-3">
            <div className="text-2xl">{e}</div>
            <div className="mt-1 font-display text-xl leading-none text-white">{t}</div>
            <div className="mt-1 text-xs text-white/55">{d}</div>
          </div>
        ))}
      </div>
      {career.runs > 0 && (
        <button onClick={onVault} className="mt-6 text-sm text-white/60 hover:text-white">
          {career.runs} runs · {career.titles} titles · {career.invincibles} Invincibles · {vaultCount} in the vault →
        </button>
      )}
    </div>
  );
}

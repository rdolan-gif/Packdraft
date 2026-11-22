import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Wand2, Lock, Play, CalendarDays, Award, Check, Copy } from 'lucide-react';
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
import { StickerBookModal } from './components/StickerBookModal';
import { TrophyCabinetModal } from './components/TrophyCabinetModal';
import { checkTrophies, TROPHIES, unlockedTrophies, type Trophy } from './engine/achievements';
import { dailyRng, dailyShareText, dailyStreak, dayNumber, formFromResults, loadDaily, markDailyStarted, saveDailyResult, todayKey, untilTomorrow, type DailyResult } from './engine/daily';
import { discoverDuos, DUOS } from './data/duos';
import { positionHistory } from './engine/scoutVerdict';
import { shareText } from './engine/share';
import { recordHistory, type RunPlayer } from './engine/history';
import { inAlbum, isPulled, recordDrafted, recordPulled } from './engine/stickerBook';
import { MANAGERS, MANAGERS_BY_ID } from './data/managers';
import { FORMATIONS } from './data/formations';
import { PLAYERS, PLAYERS_BY_ID } from './data/players';
import { bestSlotFor, computeTeamRating, fitFor } from './engine/chemistry';
import { generatePack, TOTAL_PACKS } from './engine/packGenerator';
import { buildLeague, buildSummary, ordinal, pickEra, SeasonSim, USER_TEAM_ID } from './engine/seasonSimulator';
import { loadCareer, loadVault, qualifiesForVault, recordRun, saveToVault, deleteFromVault } from './engine/vault';
import { sfx } from './engine/soundEffects';
import { goldConfetti, rainbowConfetti } from './engine/fx';
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

/** Deal 3 different managers; dealWeight makes some (the Galáctico Collector) rarer. */
function dealManagers(rng: () => number = Math.random): ManagerCard[] {
  const pool = [...MANAGERS];
  const hand: ManagerCard[] = [];
  while (hand.length < 3 && pool.length) {
    const total = pool.reduce((s, m) => s + (m.dealWeight ?? 1), 0);
    let r = rng() * total;
    const i = pool.findIndex((m) => (r -= m.dealWeight ?? 1) <= 0);
    hand.push(pool.splice(i < 0 ? pool.length - 1 : i, 1)[0]);
  }
  return hand;
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
  const [bookOpen, setBookOpen] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [gotIds, setGotIds] = useState<Set<string>>(new Set());
  // Daily Draft: the date this run is seeded from (null = a normal random run).
  const [dailyDay, setDailyDay] = useState<string | null>(null);
  const [dailyInfo, setDailyInfo] = useState<{ number: number; streak: number; text: string } | null>(null);
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const [newTrophies, setNewTrophies] = useState<Trophy[]>([]);
  const [trophyCount, setTrophyCount] = useState(() => Object.keys(unlockedTrophies()).length);
  /** Random numbers for one part of the run: seeded on a Daily Draft, truly random otherwise. */
  const rngFor = (part: string) => (dailyDay ? dailyRng(dailyDay, part) : Math.random);
  // Between placing a card and the next pack arriving, the old pack is locked:
  // before, clicking during that gap could draft twice from one pack (even the same player).
  const [dealing, setDealing] = useState(false);
  const dealTimer = useRef<number | null>(null);
  const cancelDeal = () => {
    if (dealTimer.current) window.clearTimeout(dealTimer.current);
    dealTimer.current = null;
    setDealing(false);
  };
  useEffect(() => () => cancelDeal(), []);

  const rating = useMemo(() => computeTeamRating(formationId, lineup, managerId), [formationId, lineup, managerId]);
  const picksMade = Object.values(lineup).filter(Boolean).length;
  const draftComplete = picksMade >= 11;
  const manager = managerId ? MANAGERS_BY_ID[managerId] : null;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2400);
  };

  const dealPack = useCallback(
    (num: number, lu: Lineup, draftedIds: Set<string>, f: FormationId, rng: () => number = Math.random) => {
      const cards = generatePack({ packNumber: num, pool: PLAYERS, draftedBaseIds: draftedIds, formationId: f, lineup: lu, rng });
      setNewIds(new Set(cards.filter((c) => inAlbum(c) && !isPulled(c.id)).map((c) => c.id)));
      setGotIds(new Set(cards.filter((c) => inAlbum(c) && isPulled(c.id)).map((c) => c.id)));
      setPackCards(cards);
      setPackKey((k) => k + 1);
      setSelected(null);
    },
    [],
  );

  const newRun = () => {
    cancelDeal();
    setPhase('title');
    setDailyDay(null);
    setDailyInfo(null);
    setNewTrophies([]);
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

  /** Today's Daily Draft: same managers, packs, era and season luck for everyone. */
  const startDaily = () => {
    const day = todayKey();
    if (loadDaily()[day]) return;
    sfx.unlock();
    sfx.select();
    setDailyDay(day);
    setManagerOffers(dealManagers(dailyRng(day, 'managers')));
    markDailyStarted(day);
    setPhase('manager');
    window.scrollTo({ top: 0 });
  };

  const showTrophies = (list: Trophy[]) => {
    if (!list.length) return;
    setTrophyCount(Object.keys(unlockedTrophies()).length);
    sfx.trophy();
    flash(`🏆 Trophy unlocked: ${list.map((t) => t.title).join(', ')}`);
  };

  // Hidden famous duos: the first time a pair lines up in your XI, it's discovered.
  useEffect(() => {
    const ids = rating.links.filter((l) => l.kind === 'duo' && l.duo).map((l) => l.duo!.id);
    const fresh = discoverDuos(ids);
    if (!fresh.length) return;
    const names = fresh.map((id) => DUOS.find((d) => d.id === id)?.name).join(', ');
    sfx.stinger('RISING_WORLD');
    const unlocked = checkTrophies();
    if (unlocked.length) setTrophyCount(Object.keys(unlockedTrophies()).length);
    flash(`🤝 Famous duo discovered: ${names}! +3 chemistry each${unlocked.length ? ` · 🏆 ${unlocked.map((t) => t.title).join(', ')}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rating.links]);

  const startDraft = () => {
    sfx.select();
    setPhase('draft');
    dealPack(1, lineup, drafted, formationId, rngFor('pack1'));
    window.scrollTo({ top: 0 });
  };

  const place = (card: PlayerCard, slotId: string) => {
    if (dealing || drafted.has(card.basePlayerId)) return;
    recordDrafted(card.id);
    const nextLineup = { ...lineup, [slotId]: card };
    const nextDrafted = new Set(drafted).add(card.basePlayerId);
    setLineup(nextLineup);
    setDrafted(nextDrafted);
    setSelected(null);
    sfx.select();
    if (card.tier === 'SECRET_DEV') rainbowConfetti();
    else if (card.tier === 'PRIME_ICON') goldConfetti(0.5);
    const picks = Object.values(nextLineup).filter(Boolean).length;
    if (picks >= 3 && !formationLocked) {
      setFormationLocked(true);
      flash(`Formation locked in: ${formationId}`);
    }
    if (packNumber < TOTAL_PACKS) {
      const n = packNumber + 1;
      setPackNumber(n);
      setDealing(true);
      dealTimer.current = window.setTimeout(() => {
        dealTimer.current = null;
        setDealing(false);
        dealPack(n, nextLineup, nextDrafted, formationId, rngFor(`pack${n}`));
      }, 450);
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
    if (rerollUsed || dealing) return;
    setRerollUsed(true);
    dealPack(packNumber, lineup, drafted, formationId, rngFor(`pack${packNumber}-reroll`));
    flash('Scout reroll used: fresh pack incoming!');
  };

  const kickOff = () => {
    if (!managerId) return;
    sfx.whistle();
    // Each draft is played in a random era of the league (scoring, home advantage, gap to the elite).
    const era = pickEra(rngFor('era'));
    const teams = buildLeague({ teamName: teamName.trim() || 'PackDraft XI', formationId, lineup, rating, managerId, era, rng: rngFor('league') });
    setSim(new SeasonSim(teams, managerId, rating, rngFor('season'), era));
    setPhase('season');
    window.scrollTo({ top: 0 });
  };

  // January transfer window: swap one player, then rebuild the user's side in the running season.
  const signInJanuary = (card: PlayerCard, slotId: string) => {
    if (!sim || !managerId) return;
    const out = lineup[slotId];
    if (!out) return;
    const next = { ...lineup, [slotId]: card };
    const nextRating = computeTeamRating(formationId, next, managerId);
    const label = FORMATIONS[formationId].slots.find((s) => s.id === slotId)?.label ?? slotId;
    sim.signPlayer(card, out, formationId, next, nextRating, label);
    recordDrafted(card.id);
    setLineup(next);
    setDrafted((d) => new Set(d).add(card.basePlayerId));
    if (card.tier === 'SECRET_DEV') rainbowConfetti();
    else if (card.tier === 'PRIME_ICON') goldConfetti(0.8);
    flash(`Signed: ${card.name} replaces ${out.name}`);
  };

  const finishSeason = () => {
    if (!sim || !managerId) return;
    const s = buildSummary(sim, formationId, lineup, rating);
    setSummary(s);
    const r = s.record;
    setCareer(recordRun({ grade: s.grade, position: s.position, lost: r.lost, won: r.won, points: r.points, gf: r.gf }));
    const results = sim.results.map((_, i) => sim.userResult(i)!).filter(Boolean);
    // Season history: feeds personal records and the Best Ever XI in the vault.
    const slotOfCard: Record<string, string> = {};
    FORMATIONS[formationId].slots.forEach((sl) => lineup[sl.id] && (slotOfCard[lineup[sl.id]!.id] = sl.label));
    const players: RunPlayer[] = Object.values(sim.stats)
      .filter((p) => p.isUser && p.apps > 0 && PLAYERS_BY_ID[p.id])
      .map((p) => ({
        cardId: p.id,
        slot: (slotOfCard[p.id] ?? PLAYERS_BY_ID[p.id].positions[0]) as RunPlayer['slot'],
        goals: p.goals,
        assists: p.assists,
        cleanSheets: p.cleanSheets,
        apps: p.apps,
        avg: Math.round((p.ratingSum / p.apps) * 100) / 100,
      }));
    recordHistory({
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      teamName: teamName.trim() || 'PackDraft XI',
      daily: !!dailyDay,
      eraName: sim.era.name,
      managerId,
      formationId,
      position: s.position,
      grade: s.grade,
      points: r.points,
      w: r.won,
      d: r.drawn,
      l: r.lost,
      gf: r.gf,
      ga: r.ga,
      rating: rating.overall,
      players,
    });
    if (dailyDay) {
      const result: DailyResult = {
        day: dailyDay,
        number: dayNumber(dailyDay),
        status: 'done',
        grade: s.grade,
        position: s.position,
        points: r.points,
        record: { w: r.won, d: r.drawn, l: r.lost, gf: r.gf, ga: r.ga },
        form: formFromResults(results, USER_TEAM_ID),
        rating: rating.overall,
        chemistry: rating.chemistry,
        teamName: teamName.trim() || 'PackDraft XI',
        managerName: MANAGERS_BY_ID[managerId].name,
        eraName: sim.era.name,
      };
      saveDailyResult(result);
      const streak = dailyStreak();
      setDailyInfo({ number: result.number, streak, text: dailyShareText(result, streak) });
    }
    const unlocked = checkTrophies({
      position: s.position,
      record: r,
      grade: s.grade,
      wonBoot: s.userWonBoot,
      wonGlove: s.userWonGlove,
      wonPlaymaker: s.userWonPlaymaker,
      cards: Object.values(lineup).filter(Boolean) as PlayerCard[],
      formationId,
      managerId,
      teamRating: rating.overall,
      chemistry: rating.chemistry,
      eraId: sim.era.id,
      daily: !!dailyDay,
      midPosition: positionHistory(sim, USER_TEAM_ID)[18] ?? s.position,
    });
    setNewTrophies(unlocked);
    setTrophyCount(Object.keys(unlockedTrophies()).length);
    if (qualifiesForVault(s.grade, r.lost, s.position)) {
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
        invincible: s.position === 1 && r.lost === 0,
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
        setBookOpen(false);
        setSwapSource(null);
        setSelected(null);
        setVaultOpen(false);
        setCabinetOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`${phase === 'draft' ? 'paper-bg' : 'stadium-bg'} min-h-screen`}>
      <Header phase={phase} packNumber={packNumber} picksMade={picksMade} vaultCount={vault.length} onOpenVault={() => setVaultOpen(true)} onOpenBook={() => setBookOpen(true)} onOpenCabinet={() => setCabinetOpen(true)} trophyCount={trophyCount} dailyNumber={dailyDay ? dayNumber(dailyDay) : null} onNewRun={newRun} />
      <main id="app-shell" className="pb-16">
        {phase === 'title' && (
          <TitleScreen
            onStart={() => (sfx.unlock(), sfx.select(), setPhase('manager'))}
            onDaily={startDaily}
            onCabinet={() => setCabinetOpen(true)}
            trophyCount={trophyCount}
            career={career}
            vaultCount={vault.length}
            onVault={() => setVaultOpen(true)}
          />
        )}

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
            <div className="text-xs font-black uppercase tracking-[0.4em] text-flare-400">Step 2 · The Shape</div>
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
                className="flex items-center gap-2 btn-cut bg-flare-500 hover:bg-flare-400 px-6 py-3 font-display text-2xl tracking-wider text-black shadow-lg shadow-flare-500/30 transition hover:scale-105"
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
            <section className="pack-panel rounded-[22px] p-3 sm:p-5">
              {!draftComplete ? (
                <>
                  <PackOpener
                    packNumber={packNumber}
                    cards={packCards}
                    packKey={packKey}
                    selectedId={selected?.id ?? null}
                    onSelect={(c) => {
                      if (dealing) return;
                      setSelected(c);
                      setSwapSource(null);
                    }}
                    rerollAvailable={!rerollUsed && !dealing}
                    onRip={() => {
                      recordPulled(packCards.map((c) => c.id));
                      showTrophies(checkTrophies());
                    }}
                    newIds={newIds}
                    gotIds={gotIds}
                    wrapper={dailyDay ? 'daily' : undefined}
                    onReroll={reroll}
                  />
                  {selected && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-flare-400/40 bg-flare-500/10 p-3">
                      <span className="text-sm font-bold text-white">
                        Drafting <span className="text-flare-300">{selected.season} {selected.name}</span>
                      </span>
                      <button onClick={autoPlace} className="flex items-center gap-1 rounded-lg bg-flare-400 px-3 py-1.5 text-sm font-black text-black hover:bg-flare-300">
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
                    <div className="font-display text-[34px] leading-none text-ink">{manager.name}</div>
                    <div className="text-[11px] font-black uppercase tracking-widest text-ink/60">{manager.inspiredBy}</div>
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

        {phase === 'season' && sim && managerId && (
          <SeasonBroadcast sim={sim} onFinish={finishSeason} formationId={formationId} lineup={lineup} managerId={managerId} onTransfer={signInJanuary} />
        )}

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
            newTrophies={newTrophies}
            onOpenCabinet={() => setCabinetOpen(true)}
            daily={dailyInfo ?? undefined}
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

      {bookOpen && <StickerBookModal onClose={() => setBookOpen(false)} />}
      {cabinetOpen && <TrophyCabinetModal onClose={() => setCabinetOpen(false)} />}

      {vaultOpen && (
        <TrophyVaultModal
          vault={vault}
          career={career}
          onClose={() => setVaultOpen(false)}
          onDelete={(id) => setVault(deleteFromVault(id))}
          onUpdate={(e) => setVault(saveToVault(e, true))}
        />
      )}
    </div>
  );
}

function KickoffPanel({ teamName, setTeamName, lineup, rating, onKickOff }: { teamName: string; setTeamName: (s: string) => void; lineup: Lineup; rating: ReturnType<typeof computeTeamRating>; onKickOff: () => void }) {
  const cards = (Object.values(lineup).filter(Boolean) as PlayerCard[]).sort((a, b) => b.ovr - a.ovr);
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="text-xs font-black uppercase tracking-[0.4em] text-flare-400">Draft complete</div>
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
          className="rounded-xl border border-white/20 bg-black/50 px-4 py-2.5 font-display text-2xl tracking-wide text-white outline-none focus:border-flare-400"
        />
      </label>
      <button
        onClick={onKickOff}
        className="flex items-center gap-2 btn-cut bg-flare-500 hover:bg-flare-400 px-8 py-4 font-display text-3xl tracking-wider text-black shadow-xl shadow-flare-500/30 transition hover:scale-105 active:scale-95"
      >
        <Play className="h-7 w-7" fill="currentColor" /> KICK OFF 38-GAME SEASON
      </button>
      <div className="text-xs text-white/50">You can still swap players around on the pitch before kick-off.</div>
    </div>
  );
}

function TitleScreen({
  onStart,
  onDaily,
  onCabinet,
  trophyCount,
  career,
  vaultCount,
  onVault,
}: {
  onStart: () => void;
  onDaily: () => void;
  onCabinet: () => void;
  trophyCount: number;
  career: ReturnType<typeof loadCareer>;
  vaultCount: number;
  onVault: () => void;
}) {
  const showcase = useMemo(() => {
    // One of each card style, fanned out with a Prime in the middle:
    // Squad (grey) · Elite (Cult Hero red) · Prime · Gold (Rising Star glow) · Elite (Legend bronze)
    const ids = ['vardy_jamie_1920', 'grealish_jack_2021', 'henry_thierry_0304', 'schmeichel_peter_9596', 'ginola_david_9596'];
    const found = ids.map((id) => PLAYERS.find((p) => p.id === id)).filter(Boolean) as PlayerCard[];
    return found.length >= 3 ? found : PLAYERS.filter((p) => p.tier === 'PRIME_ICON').slice(0, 5);
  }, []);
  const dailyToday = loadDaily()[todayKey()];
  const streak = dailyStreak(loadDaily(), todayKey());
  const primeCount = PLAYERS.filter((p) => p.tier === 'PRIME_ICON').length;
  const fan = [showcase[1], showcase[3], showcase[2]].filter(Boolean);
  return (
    <div className="flex flex-col items-center pb-10 text-center">
      {/* hero: kit-blue sunburst, logo and buttons left, a fanned hand of stickers right */}
      <section className="title-rays relative w-full overflow-hidden border-b-4 border-ink">
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-5 pb-24 pt-10 text-left lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div className="flex flex-col items-start gap-6">
            <div className="-rotate-3 border-[3px] border-ink bg-album-red px-4 pb-1 pt-2 font-chunky text-base text-white shadow-[4px_4px_0_#0b0e24] sm:text-xl">THE OFFICIAL-ISH 92–26 COLLECTION</div>
            <h1 className="m-0 -rotate-3 font-display text-[92px] leading-[0.82] sm:text-[150px] lg:text-[168px]" style={{ color: '#ffd400', WebkitTextStroke: '4px #14183a', paintOrder: 'stroke fill', textShadow: '9px 9px 0 #14183a' }}>
              PACK
              <br />
              DRAFT 38
            </h1>
            <p className="m-0 font-chunky text-xl leading-tight text-album-cream sm:text-[26px]" style={{ textShadow: '3px 3px 0 #14183a' }}>
              Rip 11 packs. Pick 11 players.
              <br />
              Survive 38 games.
            </p>
            <div className="flex w-full max-w-[440px] flex-col gap-4">
              <button onClick={onStart} className="btn-cut w-full bg-flare-500 py-4 text-[34px] text-ink transition hover:-translate-y-0.5" style={{ borderWidth: 5, boxShadow: '0 9px 0 #14183a', borderRadius: 16 }}>
                START THE DRAFT!
              </button>
              <button
                onClick={dailyToday ? () => document.getElementById('daily-card')?.scrollIntoView({ behavior: 'smooth' }) : onDaily}
                className="btn-cut flex w-full items-center justify-between bg-album-red px-5 py-3 text-2xl text-white transition hover:-translate-y-0.5"
                style={{ borderWidth: 5, boxShadow: '0 7px 0 #14183a', borderRadius: 16 }}
              >
                <span>{dailyToday ? "TODAY'S RESULT" : "TODAY'S DRAFT"}</span>
                <span className="rounded-full border-[3px] border-ink bg-album-cream px-3 pt-1 text-lg text-ink">{streak > 0 ? `STREAK ${streak}` : `#${dayNumber(todayKey())}`}</span>
              </button>
            </div>
          </div>
          <div className="relative mx-auto h-[430px] w-[340px] sm:h-[460px] sm:w-[520px]" aria-hidden="true">
            <div className="burst-clip absolute -top-4 right-0 z-30 flex h-[120px] w-[120px] rotate-12 items-center justify-center bg-flare-500 text-center font-chunky text-lg leading-none text-ink sm:h-[150px] sm:w-[150px] sm:text-2xl">
              {primeCount} PRIME
              <br />
              ICONS!
            </div>
            {fan[0] && (
              <div className="absolute left-0 top-[120px] -rotate-[11deg] sm:top-[110px]">
                <PlayerCardUI card={fan[0]} size="lg" tilt={false} />
              </div>
            )}
            {fan[1] && (
              <div className="absolute right-0 top-[110px] rotate-[9deg] sm:right-4">
                <PlayerCardUI card={fan[1]} size="lg" tilt={false} />
              </div>
            )}
            {fan[2] && (
              <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
                <PlayerCardUI card={fan[2]} size="lg" />
              </div>
            )}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 overflow-hidden whitespace-nowrap border-t-[5px] border-ink bg-flare-500 py-3 text-ink">
          <div className="flex w-max animate-ticker gap-10 px-6">
            {[0, 1].map((k) => (
              <span key={k} className="flex gap-10">
                <span className="font-chunky text-xl">★ GOT, GOT, NEED!</span>
                <span className="text-[15px] font-black">Daily draft resets at midnight</span>
                <span className="font-chunky text-xl">★ HOLO SHINIES TO COLLECT</span>
                <span className="text-[15px] font-black">Spares stack up in your album</span>
                <span className="font-chunky text-xl">★ RIP · DRAFT · SURVIVE</span>
                <span className="text-[15px] font-black">{PLAYERS.filter(inAlbum).length} stickers to find</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <div id="daily-card" className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 px-4 sm:grid-cols-[1.6fr_1fr]">
        <DailyCard onPlay={onDaily} />
        <button
          onClick={onCabinet}
          className="comic-paper flex items-center gap-3 rounded-2xl p-3 text-left transition hover:-translate-y-0.5"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-flare-500 text-ink">
            <Award className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-display text-2xl leading-none text-ink">TROPHY CABINET</span>
            <span className="block text-xs font-bold text-ink/70">
              {trophyCount} / {TROPHIES.length} unlocked
            </span>
          </span>
        </button>
      </div>

      <div className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-3 px-4 text-left sm:grid-cols-4">
        {[
          ['🎩', 'Mystery Manager', 'Pick 1 of 3 tactical philosophies with passive buffs.'],
          ['✂️', 'Rip 11 Packs', 'Rarity tells, walkout flares, 1 pick per pack.'],
          ['📺', 'Live Season', 'Table, ticker, leaderboards and touchline calls.'],
          ['👑', 'Grade F → S+', 'Go unbeaten and enter the 38-0 Trophy Vault.'],
        ].map(([e, t, d]) => (
          <div key={t} className="comic-paper rounded-2xl p-3">
            <div className="text-2xl">{e}</div>
            <div className="mt-1 font-display text-xl leading-none">{t}</div>
            <div className="mt-1 text-xs font-medium text-ink/70">{d}</div>
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

/** Home screen panel for today's Daily Draft: play it, or see (and share) how it went. */
function DailyCard({ onPlay }: { onPlay: () => void }) {
  const day = todayKey();
  const all = loadDaily();
  const today = all[day];
  const streak = dailyStreak(all, day);
  const [shared, setShared] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const share = async () => {
    if (!today) return;
    const r = await shareText(dailyShareText(today, streak));
    sfx.select();
    setShared(r === 'copied' ? 'Copied!' : r === 'shared' ? 'Shared!' : 'Copy failed');
    window.setTimeout(() => setShared(null), 2000);
  };
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-[3px] border-ink bg-album-blue p-3 text-left shadow-[5px_5px_0_#0b0e24]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-sky-300" />
          <span className="font-display text-2xl leading-none text-white">DAILY DRAFT #{dayNumber(day)}</span>
        </div>
        {streak > 0 && <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-black text-orange-200">🔥 {streak}</span>}
      </div>
      {!today ? (
        <>
          <div className="text-xs text-white/65">Same managers, packs and league for everyone today. One attempt: leaving mid-run uses it.</div>
          <button onClick={onPlay} className="rounded-xl bg-sky-400 px-4 py-2 font-display text-xl tracking-wider text-black transition hover:bg-sky-300">
            PLAY TODAY'S DRAFT
          </button>
        </>
      ) : today.status === 'done' ? (
        <>
          <div className="text-sm font-bold text-white">
            {today.position === 1 ? '🏆' : '⚽'} {ordinal(today.position ?? 0)} · {today.points} pts · Grade {today.grade}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={share} className="flex items-center gap-1.5 rounded-xl bg-sky-400 px-3 py-1.5 font-display text-lg tracking-wider text-black hover:bg-sky-300">
              {shared ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {shared ?? 'SHARE'}
            </button>
            <span className="text-xs text-white/55">Next draft in {untilTomorrow()}</span>
          </div>
        </>
      ) : (
        <div className="text-xs text-white/65">Today's attempt has been used. Next draft in {untilTomorrow()}.</div>
      )}
    </div>
  );
}

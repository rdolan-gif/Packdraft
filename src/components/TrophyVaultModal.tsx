import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Crown, History, Trash2, Trophy, Users, X } from 'lucide-react';
import type { CareerStats, VaultEntry } from '../types/game';
import { FORMATIONS, pitchY } from '../data/formations';
import { MANAGERS_BY_ID } from '../data/managers';
import { PLAYERS_BY_ID } from '../data/players';
import { LEAGUE_ERA_IDS, LEAGUE_ERAS, ordinal, type LeagueEraId } from '../engine/seasonSimulator';
import { bestEverXI, loadHistory, personalRecords } from '../engine/history';
import { replaySeason, type ReplayResult } from '../engine/replay';
import type { FormationId, Lineup } from '../types/game';
import { sfx } from '../engine/soundEffects';
import { PlayerCardUI, cardEmoji } from './PlayerCardUI';
import { GRADE_STYLE } from './SeasonReviewCard';

interface Props {
  vault: VaultEntry[];
  career: CareerStats;
  onClose: () => void;
  onDelete: (id: string) => void;
  /** Save a changed entry (e.g. new era replays). */
  onUpdate: (e: VaultEntry) => void;
}

type Tab = 'champions' | 'records' | 'xi';

function flexText(e: VaultEntry) {
  const m = MANAGERS_BY_ID[e.managerId];
  const cards = e.lineup.map((l) => PLAYERS_BY_ID[l.cardId]).filter(Boolean);
  const stars = [...cards].sort((a, b) => b.ovr - a.ovr).slice(0, 3);
  return [
    `🏆 PackDraft 38 Trophy Vault · ${e.teamName}`,
    `${e.invincible ? '👑 INVINCIBLES' : 'CHAMPIONS'} · Grade ${e.grade}`,
    `${e.record.w}W ${e.record.d}D ${e.record.l}L · ${e.record.pts} pts · GD ${e.record.gf - e.record.ga >= 0 ? '+' : ''}${e.record.gf - e.record.ga}`,
    `${m.emoji} ${m.name} · ${e.formationId} · ${e.teamRating.toFixed(1)} rated`,
    `Stars: ${stars.map((c) => `${c.season} ${c.shortName} (${c.ovr})`).join(', ')}`,
    e.topScorer ? `Top scorer: ${e.topScorer.name} (${e.topScorer.goals})` : '',
    cards.map((c) => cardEmoji(c)).join(''),
  ]
    .filter(Boolean)
    .join('\n');
}

export function TrophyVaultModal({ vault, career, onClose, onDelete, onUpdate }: Props) {
  const [open, setOpen] = useState<VaultEntry | null>(null);
  const [tab, setTab] = useState<Tab>('champions');
  const history = useMemo(loadHistory, []);
  // The open entry, kept in step with the saved copy (replays update it).
  const current = open ? vault.find((v) => v.id === open.id) ?? open : null;
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const copy = async (e: VaultEntry) => {
    const text = flexText(e);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    sfx.select();
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/85 p-3 sm:p-6" onClick={onClose}>
      <div className="relative my-4 w-full max-w-5xl animate-pop overflow-hidden rounded-3xl border-2 border-yellow-300/60 bg-gradient-to-b from-zinc-900 to-black" onClick={(e) => e.stopPropagation()}>
        <div className="relative overflow-hidden border-b border-yellow-300/30 bg-gradient-to-r from-amber-700/40 via-yellow-500/20 to-amber-700/40 px-5 py-4">
          <div className="holo z-0 opacity-20" />
          <div className="relative flex items-center gap-3">
            {open && (
              <button onClick={() => (setOpen(null), setConfirmDelete(false))} className="rounded-lg bg-black/40 p-2 text-white hover:bg-black/60" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <Trophy className="h-8 w-8 text-yellow-300" />
            <div>
              <div className="font-display text-3xl leading-none text-white">THE 38-0 TROPHY VAULT</div>
              <div className="text-xs font-bold uppercase tracking-widest text-yellow-200/80">Hall of Fame · Champions and unbeaten squads</div>
            </div>
            <button onClick={onClose} className="ml-auto rounded-lg bg-black/40 p-2 text-white hover:bg-black/60" aria-label="Close vault">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* career stats */}
        <div className="grid grid-cols-3 gap-2 border-b border-white/10 p-4 sm:grid-cols-6">
          {[
            ['Runs', career.runs],
            ['Titles', career.titles],
            ['Invincibles', career.invincibles],
            ['Perfect 38-0', career.perfect38],
            ['Best Pts', career.bestPoints],
            ['Best Grade', career.bestGrade ?? '—'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/5 p-2 text-center">
              <div className="text-[10px] font-black uppercase tracking-wider text-white/50">{k}</div>
              <div className="font-display text-2xl text-yellow-200">{v}</div>
            </div>
          ))}
        </div>

        {!open && (
          <div className="flex gap-1 border-b border-white/10 px-4 pt-3" role="tablist">
            {(
              [
                ['champions', 'Champions', <Trophy key="t" className="h-4 w-4" />],
                ['records', 'Records', <History key="h" className="h-4 w-4" />],
                ['xi', 'Best Ever XI', <Users key="u" className="h-4 w-4" />],
              ] as [Tab, string, JSX.Element][]
            ).map(([id, label, icon]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => (sfx.click(), setTab(id))}
                className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition ${tab === id ? 'bg-yellow-300 text-black' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        )}

        {!open && tab === 'records' && <RecordsTab history={history} />}
        {!open && tab === 'xi' && <BestXiTab history={history} />}

        {!open && tab === 'champions' && (
          <div className="p-4">
            {vault.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="text-6xl opacity-40">🏆</div>
                <div className="font-display text-2xl text-white/80">THE CABINET IS EMPTY… FOR NOW</div>
                <div className="max-w-md text-sm text-white/50">Win the league or go a whole season unbeaten to immortalise your XI here. It is saved in this browser.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {vault.map((e) => {
                  const st = GRADE_STYLE[e.grade];
                  const cards = e.lineup.map((l) => PLAYERS_BY_ID[l.cardId]).filter(Boolean);
                  const best = [...cards].sort((a, b) => b.ovr - a.ovr)[0];
                  return (
                    <button
                      key={e.id}
                      onClick={() => {
                        sfx.flip();
                        setOpen(e);
                      }}
                      onMouseEnter={() => sfx.hover()}
                      className={`card-base sweep group flex flex-col gap-2 border-2 p-3 text-left transition hover:-translate-y-1 ${e.invincible ? 'border-yellow-300 bg-gradient-to-br from-yellow-500/25 via-amber-900/30 to-black' : 'border-white/15 bg-white/5'}`}
                    >
                      {e.invincible && <div className="holo z-0 opacity-25" />}
                      <div className="relative flex items-center gap-3">
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 font-display text-3xl ${st.stamp}`}>{e.grade}</div>
                        <div className="min-w-0">
                          <div className="truncate font-display text-xl leading-none text-white">{e.teamName}</div>
                          <div className="text-xs font-bold text-white/60">
                            {e.record.w}-{e.record.d}-{e.record.l} · {e.record.pts} pts
                          </div>
                          <div className="text-[10px] text-white/40">{new Date(e.savedAt).toLocaleDateString()}</div>
                        </div>
                        {e.invincible && <Crown className="ml-auto h-6 w-6 text-yellow-300" fill="currentColor" />}
                      </div>
                      <div className="relative text-xs text-white/70">
                        {MANAGERS_BY_ID[e.managerId].emoji} {e.formationId} · Star: {best ? `${best.season} ${best.shortName}` : '—'}
                      </div>
                      <div className="relative text-sm tracking-tight">{cards.map((c) => cardEmoji(c)).join('')}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {current && (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1.1fr_1fr]">
            <div className="pitch relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-2xl border-2 border-white/15">
              {FORMATIONS[current.formationId].slots.map((s) => {
                const ref = current.lineup.find((l) => l.slotId === s.id);
                const c = ref ? PLAYERS_BY_ID[ref.cardId] : undefined;
                return c ? (
                  <div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2 max-sm:scale-[0.8]" style={{ left: `${s.x}%`, top: `${pitchY(s.y)}%` }}>
                    <PlayerCardUI card={c} size="xs" />
                  </div>
                ) : null;
              })}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-20 w-20 items-center justify-center rounded-full border-4 font-display text-5xl ${GRADE_STYLE[current.grade].stamp} ${GRADE_STYLE[current.grade].glow}`}>{current.grade}</div>
                <div>
                  <div className="font-display text-3xl leading-none text-white">{current.teamName}</div>
                  <div className="text-sm font-bold text-yellow-200">{current.invincible ? '👑 INVINCIBLES' : `${ordinal(current.record.pos)} · Champions`}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ['Record', `${current.record.w}-${current.record.d}-${current.record.l}`],
                  ['Points', current.record.pts],
                  ['GD', `${current.record.gf - current.record.ga >= 0 ? '+' : ''}${current.record.gf - current.record.ga}`],
                  ['Scored', current.record.gf],
                  ['Conceded', current.record.ga],
                  ['Rating', current.teamRating.toFixed(1)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/5 p-2">
                    <div className="text-[10px] font-black uppercase text-white/50">{k}</div>
                    <div className="font-display text-2xl text-white">{v}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-sm text-white/80">
                <div>
                  {MANAGERS_BY_ID[current.managerId].emoji} <b>{MANAGERS_BY_ID[current.managerId].name}</b> · {current.formationId}
                </div>
                {current.mvpName && <div>🏅 MVP: {current.mvpName}</div>}
                {current.topScorer && (
                  <div>
                    ⚽ Top scorer: {current.topScorer.name} ({current.topScorer.goals})
                  </div>
                )}
              </div>
              <ReplayPanel
                original={current.record}
                saved={current.replays}
                run={(eraId) => {
                  const lineup: Lineup = Object.fromEntries(FORMATIONS[current.formationId].slots.map((s) => [s.id, null]));
                  current.lineup.forEach((l) => PLAYERS_BY_ID[l.cardId] && (lineup[l.slotId] = PLAYERS_BY_ID[l.cardId]));
                  const r = replaySeason({ teamName: current.teamName, formationId: current.formationId, lineup, managerId: current.managerId, eraId });
                  onUpdate({ ...current, replays: { ...(current.replays ?? {}), [eraId]: { position: r.position, points: r.points, w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga } } });
                  return r;
                }}
              />
              <pre className="whitespace-pre-wrap rounded-xl comic-panel p-3 font-sans text-xs text-white/80">{flexText(current)}</pre>
              <div className="flex gap-2">
                <button onClick={() => copy(current)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-300 px-4 py-2.5 font-display text-xl tracking-wider text-black hover:bg-yellow-200">
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? 'COPIED' : 'COPY FLEX CARD'}
                </button>
                <button
                  onClick={() => {
                    if (confirmDelete) {
                      onDelete(current.id);
                      setOpen(null);
                      setConfirmDelete(false);
                    } else setConfirmDelete(true);
                  }}
                  className={`flex items-center gap-1 rounded-xl border px-3 ${confirmDelete ? 'border-rose-400 bg-rose-500/25 text-rose-100' : 'border-rose-500/50 text-rose-300 hover:bg-rose-500/15'}`}
                  aria-label={confirmDelete ? 'Tap again to delete' : 'Delete from vault'}
                >
                  <Trash2 className="h-5 w-5" />
                  {confirmDelete && <span className="text-xs font-black uppercase">Confirm</span>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Records ─────────────────────────────

function RecordsTab({ history }: { history: ReturnType<typeof loadHistory> }) {
  const recs = useMemo(() => personalRecords(history), [history]);
  if (!recs.length)
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <div className="text-5xl opacity-40">📜</div>
        <div className="font-display text-2xl text-white/80">NO RECORDS YET</div>
        <div className="max-w-md text-sm text-white/50">Finish a season and your personal bests start here: most points, best goal difference, top scorer ever and more.</div>
      </div>
    );
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {recs.map((r) => {
          const card = r.cardId ? PLAYERS_BY_ID[r.cardId] : undefined;
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-yellow-300/25 bg-gradient-to-br from-yellow-500/10 to-black/30 p-3">
              {card ? <PlayerCardUI card={card} size="xs" tilt={false} /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-yellow-300/15 text-3xl">{r.emoji}</div>}
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-widest text-yellow-200/80">{r.label}</div>
                <div className="font-display text-3xl leading-none text-white">{r.value}</div>
                <div className="truncate text-xs text-white/55">{r.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs text-white/40">From your last {history.length} season{history.length === 1 ? '' : 's'} in this browser.</p>
    </div>
  );
}

// ───────────────────────────── Best Ever XI ─────────────────────────────

const BEST_XI_FORMATION: FormationId = '4-3-3';

function BestXiTab({ history }: { history: ReturnType<typeof loadHistory> }) {
  const { lineup, picks } = useMemo(() => bestEverXI(history, BEST_XI_FORMATION), [history]);
  const full = picks.length === 11;
  if (!picks.length)
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <div className="text-5xl opacity-40">🧩</div>
        <div className="font-display text-2xl text-white/80">YOUR BEST EVER XI</div>
        <div className="max-w-md text-sm text-white/50">Built from the best single seasons of every player you've drafted (10+ appearances). Finish a season to start picking it.</div>
      </div>
    );
  return (
    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1.1fr_1fr]">
      <div className="pitch relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-2xl border-2 border-white/15">
        {FORMATIONS[BEST_XI_FORMATION].slots.map((s) => {
          const c = lineup[s.id];
          return c ? (
            <div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2 max-sm:scale-[0.8]" style={{ left: `${s.x}%`, top: `${pitchY(s.y)}%` }}>
              <PlayerCardUI card={c} size="xs" />
            </div>
          ) : (
            <div key={s.id} className="absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-dashed border-white/30 text-[10px] font-black text-white/50" style={{ left: `${s.x}%`, top: `${pitchY(s.y)}%` }}>
              {s.label}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <div className="font-display text-3xl leading-none text-white">BEST EVER XI</div>
          <div className="text-xs text-white/55">Each player's best season for you (10+ games), in a {BEST_XI_FORMATION}.</div>
        </div>
        <div className="flex flex-col gap-1">
          {picks.map((p) => (
            <div key={p.slotId} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-sm">
              <span className="min-w-0 truncate text-white">
                <b className="mr-1.5 inline-block w-8 text-xs text-white/50">{FORMATIONS[BEST_XI_FORMATION].slots.find((s) => s.id === p.slotId)?.label}</b>
                {p.card.season} {p.card.shortName}
              </span>
              <span className="shrink-0 text-xs text-white/60">
                {p.stats.avg.toFixed(2)} avg · {p.stats.slot === 'GK' ? `${p.stats.cleanSheets} CS` : `${p.stats.goals}G ${p.stats.assists}A`}
              </span>
            </div>
          ))}
        </div>
        {full ? (
          <ReplayPanel
            title="Play this XI in any era"
            run={(eraId) => replaySeason({ teamName: 'Best Ever XI', formationId: BEST_XI_FORMATION, lineup, managerId: null, eraId })}
          />
        ) : (
          <div className="rounded-xl bg-white/5 p-3 text-xs text-white/55">{11 - picks.length} position{11 - picks.length === 1 ? '' : 's'} still empty. Keep drafting to fill your Best Ever XI, then play it in any era.</div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Era replays ─────────────────────────────

type ReplayRow = { position: number; points: number; w: number; d: number; l: number; gf: number; ga: number };

function ReplayPanel({ run, original, saved, title = 'Replay in another era' }: { run: (eraId: LeagueEraId) => ReplayResult; original?: { pts: number; pos: number }; saved?: Record<string, ReplayRow>; title?: string }) {
  const [results, setResults] = useState<Record<string, ReplayRow>>(saved ?? {});
  const [busy, setBusy] = useState<LeagueEraId | null>(null);
  const play = (eraId: LeagueEraId) => {
    setBusy(eraId);
    sfx.whistle();
    // Let the button show its busy state before the (quick) season runs.
    window.setTimeout(() => {
      const r = run(eraId);
      setResults((cur) => ({ ...cur, [eraId]: r }));
      setBusy(null);
      if (r.position === 1) sfx.trophy();
    }, 30);
  };
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-flare-300">{title}</div>
      <div className="mt-0.5 text-xs text-white/50">A full 38-game season, simmed instantly. Every replay is a fresh season, so results vary.</div>
      <div className="mt-2 grid grid-cols-1 gap-1.5">
        {LEAGUE_ERA_IDS.map((id) => {
          const r = results[id];
          const diff = r && original ? r.points - original.pts : null;
          return (
            <div key={id} className="flex items-center gap-2">
              <button
                onClick={() => play(id)}
                disabled={busy !== null}
                className="w-36 shrink-0 rounded-lg bg-flare-500/90 px-2 py-1.5 text-left text-xs font-black uppercase leading-tight text-black transition hover:bg-flare-400 disabled:opacity-50"
              >
                {busy === id ? 'Playing…' : LEAGUE_ERAS[id].name}
                <span className="block text-[9px] font-bold normal-case opacity-70">{LEAGUE_ERAS[id].years}</span>
              </button>
              <div className="min-w-0 text-xs text-white/80">
                {r ? (
                  <>
                    <b className="text-white">
                      {r.position === 1 ? '🏆 ' : ''}
                      {ordinal(r.position)} · {r.points} pts
                    </b>{' '}
                    · {r.w}-{r.d}-{r.l} · GD {r.gf - r.ga >= 0 ? '+' : ''}
                    {r.gf - r.ga}
                    {diff !== null && <span className={diff >= 0 ? 'text-flare-300' : 'text-rose-300'}> ({diff >= 0 ? '+' : ''}{diff} vs original)</span>}
                  </>
                ) : (
                  <span className="text-white/40">Not played yet</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

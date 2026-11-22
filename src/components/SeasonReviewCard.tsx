import { useEffect, useState } from 'react';
import { Check, Copy, Crown, Medal, RotateCcw, Shield, Target, Trophy, Footprints } from 'lucide-react';
import { FORMATIONS, pitchY } from '../data/formations';
import { MANAGERS_BY_ID } from '../data/managers';
import type { FormationId, Grade, Lineup, ManagerId, SeasonSummary, TeamRating } from '../types/game';
import { gradeLabel, ordinal } from '../engine/seasonSimulator';
import { sfx } from '../engine/soundEffects';
import { goldConfetti, rainbowConfetti, shakeScreen } from '../engine/fx';
import { PlayerCardUI, cardEmoji } from './PlayerCardUI';
import { NewTrophies } from './TrophyCabinetModal';
import type { Trophy as TrophyDef } from '../engine/achievements';
import { shareText } from '../engine/share';
import { SeasonCardDownload } from './SeasonCardDownload';

export const GRADE_STYLE: Record<Grade, { stamp: string; text: string; glow: string }> = {
  // Comic starburst stamps: flat colour, navy outline (from the burst-clip shape) and a hard shadow.
  'S+': { stamp: 'foil-holo text-ink', text: 'text-flare-500', glow: '' },
  S: { stamp: 'bg-flare-500 text-ink', text: 'text-flare-500', glow: '' },
  A: { stamp: 'bg-album-red text-white', text: 'text-album-cream', glow: '' },
  B: { stamp: 'bg-album-blue text-white', text: 'text-album-cream', glow: '' },
  C: { stamp: 'bg-album-cream text-ink', text: 'text-album-cream', glow: '' },
  D: { stamp: 'bg-[#ff8a1f] text-ink', text: 'text-album-cream', glow: '' },
  F: { stamp: 'stamp-crack bg-[#6b7280] text-white', text: 'text-album-cream', glow: '' },
};

interface Props {
  summary: SeasonSummary;
  teamName: string;
  formationId: FormationId;
  lineup: Lineup;
  managerId: ManagerId;
  rating: TeamRating;
  savedToVault: boolean;
  onNewRun: () => void;
  onOpenVault: () => void;
  /** Trophies unlocked by this season. */
  newTrophies?: TrophyDef[];
  onOpenCabinet?: () => void;
  /** Set when this was today's Daily Draft. */
  daily?: { number: number; streak: number; text: string };
}

export function buildShareText(opts: { summary: SeasonSummary; teamName: string; formationId: FormationId; lineup: Lineup; managerId: ManagerId }) {
  const { summary, teamName, formationId, lineup, managerId } = opts;
  const f = FORMATIONS[formationId];
  const rowsByY = new Map<number, string[]>();
  [...f.slots]
    .sort((a, b) => a.x - b.x)
    .forEach((s) => {
      const c = lineup[s.id];
      const key = Math.round(s.y / 9);
      rowsByY.set(key, [...(rowsByY.get(key) ?? []), c ? cardEmoji(c) : '⬛']);
    });
  const grid = [...rowsByY.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r.join('')).join('\n');
  const r = summary.record;
  const m = MANAGERS_BY_ID[managerId];
  return [
    `⚽ PackDraft 38 · ${teamName}`,
    `Grade: ${summary.grade} ${summary.grade === 'S+' ? '👑 INVINCIBLE' : `· ${gradeLabel(summary.grade, summary.position).title}`}`,
    `${ordinal(summary.position)} · ${r.points} pts · ${r.won}W ${r.drawn}D ${r.lost}L · GD ${r.gf - r.ga >= 0 ? '+' : ''}${r.gf - r.ga}`,
    `${m.emoji} ${m.name} · ${formationId}`,
    '',
    grid,
    '',
    '⬜ Prime  🟨 Gold  ⬛ Squad · 81–85 by era: 🟥 Cult Hero 🟪 Veteran 🟩 Rising Star 🟦 World Class 🩷 Prime 🟫 Legend 🔲 Squad',
  ].join('\n');
}

export function SeasonReviewCard({ summary, teamName, formationId, lineup, managerId, rating, savedToVault, onNewRun, onOpenVault, newTrophies = [], onOpenCabinet, daily }: Props) {
  const [stamped, setStamped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dailyShared, setDailyShared] = useState<string | null>(null);
  const shareDaily = async () => {
    if (!daily) return;
    const r = await shareText(daily.text);
    sfx.select();
    setDailyShared(r === 'copied' ? 'COPIED!' : r === 'shared' ? 'SHARED!' : 'COPY FAILED');
    window.setTimeout(() => setDailyShared(null), 2000);
  };
  const g = summary.grade;
  const info = gradeLabel(g, summary.position);
  const style = GRADE_STYLE[g];
  const f = FORMATIONS[formationId];
  const manager = MANAGERS_BY_ID[managerId];
  const r = summary.record;

  useEffect(() => {
    sfx.tension();
    const t = window.setTimeout(() => {
      setStamped(true);
      sfx.stamp();
      shakeScreen(g === 'S+' || g === 'S' ? 'heavy' : 'micro');
      if (g === 'S+') {
        rainbowConfetti();
        goldConfetti(1.6);
        sfx.roar();
      } else if (g === 'S') {
        goldConfetti(1.2);
        sfx.trophy();
      } else if (g === 'A' || g === 'B') {
        goldConfetti(0.5);
        sfx.fanfare();
      } else if (g === 'F') {
        sfx.sad();
      }
    }, 1300);
    return () => clearTimeout(t);
  }, [g]);

  const copy = async () => {
    const text = buildShareText({ summary, teamName, formationId, lineup, managerId });
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
    sfx.select();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const award = (icon: React.ReactNode, label: string, value: string, highlight?: boolean) => (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${highlight ? 'border-ink bg-flare-500/20' : 'border-ink-950 bg-ink-700'}`}>
      <div className={highlight ? 'text-yellow-300' : 'text-white/50'}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-widest text-white/50">{label}</div>
        <div className="text-sm font-bold leading-snug text-white">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4">
      <div data-shake-zone className={`title-rays relative overflow-hidden rounded-[22px] border-[5px] border-ink p-4 shadow-[10px_10px_0_#0b0e24] sm:p-6`}>
        
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* left: grade + verdict */}
          <div className="flex flex-col">
            <div className="inline-block -rotate-2 self-start border-[3px] border-ink bg-album-red px-3 pb-0.5 pt-1.5 font-chunky text-sm text-white shadow-[3px_3px_0_#0b0e24]">SEASON REVIEW · {teamName.toUpperCase()}</div>
            <div className="comic-title mt-3 font-display text-5xl leading-none sm:text-6xl">{info.subtitle.toUpperCase()}!</div>

            <div className="relative my-6 flex h-48 items-center justify-center">
              {!stamped && <div className="font-display text-2xl tracking-widest text-white/40 animate-pulse">THE PUNDITS ARE DELIBERATING…</div>}
              {stamped && (
                <div className="animate-stamp" style={{ filter: 'drop-shadow(6px 6px 0 #0b0e24)' }}>
                <div className={`burst-clip flex h-52 w-52 flex-col items-center justify-center ${style.stamp}`}>
                  {g === 'S+' && <Crown className="-mb-1 h-8 w-8" fill="currentColor" />}
                  <div className="font-display text-7xl leading-none">{g}</div>
                  <div className="px-2 text-center font-chunky text-xs">{info.title}</div>
                </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[14px] border-[3px] border-ink bg-album-cream p-2 text-ink shadow-[4px_4px_0_#0b0e24]">
                <div className="text-[11px] font-black uppercase tracking-widest">Finish</div>
                <div className="font-display text-4xl text-album-red">{ordinal(summary.position)}</div>
              </div>
              <div className="rounded-[14px] border-[3px] border-ink bg-album-cream p-2 text-ink shadow-[4px_4px_0_#0b0e24]">
                <div className="text-[11px] font-black uppercase tracking-widest">Points</div>
                <div className="font-display text-4xl">{r.points}</div>
              </div>
              <div className="rounded-[14px] border-[3px] border-ink bg-album-cream p-2 text-ink shadow-[4px_4px_0_#0b0e24]">
                <div className="text-[11px] font-black uppercase tracking-widest">Goal Diff</div>
                <div className="font-display text-4xl">
                  {r.gf - r.ga >= 0 ? '+' : ''}
                  {r.gf - r.ga}
                </div>
              </div>
            </div>
            <div className="mt-2 text-center text-sm font-bold text-white/70">
              {r.won}W · {r.drawn}D · {r.lost}L · {r.gf} GF · {r.ga} GA
            </div>

            <div className="mt-4 rounded-2xl comic-panel p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-yellow-300">
                Scout's Verdict{summary.scout && <span className="text-white/60"> · {summary.scout.emoji} {summary.scout.name}</span>}
              </div>
              <p className="mt-1 text-[15px] italic leading-relaxed text-white/90">“{summary.verdict}”</p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {award(<Medal className="h-5 w-5" />, 'Club MVP', summary.mvp ? `${summary.mvp.name} · ${(summary.mvp.ratingSum / Math.max(1, summary.mvp.apps)).toFixed(2)} avg · ${summary.mvp.goals}G ${summary.mvp.assists}A` : '—', true)}
              {award(<Target className="h-5 w-5" />, summary.userWonBoot ? 'Golden Boot: WON' : 'Golden Boot', summary.goldenBoot ? `${summary.goldenBoot.name} · ${summary.goldenBoot.goals} goals` : '—', summary.userWonBoot)}
              {award(<Shield className="h-5 w-5" />, summary.userWonGlove ? 'Golden Glove: WON' : 'Golden Glove', summary.goldenGlove ? `${summary.goldenGlove.name} · ${summary.goldenGlove.cleanSheets} CS` : '—', summary.userWonGlove)}
              {award(<Footprints className="h-5 w-5" />, summary.userWonPlaymaker ? 'Playmaker: WON' : 'Playmaker', summary.playmaker ? `${summary.playmaker.name} · ${summary.playmaker.assists} assists` : '—', summary.userWonPlaymaker)}
              {award(<span className="text-lg">{manager.emoji}</span>, 'Manager Tactical Rating', `${summary.tacticalRating.toFixed(1)} / 10 · ${manager.name}`)}
              {award(<span className="text-lg">⚗️</span>, 'Squad Profile', `${rating.overall.toFixed(1)} rated · ${rating.chemistry} chem · ${formationId}`)}
            </div>
          </div>

          {/* right: pitch + highlights */}
          <div className="flex flex-col gap-4">
            <div className="pitch relative mx-auto aspect-[4/5] w-full max-w-[440px] overflow-hidden rounded-2xl border-2 border-ink-950">
              {f.slots.map((s) => {
                const c = lineup[s.id];
                return c ? (
                  <div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2 max-sm:scale-[0.8]" style={{ left: `${s.x}%`, top: `${pitchY(s.y)}%` }}>
                    <PlayerCardUI card={c} size="xs" tilt={false} />
                  </div>
                ) : null;
              })}
              {summary.mvpCard && (
                <div className="absolute right-2 top-2 rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black uppercase text-black">MVP: {summary.mvpCard.shortName}</div>
              )}
            </div>

            {daily && (
              <div className="rounded-2xl border border-sky-300/50 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-sky-200">Daily Draft #{daily.number}</div>
                    <div className="font-display text-xl leading-none text-white">{daily.streak > 1 ? `🔥 ${daily.streak}-day streak` : 'Same packs for everyone today'}</div>
                  </div>
                  <button onClick={shareDaily} className="flex shrink-0 items-center gap-1.5 btn-cut bg-flare-500 px-3 py-2 text-lg text-ink hover:bg-flare-400">
                    {dailyShared ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {dailyShared ?? 'SHARE RESULT'}
                  </button>
                </div>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-ink-950/80 p-2 font-sans text-xs leading-snug text-white/80">{daily.text}</pre>
              </div>
            )}

            {newTrophies.length > 0 && (
              <button onClick={onOpenCabinet} className="text-left" aria-label="Open the trophy cabinet">
                <NewTrophies list={newTrophies} />
              </button>
            )}

            <div className="rounded-2xl comic-panel p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-flare-300">Season Highlights</div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {summary.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2 text-sm text-white/85">
                    <span className="text-yellow-300">▸</span> {h}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={copy} className="btn-cut flex flex-1 items-center justify-center gap-2 bg-album-cream px-4 py-3 text-xl text-ink">
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? 'COPIED!' : 'COPY SHARE GRID'}
              </button>
              <button onClick={onNewRun} className="flex flex-1 items-center justify-center gap-2 btn-cut bg-flare-500 hover:bg-flare-400 px-4 py-3 font-display text-xl tracking-wider text-black transition hover:scale-[1.02]">
                <RotateCcw className="h-5 w-5" /> DRAFT AGAIN
              </button>
            </div>
            <SeasonCardDownload summary={summary} teamName={teamName} formationId={formationId} lineup={lineup} managerId={managerId} rating={rating} dailyNumber={daily?.number} />
            {savedToVault ? (
              <button onClick={onOpenVault} className="flex items-center justify-center gap-2 rounded-xl border border-yellow-300/60 bg-yellow-300/10 px-4 py-2 text-sm font-black uppercase tracking-wider text-yellow-200 hover:bg-yellow-300/20">
                <Trophy className="h-4 w-4" /> Immortalised in the 38-0 Trophy Vault. View it.
              </button>
            ) : (
              <div className="text-center text-xs text-white/50">Win the league or go unbeaten to enter the Trophy Vault.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Check, Copy, Crown, Medal, RotateCcw, Shield, Target, Trophy, Footprints } from 'lucide-react';
import { FORMATIONS } from '../data/formations';
import { MANAGERS_BY_ID } from '../data/managers';
import type { FormationId, Grade, Lineup, ManagerId, SeasonSummary, TeamRating } from '../types/game';
import { GRADE_INFO, ordinal } from '../engine/seasonSimulator';
import { sfx } from '../engine/soundEffects';
import { goldConfetti, rainbowConfetti, shakeScreen } from '../engine/fx';
import { PlayerCardUI, TIER_EMOJI } from './PlayerCardUI';

export const GRADE_STYLE: Record<Grade, { stamp: string; text: string; glow: string }> = {
  'S+': { stamp: 'bg-[conic-gradient(from_0deg,#facc15,#f472b6,#22d3ee,#a3e635,#facc15)] text-black border-yellow-100', text: 'text-yellow-200', glow: 'shadow-[0_0_60px_rgba(250,204,21,.8)]' },
  S: { stamp: 'bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-600 text-black border-yellow-100', text: 'text-yellow-300', glow: 'shadow-[0_0_50px_rgba(250,204,21,.6)]' },
  A: { stamp: 'bg-gradient-to-br from-emerald-400 via-emerald-600 to-yellow-500 text-white border-emerald-200', text: 'text-emerald-300', glow: 'shadow-[0_0_40px_rgba(16,185,129,.5)]' },
  B: { stamp: 'bg-gradient-to-br from-sky-400 to-blue-700 text-white border-sky-200', text: 'text-sky-300', glow: 'shadow-[0_0_40px_rgba(56,189,248,.5)]' },
  C: { stamp: 'bg-gradient-to-br from-slate-200 to-slate-500 text-black border-white', text: 'text-slate-200', glow: 'shadow-[0_0_30px_rgba(226,232,240,.35)]' },
  D: { stamp: 'bg-gradient-to-br from-amber-400 to-orange-700 text-black border-amber-200', text: 'text-amber-300', glow: 'shadow-[0_0_30px_rgba(245,158,11,.45)]' },
  F: { stamp: 'stamp-crack bg-gradient-to-br from-rose-600 to-red-950 text-white border-rose-300', text: 'text-rose-400', glow: 'shadow-[0_0_40px_rgba(225,29,72,.5)]' },
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
      rowsByY.set(key, [...(rowsByY.get(key) ?? []), c ? TIER_EMOJI[c.tier] : '⬛']);
    });
  const grid = [...rowsByY.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r.join('')).join('\n');
  const r = summary.record;
  const m = MANAGERS_BY_ID[managerId];
  return [
    `⚽ PackDraft 38 · ${teamName}`,
    `Grade: ${summary.grade} ${summary.grade === 'S+' ? '👑 INVINCIBLE' : `· ${GRADE_INFO[summary.grade].title}`}`,
    `${ordinal(summary.position)} · ${r.points} pts · ${r.won}W ${r.drawn}D ${r.lost}L · GD ${r.gf - r.ga >= 0 ? '+' : ''}${r.gf - r.ga}`,
    `${m.emoji} ${m.name} · ${formationId}`,
    '',
    grid,
    '',
    '🟨 Prime  🟪 World Class  🟦 Cult  ⬜ Squad',
  ].join('\n');
}

export function SeasonReviewCard({ summary, teamName, formationId, lineup, managerId, rating, savedToVault, onNewRun, onOpenVault }: Props) {
  const [stamped, setStamped] = useState(false);
  const [copied, setCopied] = useState(false);
  const g = summary.grade;
  const info = GRADE_INFO[g];
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
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${highlight ? 'border-yellow-300/70 bg-yellow-300/10' : 'border-white/10 bg-white/5'}`}>
      <div className={highlight ? 'text-yellow-300' : 'text-white/50'}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-widest text-white/50">{label}</div>
        <div className="truncate text-sm font-bold text-white">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4">
      <div className={`relative overflow-hidden rounded-3xl border-2 bg-gradient-to-br from-zinc-900 via-black to-emerald-950 p-4 sm:p-6 ${g === 'S+' ? 'border-yellow-300' : 'border-white/15'}`}>
        {g === 'S+' && <div className="holo opacity-30" />}
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* left: grade + verdict */}
          <div className="flex flex-col">
            <div className="text-[11px] font-black uppercase tracking-[0.35em] text-emerald-400">Season Review · {teamName}</div>
            <div className="mt-1 font-display text-4xl leading-none text-white sm:text-5xl">{info.subtitle.toUpperCase()}</div>

            <div className="relative my-6 flex h-48 items-center justify-center">
              {!stamped && <div className="font-display text-2xl tracking-widest text-white/40 animate-pulse">THE PUNDITS ARE DELIBERATING…</div>}
              {stamped && (
                <div className={`animate-stamp flex h-44 w-44 flex-col items-center justify-center rounded-full border-[6px] ${style.stamp} ${style.glow}`}>
                  {g === 'S+' && <Crown className="-mb-1 h-8 w-8" fill="currentColor" />}
                  <div className="font-display text-7xl leading-none">{g}</div>
                  <div className="px-2 text-center text-[11px] font-black uppercase tracking-widest">{info.title}</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] font-black uppercase text-white/50">Finish</div>
                <div className={`font-display text-3xl ${style.text}`}>{ordinal(summary.position)}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] font-black uppercase text-white/50">Points</div>
                <div className="font-display text-3xl text-white">{r.points}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <div className="text-[10px] font-black uppercase text-white/50">Goal Diff</div>
                <div className="font-display text-3xl text-white">
                  {r.gf - r.ga >= 0 ? '+' : ''}
                  {r.gf - r.ga}
                </div>
              </div>
            </div>
            <div className="mt-2 text-center text-sm font-bold text-white/70">
              {r.won}W · {r.drawn}D · {r.lost}L · {r.gf} GF · {r.ga} GA
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Scout's Verdict</div>
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
            <div className="pitch relative mx-auto aspect-[4/5] w-full max-w-[440px] overflow-hidden rounded-2xl border-2 border-white/15">
              {f.slots.map((s) => {
                const c = lineup[s.id];
                return c ? (
                  <div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                    <PlayerCardUI card={c} size="xs" tilt={false} />
                  </div>
                ) : null;
              })}
              {summary.mvpCard && (
                <div className="absolute right-2 top-2 rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black uppercase text-black">MVP: {summary.mvpCard.shortName}</div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Season Highlights</div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {summary.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2 text-sm text-white/85">
                    <span className="text-yellow-300">▸</span> {h}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={copy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-display text-xl tracking-wider text-black transition hover:bg-emerald-400">
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? 'COPIED!' : 'COPY SHARE GRID'}
              </button>
              <button onClick={onNewRun} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-300 to-amber-500 px-4 py-3 font-display text-xl tracking-wider text-black transition hover:scale-[1.02]">
                <RotateCcw className="h-5 w-5" /> DRAFT AGAIN
              </button>
            </div>
            {savedToVault ? (
              <button onClick={onOpenVault} className="flex items-center justify-center gap-2 rounded-xl border border-yellow-300/60 bg-yellow-300/10 px-4 py-2 text-sm font-black uppercase tracking-wider text-yellow-200 hover:bg-yellow-300/20">
                <Trophy className="h-4 w-4" /> Immortalised in the 38-0 Trophy Vault. View it.
              </button>
            ) : (
              <div className="text-center text-xs text-white/50">Win the league with 90+ points (S) or go unbeaten to enter the Trophy Vault.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

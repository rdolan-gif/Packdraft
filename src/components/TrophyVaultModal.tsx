import { useState } from 'react';
import { ArrowLeft, Check, Copy, Crown, Trash2, Trophy, X } from 'lucide-react';
import type { CareerStats, VaultEntry } from '../types/game';
import { FORMATIONS } from '../data/formations';
import { MANAGERS_BY_ID } from '../data/managers';
import { PLAYERS_BY_ID } from '../data/players';
import { ordinal } from '../engine/seasonSimulator';
import { sfx } from '../engine/soundEffects';
import { PlayerCardUI, TIER_EMOJI } from './PlayerCardUI';
import { GRADE_STYLE } from './SeasonReviewCard';

interface Props {
  vault: VaultEntry[];
  career: CareerStats;
  onClose: () => void;
  onDelete: (id: string) => void;
}

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
    cards.map((c) => TIER_EMOJI[c.tier]).join(''),
  ]
    .filter(Boolean)
    .join('\n');
}

export function TrophyVaultModal({ vault, career, onClose, onDelete }: Props) {
  const [open, setOpen] = useState<VaultEntry | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = async (e: VaultEntry) => {
    try {
      await navigator.clipboard.writeText(flexText(e));
      setCopied(true);
      sfx.select();
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      sfx.error();
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div className="relative my-4 w-full max-w-5xl animate-pop overflow-hidden rounded-3xl border-2 border-yellow-300/60 bg-gradient-to-b from-zinc-900 to-black" onClick={(e) => e.stopPropagation()}>
        <div className="relative overflow-hidden border-b border-yellow-300/30 bg-gradient-to-r from-amber-700/40 via-yellow-500/20 to-amber-700/40 px-5 py-4">
          <div className="holo opacity-20" />
          <div className="relative flex items-center gap-3">
            {open && (
              <button onClick={() => setOpen(null)} className="rounded-lg bg-black/40 p-2 text-white hover:bg-black/60" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <Trophy className="h-8 w-8 text-yellow-300" />
            <div>
              <div className="font-display text-3xl leading-none text-white">THE 38-0 TROPHY VAULT</div>
              <div className="text-xs font-bold uppercase tracking-widest text-yellow-200/80">Hall of Fame · S, S+ and unbeaten squads</div>
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
          <div className="p-4">
            {vault.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="text-6xl opacity-40">🏆</div>
                <div className="font-display text-2xl text-white/80">THE CABINET IS EMPTY… FOR NOW</div>
                <div className="max-w-md text-sm text-white/50">Win the league with 90+ points (grade S) or go a whole season unbeaten to immortalise your XI here. It is saved in this browser.</div>
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
                      {e.invincible && <div className="holo opacity-25" />}
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
                      <div className="relative text-sm tracking-tight">{cards.map((c) => TIER_EMOJI[c.tier]).join('')}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {open && (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1.1fr_1fr]">
            <div className="pitch relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-2xl border-2 border-white/15">
              {FORMATIONS[open.formationId].slots.map((s) => {
                const ref = open.lineup.find((l) => l.slotId === s.id);
                const c = ref ? PLAYERS_BY_ID[ref.cardId] : undefined;
                return c ? (
                  <div key={s.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                    <PlayerCardUI card={c} size="xs" />
                  </div>
                ) : null;
              })}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-20 w-20 items-center justify-center rounded-full border-4 font-display text-5xl ${GRADE_STYLE[open.grade].stamp} ${GRADE_STYLE[open.grade].glow}`}>{open.grade}</div>
                <div>
                  <div className="font-display text-3xl leading-none text-white">{open.teamName}</div>
                  <div className="text-sm font-bold text-yellow-200">{open.invincible ? '👑 INVINCIBLES' : `${ordinal(open.record.pos)} · Champions`}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ['Record', `${open.record.w}-${open.record.d}-${open.record.l}`],
                  ['Points', open.record.pts],
                  ['GD', `${open.record.gf - open.record.ga >= 0 ? '+' : ''}${open.record.gf - open.record.ga}`],
                  ['Scored', open.record.gf],
                  ['Conceded', open.record.ga],
                  ['Rating', open.teamRating.toFixed(1)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/5 p-2">
                    <div className="text-[10px] font-black uppercase text-white/50">{k}</div>
                    <div className="font-display text-2xl text-white">{v}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-sm text-white/80">
                <div>
                  {MANAGERS_BY_ID[open.managerId].emoji} <b>{MANAGERS_BY_ID[open.managerId].name}</b> · {open.formationId}
                </div>
                {open.mvpName && <div>🏅 MVP: {open.mvpName}</div>}
                {open.topScorer && (
                  <div>
                    ⚽ Top scorer: {open.topScorer.name} ({open.topScorer.goals})
                  </div>
                )}
              </div>
              <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-3 font-sans text-xs text-white/80">{flexText(open)}</pre>
              <div className="flex gap-2">
                <button onClick={() => copy(open)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-300 px-4 py-2.5 font-display text-xl tracking-wider text-black hover:bg-yellow-200">
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? 'COPIED' : 'COPY FLEX CARD'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Remove this squad from the vault?')) {
                      onDelete(open.id);
                      setOpen(null);
                    }
                  }}
                  className="rounded-xl border border-rose-500/50 px-3 text-rose-300 hover:bg-rose-500/15"
                  aria-label="Delete from vault"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { Award, Lock, X } from 'lucide-react';
import { CATEGORY_INFO, readProgress, TROPHIES, unlockedTrophies, type Trophy, type TrophyCategory } from '../engine/achievements';

const ORDER: TrophyCategory[] = ['season', 'squad', 'managers', 'daily', 'duos', 'collection'];

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function TrophyCabinetModal({ onClose }: { onClose: () => void }) {
  const unlocked = useMemo(unlockedTrophies, []);
  const progress = useMemo(() => readProgress(), []);
  const got = TROPHIES.filter((t) => unlocked[t.id]).length;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/85 p-3 sm:p-6" onClick={onClose}>
      <div
        className="relative my-4 w-full max-w-5xl animate-pop overflow-hidden rounded-3xl border-2 border-amber-700/70 bg-gradient-to-b from-[#2a1a0e] to-[#120a05]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Trophy Cabinet"
      >
        <div className="relative flex items-center gap-3 border-b border-amber-500/30 bg-gradient-to-r from-amber-900/60 via-amber-700/30 to-amber-900/60 px-5 py-4">
          <Award className="h-8 w-8 text-amber-300" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-3xl leading-none text-white">TROPHY CABINET</div>
            <div className="text-xs font-bold text-amber-100/70">
              {got} / {TROPHIES.length} unlocked
            </div>
          </div>
          <div className="hidden h-2 w-40 overflow-hidden rounded-full bg-black/50 sm:block">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-200" style={{ width: `${(got / TROPHIES.length) * 100}%` }} />
          </div>
          <button onClick={onClose} className="rounded-lg bg-black/40 p-2 text-white hover:bg-black/60" aria-label="Close trophy cabinet">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-4 sm:p-6">
          {ORDER.map((cat) => {
            const list = TROPHIES.filter((t) => t.category === cat);
            const have = list.filter((t) => unlocked[t.id]).length;
            return (
              <section key={cat}>
                <div className="flex items-baseline justify-between gap-2 border-b border-amber-500/20 pb-1.5">
                  <div>
                    <h3 className="font-display text-2xl leading-none text-amber-100">{CATEGORY_INFO[cat].title}</h3>
                    <div className="text-xs text-white/50">{CATEGORY_INFO[cat].blurb}</div>
                  </div>
                  <div className="font-display text-lg text-amber-200/80">
                    {have}/{list.length}
                  </div>
                </div>
                {/* the shelf */}
                <div className={`mt-3 grid gap-2 ${cat === 'managers' ? 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-7' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
                  {list.map((t) => (
                    <TrophyTile key={t.id} t={t} when={unlocked[t.id]} prog={t.progress?.(progress)} compact={cat === 'managers'} />
                  ))}
                </div>
              </section>
            );
          })}
          <p className="text-center text-xs text-white/40">Trophies are saved in this browser.</p>
        </div>
      </div>
    </div>
  );
}

function TrophyTile({ t, when, prog, compact }: { t: Trophy; when?: string; prog?: [number, number]; compact?: boolean }) {
  const hidden = t.secret && !when;
  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border p-2.5 text-center transition ${
        when ? 'border-amber-300/60 bg-gradient-to-b from-amber-400/20 to-amber-900/20 shadow-[0_0_18px_rgba(251,191,36,.18)]' : 'border-white/10 bg-black/30'
      }`}
      title={hidden ? 'Secret trophy' : t.desc}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${when ? 'bg-gradient-to-b from-yellow-200 to-amber-500 shadow-lg' : 'bg-white/5 grayscale opacity-40'}`}>
        {hidden ? <Lock className="h-5 w-5 text-white/60" /> : t.emoji}
      </div>
      <div className={`mt-1.5 font-display leading-none ${compact ? 'text-sm' : 'text-lg'} ${when ? 'text-white' : 'text-white/60'}`}>{hidden ? '???' : t.title}</div>
      {!compact && <div className="mt-0.5 text-[11px] leading-snug text-white/55">{hidden ? 'Secret trophy. Keep playing.' : t.desc}</div>}
      {when ? (
        <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-200/80">{fmtDate(when)}</div>
      ) : (
        prog &&
        !hidden && (
          <div className="mt-1.5 w-full">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${Math.min(100, (prog[0] / Math.max(1, prog[1])) * 100)}%` }} />
            </div>
            <div className="mt-0.5 text-[10px] font-bold text-white/50">
              {prog[0]} / {prog[1]}
            </div>
          </div>
        )
      )}
    </div>
  );
}

/** Popup list of trophies just unlocked (used on the review card). */
export function NewTrophies({ list }: { list: Trophy[] }) {
  if (!list.length) return null;
  return (
    <div className="rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-500/20 via-yellow-300/10 to-amber-500/20 p-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-amber-200">
        {list.length === 1 ? 'Trophy unlocked' : `${list.length} trophies unlocked`}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {list.map((t) => (
          <div key={t.id} className="flex animate-pop items-center gap-2 rounded-xl bg-black/40 px-2.5 py-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-yellow-200 to-amber-500 text-lg">{t.emoji}</span>
            <span className="text-left">
              <span className="block font-display text-base leading-none text-white">{t.title}</span>
              <span className="block text-[10px] text-white/60">{t.desc}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

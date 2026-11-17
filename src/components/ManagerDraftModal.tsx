import { useState } from 'react';
import type { ManagerCard } from '../types/game';
import { sfx } from '../engine/soundEffects';
import { burstAt } from '../engine/fx';
import { Crest } from './Crest';

interface Props {
  offers: ManagerCard[];
  onPick: (m: ManagerCard) => void;
}

export function ManagerDraftModal({ offers, onPick }: Props) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [chosen, setChosen] = useState<number | null>(null);

  const reveal = (i: number, e?: React.MouseEvent) => {
    if (revealed.has(i)) return;
    sfx.unlock();
    sfx.flip();
    window.setTimeout(() => sfx.stinger('ELITE'), 250);
    if (e) burstAt(e.clientX, e.clientY, ['#ff6a2b', '#ffffff', '#ffa06e'], 25);
    setRevealed((s) => new Set(s).add(i));
  };

  const allRevealed = revealed.size === offers.length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-8">
      <div className="text-center">
        <div className="text-xs font-black uppercase tracking-[0.4em] text-flare-400">Step 1 · The Dugout</div>
        <h1 className="mt-1 font-display text-5xl italic leading-none text-white sm:text-6xl" style={{ fontWeight: 900 }}>PICK YOUR MYSTERY MANAGER</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
          Three tactical philosophies have been dealt face-down. Flip them, read their bonuses, and appoint one. Their buffs shape which players are worth chasing.
        </p>
      </div>

      <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-1 gap-5 lg:max-w-none lg:grid-cols-3">
        {offers.map((m, i) => {
          const isRev = revealed.has(i);
          return (
            <div key={m.id} className="animate-pop" style={{ perspective: 1200, animationDelay: `${i * 120}ms` }}>
              <div
                className="relative h-[460px] w-full transition-transform duration-700"
                style={{ transformStyle: 'preserve-3d', transform: isRev ? 'rotateY(0)' : 'rotateY(180deg)' }}
              >
                {/* front */}
                <div
                  className="card-base card-cut absolute inset-0 flex flex-col overflow-hidden border-2 border-ink-600 bg-ink-800 p-5"
                  style={{ backfaceVisibility: 'hidden', ['--cut' as string]: '30px', boxShadow: chosen === i ? 'inset 0 0 0 4px #ff8248, inset 0 0 30px 4px rgba(255,106,43,.45)' : undefined }}
                >
                  {/* the manager's colours, as a stripe and a soft diagonal band */}
                  <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${m.gradient}`} />
                  <div className={`card-band bg-gradient-to-b opacity-20 ${m.gradient}`} />
                  <div className="card-notch" style={{ background: '#ff6a2b', ['--cut' as string]: '30px' }} />
                  <div className="relative flex items-start gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-flare-500 bg-ink-900 text-4xl" style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
                      {m.emoji}
                    </div>
                    <div className="min-w-0 pt-1">
                      <div className="font-display text-xs tracking-[0.25em] text-white/55">{m.inspiredBy}</div>
                      <h2 className="mt-1 font-display text-3xl italic leading-[0.95] text-white" style={{ fontWeight: 900 }}>
                        {m.name}
                      </h2>
                    </div>
                  </div>
                  <div className="relative mt-3 text-sm font-bold italic text-flare-300">“{m.tagline}”</div>
                  <p className="relative mt-2 text-sm leading-relaxed text-white/75">{m.description}</p>
                  <div className="relative mt-auto border-l-4 border-flare-500 bg-ink-900 p-3">
                    <div className="font-display text-sm tracking-[0.2em] text-flare-400">PASSIVE BUFF</div>
                    <div className="mt-1 text-sm font-semibold text-white">{m.bonusText}</div>
                    <div className="mt-2 text-[11px] text-white/55">Favoured shapes: {m.preferredFormations.join(' · ')}</div>
                  </div>
                  <button
                    onClick={() => {
                      sfx.select();
                      setChosen(i);
                      window.setTimeout(() => onPick(m), 350);
                    }}
                    className="btn-cut relative mt-3 bg-flare-500 px-4 py-2.5 font-display text-xl italic tracking-wider text-ink transition hover:bg-flare-400 active:scale-95"
                    style={{ fontWeight: 900 }}
                  >
                    APPOINT {m.inspiredBy.split('-')[0].toUpperCase()}
                  </button>
                </div>
                {/* back */}
                <button
                  onClick={(e) => reveal(i, e)}
                  className="card-base card-cut absolute inset-0 flex flex-col items-center justify-center gap-3 transition hover:brightness-125"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    ['--cut' as string]: '30px',
                    background: 'repeating-linear-gradient(115deg, #151a26 0 14px, #0f131d 14px 28px)',
                    boxShadow: 'inset 0 0 0 3px #ff6a2b',
                  }}
                  aria-label="Reveal manager card"
                >
                  <div className="card-notch" style={{ background: '#ff6a2b', ['--cut' as string]: '30px' }} />
                  <Crest size={96} />
                  <div className="font-display text-3xl italic text-white" style={{ fontWeight: 900 }}>
                    MYSTERY MANAGER
                  </div>
                  <div className="font-display text-sm tracking-[0.3em] text-flare-400">TAP TO FLIP</div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!allRevealed && (
        <button
          onClick={() => offers.forEach((_, i) => window.setTimeout(() => reveal(i), i * 260))}
          className="mt-6 text-xs font-bold uppercase tracking-widest text-white/50 underline-offset-4 hover:text-white hover:underline"
        >
          Flip all three
        </button>
      )}
    </div>
  );
}

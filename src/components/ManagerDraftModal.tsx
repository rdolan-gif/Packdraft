import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { ManagerCard } from '../types/game';
import { sfx } from '../engine/soundEffects';
import { burstAt } from '../engine/fx';

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
    window.setTimeout(() => sfx.stinger('CULT_VETERAN'), 250);
    if (e) burstAt(e.clientX, e.clientY, ['#facc15', '#ffffff', '#34d399'], 25);
    setRevealed((s) => new Set(s).add(i));
  };

  const allRevealed = revealed.size === offers.length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-8">
      <div className="text-center">
        <div className="text-xs font-black uppercase tracking-[0.4em] text-emerald-400">Step 1 · The Dugout</div>
        <h1 className="mt-1 font-display text-5xl leading-none text-white sm:text-6xl">PICK YOUR MYSTERY MANAGER</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
          Three tactical philosophies have been dealt face-down. Flip them, read their bonuses, and appoint one. Their buffs shape which players are worth chasing.
        </p>
      </div>

      <div className="mt-8 grid w-full grid-cols-1 gap-5 md:grid-cols-3">
        {offers.map((m, i) => {
          const isRev = revealed.has(i);
          return (
            <div key={m.id} className="animate-pop" style={{ perspective: 1200, animationDelay: `${i * 120}ms` }}>
              <div
                className="relative h-[430px] w-full transition-transform duration-700"
                style={{ transformStyle: 'preserve-3d', transform: isRev ? 'rotateY(0)' : 'rotateY(180deg)' }}
              >
                {/* front */}
                <div
                  className={`card-base sweep absolute inset-0 flex flex-col overflow-hidden border-2 bg-gradient-to-br ${m.gradient} p-5 ${
                    chosen === i ? 'border-yellow-300 ring-4 ring-yellow-300/50' : 'border-white/20'
                  }`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="absolute -right-8 -top-8 text-[140px] leading-none opacity-15">{m.emoji}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">{m.inspiredBy}</div>
                  <div className="mt-1 text-5xl">{m.emoji}</div>
                  <h2 className="mt-2 font-display text-3xl leading-none text-white text-shadow">{m.name}</h2>
                  <div className="mt-1 text-sm font-bold italic text-yellow-200">“{m.tagline}”</div>
                  <p className="mt-3 text-sm text-white/85">{m.description}</p>
                  <div className="mt-auto rounded-xl border border-white/20 bg-black/40 p-3 backdrop-blur">
                    <div className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Passive Buff</div>
                    <div className="mt-1 text-sm font-semibold text-white">{m.bonusText}</div>
                    <div className="mt-2 text-[11px] text-white/60">Favoured shapes: {m.preferredFormations.join(' · ')}</div>
                  </div>
                  <button
                    onClick={() => {
                      sfx.select();
                      setChosen(i);
                      window.setTimeout(() => onPick(m), 350);
                    }}
                    className="mt-3 rounded-xl bg-white px-4 py-2.5 font-display text-xl tracking-wider text-black transition hover:scale-[1.03] hover:bg-yellow-300 active:scale-95"
                  >
                    APPOINT {m.inspiredBy.split('-')[0].toUpperCase()}
                  </button>
                </div>
                {/* back */}
                <button
                  onClick={(e) => reveal(i, e)}
                  className="card-base absolute inset-0 flex flex-col items-center justify-center border-2 border-emerald-500/40 transition hover:border-yellow-300"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: 'repeating-linear-gradient(-45deg, #052e16 0 12px, #064e3b 12px 24px)',
                  }}
                  aria-label="Reveal manager card"
                >
                  <HelpCircle className="h-20 w-20 text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,.6)]" />
                  <div className="mt-3 font-display text-3xl tracking-wider text-white">MYSTERY MANAGER</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-widest text-emerald-300">Tap to flip</div>
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

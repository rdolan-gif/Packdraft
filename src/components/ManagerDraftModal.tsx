import { useState } from 'react';
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
    window.setTimeout(() => sfx.stinger('ELITE'), 250);
    if (e) burstAt(e.clientX, e.clientY, ['#ff6a2b', '#ffffff', '#ffa06e'], 25);
    setRevealed((s) => new Set(s).add(i));
  };

  const allRevealed = revealed.size === offers.length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-8">
      <div className="text-center">
        <div className="inline-block -rotate-2 border-[3px] border-ink bg-album-red px-3 pb-0.5 pt-1.5 font-chunky text-sm text-white shadow-[3px_3px_0_#0b0e24]">STEP 1 · THE DUGOUT</div>
        <h1 className="comic-title mt-3 font-display text-5xl leading-none sm:text-7xl">PICK YOUR MYSTERY MANAGER!</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-album-cream/85">
          Three tactical philosophies have been dealt face-down. Flip them, read their bonuses, and appoint one. Their buffs shape which players are worth chasing.
        </p>
      </div>

      <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-1 gap-5 lg:max-w-none lg:grid-cols-3">
        {offers.map((m, i) => {
          const isRev = revealed.has(i);
          return (
            <div key={m.id} className="animate-pop" style={{ perspective: 1200, animationDelay: `${i * 120}ms` }}>
              <div
                className="relative h-[540px] w-full transition-transform duration-700"
                style={{ transformStyle: 'preserve-3d', transform: isRev ? 'rotateY(0)' : 'rotateY(180deg)' }}
              >
                {/* front */}
                <div
                  className="absolute inset-0 flex flex-col overflow-hidden rounded-[18px] border-[4px] border-ink bg-album-cream p-5 text-ink"
                  style={{ backfaceVisibility: 'hidden', boxShadow: chosen === i ? '0 0 0 5px #ffd400, 8px 8px 0 5px #0b0e24' : '8px 8px 0 #0b0e24' }}
                >
                  {/* halftone dots, and a sunburst in the manager's colours behind the emblem */}
                  <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(rgba(20,24,58,.12) 1.5px, transparent 1.8px) 0 0/11px 11px' }} />
                  <div className={`absolute inset-x-0 top-0 h-[92px] border-b-[4px] border-ink bg-gradient-to-r ${m.gradient}`} />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[92px]" style={{ background: 'repeating-conic-gradient(from 0deg at 20% 60%, rgba(255,255,255,.14) 0 8deg, transparent 8deg 16deg)' }} />
                  <div className="relative flex items-end gap-3">
                    <div className="burst-clip flex h-[76px] w-[76px] shrink-0 items-center justify-center bg-flare-500 text-4xl" style={{ filter: 'drop-shadow(3px 3px 0 #14183a)' }}>
                      {m.emoji}
                    </div>
                    <div className="min-w-0 pb-1">
                      <div className="font-chunky text-xs text-white" style={{ textShadow: '1px 1px 0 #14183a' }}>{m.inspiredBy.toUpperCase()}</div>
                    </div>
                  </div>
                  <h2 className="relative mt-4 font-display text-[34px] leading-[0.95] text-ink">{m.name}</h2>
                  <div className="relative mt-2 inline-block self-start rounded-[10px] border-[3px] border-ink bg-white px-2.5 py-1 text-sm font-bold italic">“{m.tagline}”</div>
                  <p className="relative mt-2 text-sm font-medium leading-relaxed text-ink/80">{m.description}</p>
                  <div className="relative mt-auto rounded-xl border-[3px] border-ink bg-white p-3 shadow-[4px_4px_0_#14183a]">
                    <div className="font-chunky text-sm text-album-red">PASSIVE BUFF</div>
                    <div className="mt-1 text-sm font-bold">{m.bonusText}</div>
                    <div className="mt-2 text-[11px] font-semibold text-ink/60">Favoured shapes: {m.preferredFormations.join(' · ')}</div>
                  </div>
                  <button
                    onClick={() => {
                      sfx.select();
                      setChosen(i);
                      window.setTimeout(() => onPick(m), 350);
                    }}
                    className="btn-cut relative mt-4 bg-flare-500 px-4 py-2.5 text-xl text-ink transition hover:bg-flare-400"
                  >
                    APPOINT {m.inspiredBy.split('-')[0].toUpperCase()}
                  </button>
                </div>
                {/* back */}
                <button
                  onClick={(e) => reveal(i, e)}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[18px] border-[4px] border-ink transition hover:-translate-y-1"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: 'radial-gradient(rgba(20,24,58,.22) 1.6px, transparent 1.8px) 0 0/11px 11px, repeating-conic-gradient(from 0deg at 50% 42%, #e62e2d 0 9deg, #d12726 9deg 18deg)',
                    boxShadow: '8px 8px 0 #0b0e24',
                  }}
                  aria-label="Reveal manager card"
                >
                  <div className="burst-clip flex h-[130px] w-[130px] items-center justify-center bg-flare-500 font-display text-7xl text-ink" style={{ filter: 'drop-shadow(5px 5px 0 #14183a)' }}>
                    ?
                  </div>
                  <div className="comic-title font-display text-4xl">MYSTERY MANAGER</div>
                  <div className="rounded-md border-[3px] border-ink bg-album-cream px-3 pb-0.5 pt-1.5 font-chunky text-sm text-ink">TAP TO FLIP!</div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!allRevealed && (
        <button
          onClick={() => offers.forEach((_, i) => window.setTimeout(() => reveal(i), i * 260))}
          className="btn-cut mt-8 bg-album-cream px-5 py-2 text-lg text-ink"
        >
          Flip all three
        </button>
      )}
    </div>
  );
}

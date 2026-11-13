import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { RefreshCw, Scissors, Sparkles } from 'lucide-react';
import type { PlayerCard, Tier } from '../types/game';
import { highestTier, TIER_RANK, TOTAL_PACKS, tierRates } from '../engine/packGenerator';
import { sfx } from '../engine/soundEffects';
import { burstAt, goldConfetti, shakeScreen } from '../engine/fx';
import { CardBack, PlayerCardUI, TIER_TEXT } from './PlayerCardUI';

type Stage = 'sealed' | 'dimming' | 'tell' | 'fanned' | 'revealed';

interface Props {
  packNumber: number;
  cards: PlayerCard[];
  packKey: number; // changes whenever a fresh pack is dealt (incl. reroll)
  selectedId: string | null;
  onSelect: (card: PlayerCard) => void;
  rerollAvailable: boolean;
  onReroll: () => void;
  onRevealed?: () => void;
}

const FLASH: Record<Tier, { color: string; max: number }> = {
  STANDARD: { color: '#ffffff', max: 0.7 },
  CULT_VETERAN: { color: '#2563eb', max: 0.85 },
  RISING_WORLD: { color: 'radial-gradient(circle, #fde68a 0%, #a855f7 45%, #4c1d95 100%)', max: 0.9 },
  PRIME_ICON: { color: 'radial-gradient(circle, #ffffff 0%, #fde047 30%, #f59e0b 60%, #7c2d12 100%)', max: 1 },
};

export function PackOpener({ packNumber, cards, packKey, selectedId, onSelect, rerollAvailable, onReroll, onRevealed }: Props) {
  const [stage, setStage] = useState<Stage>('sealed');
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [tearProgress, setTearProgress] = useState(0);
  const [flash, setFlash] = useState<{ key: number; tier: Tier } | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 30 });
  const dragging = useRef(false);
  // The strip rect is measured once at pointer-down so the pack can't shift the target mid-drag.
  const stripRect = useRef<DOMRect | null>(null);
  const tearRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastTick = useRef(0);
  const timers = useRef<number[]>([]);
  const packRef = useRef<HTMLDivElement>(null);
  const top = useMemo(() => highestTier(cards), [cards]);
  const finale = packNumber >= TOTAL_PACKS;

  // Reset whenever a new pack arrives.
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStage('sealed');
    setFlipped(new Set());
    setTearProgress(0);
    tearRef.current = 0;
    primeShown.current = false;
    setFlash(null);
  }, [packKey]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const primeShown = useRef(false);
  const revealPrime = (idx: number) => {
    if (primeShown.current) return;
    primeShown.current = true;
    sfx.roar();
    setFlipped((s) => new Set(s).add(idx));
    shakeScreen('heavy');
    goldConfetti(1.3);
  };

  // Flip order: weakest first, best card last. Prime icons hold back for a dramatic beat.
  const flipOrder = useMemo(() => cards.map((c, i) => ({ c, i })).sort((a, b) => a.c.ovr - b.c.ovr).map((x) => x.i), [cards]);

  const startReveal = (baseDelay: number) => {
    const primeIdx = top === 'PRIME_ICON' ? flipOrder[flipOrder.length - 1] : -1;
    let t = baseDelay;
    flipOrder.forEach((idx) => {
      if (idx === primeIdx) return;
      later(t, () => {
        sfx.flip();
        setFlipped((s) => new Set(s).add(idx));
      });
      t += 280;
    });
    if (primeIdx >= 0) {
      t += 900;
      later(t, () => revealPrime(primeIdx));
      t += 300;
    }
    later(t + 150, () => {
      setStage('revealed');
      onRevealed?.();
    });
  };

  const rip = () => {
    if (stage !== 'sealed') return;
    sfx.unlock();
    sfx.rip();
    const rect = packRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + 30 : window.innerHeight / 3;
    burstAt(cx, cy, ['#e5e7eb', '#a7f3d0', '#ffffff'], 30);
    setTearProgress(1);

    if (top === 'PRIME_ICON') {
      // THE WALKOUT FLARE
      setStage('dimming');
      sfx.heartbeat();
      later(350, () => {
        setStage('tell');
        setFlash({ key: Date.now(), tier: top });
        later(1700, () => setFlash(null));
        sfx.stinger(top);
        shakeScreen('heavy');
        goldConfetti(1);
        burstAt(cx, cy + 120, ['#facc15', '#f472b6', '#22d3ee', '#a855f7', '#ffffff'], 120);
      });
      later(350 + 1400, () => {
        setStage('fanned');
        sfx.slide();
        startReveal(500);
      });
      return;
    }

    setStage('tell');
    setFlash({ key: Date.now(), tier: top });
    later(1400, () => setFlash(null));
    sfx.stinger(top);
    if (top === 'RISING_WORLD') {
      shakeScreen('micro');
      burstAt(cx, cy + 100, ['#a855f7', '#facc15', '#ffffff'], 70);
    } else if (top === 'CULT_VETERAN') {
      burstAt(cx, cy + 100, ['#93c5fd', '#e5e7eb', '#3b82f6'], 45);
    }
    later(1400, () => {
      setStage('fanned');
      sfx.slide();
      startReveal(450);
    });
  };

  // ── drag-to-tear

  const progressAt = (clientX: number) => {
    const r = stripRect.current;
    if (!r) return 0;
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };

  const onStripDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (stage !== 'sealed') return;
    e.preventDefault();
    dragging.current = true;
    setIsDragging(true);
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 30 }); // hold the pack still while tearing
    e.currentTarget.setPointerCapture?.(e.pointerId);
    stripRect.current = e.currentTarget.getBoundingClientRect();
    sfx.unlock();
    sfx.tearTick();
  };
  const onStripMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!dragging.current || stage !== 'sealed') return;
    const p = progressAt(e.clientX);
    if (p <= tearRef.current) return;
    tearRef.current = p;
    setTearProgress(p);
    const now = performance.now();
    if (now - lastTick.current > 45) {
      sfx.tearTick();
      lastTick.current = now;
    }
    if (p > 0.8) {
      dragging.current = false;
      setIsDragging(false);
      rip();
    }
  };
  const onStripUp = () => {
    dragging.current = false;
    setIsDragging(false);
  };

  const onPackMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (dragging.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    // No tilt while the pointer is over the tear zone, so the strip stays put.
    if (py < 0.22) {
      setTilt({ rx: 0, ry: 0, gx: px * 100, gy: py * 100 });
      return;
    }
    setTilt({ ry: (px - 0.5) * 14, rx: (0.5 - py) * 10, gx: px * 100, gy: py * 100 });
  };

  const rates = tierRates(packNumber);
  const showCards = stage === 'fanned' || stage === 'revealed';

  return (
    <div className="relative flex min-h-[420px] w-full flex-col items-center">
      {/* Fullscreen tells */}
      {stage === 'dimming' && <div className="pointer-events-none fixed inset-0 z-[80] bg-black/95 transition-opacity" />}
      {flash && (
        <div key={flash.key} className="pointer-events-none fixed inset-0 z-[81]">
          <div
            className="absolute inset-0 animate-flash"
            style={{ background: FLASH[flash.tier].color, ['--flash-max' as string]: FLASH[flash.tier].max, animationDuration: flash.tier === 'PRIME_ICON' ? '1.6s' : flash.tier === 'STANDARD' ? '0.6s' : '1.1s' }}
          />
          {(flash.tier === 'RISING_WORLD' || flash.tier === 'PRIME_ICON') && (
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: flash.tier === 'PRIME_ICON' ? 18 : 10 }).map((_, i) => (
                <div
                  key={i}
                  className="light-beam animate-flash"
                  style={{
                    transform: `rotate(${(360 / (flash.tier === 'PRIME_ICON' ? 18 : 10)) * i}deg)`,
                    background:
                      flash.tier === 'PRIME_ICON'
                        ? `linear-gradient(180deg, hsla(${(i * 40) % 360},100%,75%,.95), transparent)`
                        : 'linear-gradient(180deg, rgba(216,180,254,.95), rgba(250,204,21,0))',
                    animationDuration: '1.4s',
                    width: flash.tier === 'PRIME_ICON' ? 10 : 6,
                  }}
                />
              ))}
            </div>
          )}
          {flash.tier === 'RISING_WORLD' && (
            <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-violet-300" style={{ animation: 'shock 1s ease-out forwards' }} />
          )}
          {flash.tier === 'PRIME_ICON' && (
            <>
              <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-[10px] border-yellow-200" style={{ animation: 'shock 1.2s ease-out forwards' }} />
              <div className="absolute left-0 right-0 top-[45%] h-3 animate-flash bg-gradient-to-r from-transparent via-white to-transparent blur-sm" style={{ animationDuration: '1.6s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pop font-display text-6xl text-yellow-200 drop-shadow-[0_0_25px_rgba(250,204,21,1)] sm:text-8xl">WALKOUT!</div>
              </div>
            </>
          )}
          {flash.tier === 'CULT_VETERAN' && (
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="particle animate-rise"
                  style={{ left: `${30 + ((i * 41) % 40)}%`, bottom: `${30 + ((i * 17) % 20)}%`, width: 4, height: 4, background: i % 2 ? '#bfdbfe' : '#e5e7eb', boxShadow: '0 0 8px #60a5fa', animationDelay: `${(i % 6) * 0.08}s` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* header */}
      <div className="mb-3 flex w-full items-center justify-between gap-2">
        <div>
          <div className="font-display text-3xl leading-none text-white sm:text-4xl">
            PACK {packNumber} <span className="text-emerald-400">/ {TOTAL_PACKS}</span>
          </div>
          {finale ? (
            <div className="text-xs font-black uppercase tracking-widest text-yellow-300">★ Captain's Finale · guaranteed 86+ · double Prime odds</div>
          ) : packNumber >= 9 ? (
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-300">Anti-softlock: 2+ cards fit your empty slots</div>
          ) : packNumber >= 6 ? (
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-300/80">Pity boost: empty positions ×2.5 more likely</div>
          ) : (
            <div className="text-xs font-bold uppercase tracking-widest text-white/50">5 cards · draft 1</div>
          )}
        </div>
        <div className="hidden text-right text-[10px] leading-tight text-white/60 sm:block">
          <div className={TIER_TEXT.PRIME_ICON}>Prime {rates.PRIME_ICON}%</div>
          <div className={TIER_TEXT.RISING_WORLD}>World Class {rates.RISING_WORLD}%</div>
          <div className={TIER_TEXT.CULT_VETERAN}>Cult {rates.CULT_VETERAN}%</div>
          <div className={TIER_TEXT.STANDARD}>Squad {rates.STANDARD}%</div>
        </div>
      </div>

      {!showCards && (
        <div className={`relative flex flex-1 flex-col items-center justify-center ${stage === 'tell' && top === 'CULT_VETERAN' ? 'animate-pop' : ''}`}>
          {/* The foil pack */}
          <div
            ref={packRef}
            onPointerMove={onPackMove}
            onPointerLeave={() => setTilt({ rx: 0, ry: 0, gx: 50, gy: 30 })}
            className="relative h-[300px] w-[210px] transition-transform duration-100 sm:h-[340px] sm:w-[236px]"
            style={{ transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transformStyle: 'preserve-3d' }}
          >
            {/* top flap (tears away) */}
            <div
              className="foil absolute inset-x-0 top-0 h-[44px] rounded-t-2xl border-2 border-b-0 border-emerald-300/40 transition-all duration-500"
              style={{
                transform: stage !== 'sealed' ? 'translate(60px,-80px) rotate(28deg)' : 'none',
                opacity: stage !== 'sealed' ? 0 : 1,
                clipPath: `polygon(0 0, 100% 0, 100% 100%, ${tearProgress * 100}% 100%, ${tearProgress * 100}% 70%, 0 70%)`,
              }}
            />
            {/* body */}
            <div className={`foil absolute inset-x-0 bottom-0 top-[40px] overflow-hidden rounded-b-2xl border-2 border-t-0 border-emerald-300/40 shadow-2xl shadow-emerald-900/60 ${stage === 'tell' ? 'brightness-150' : ''}`}>
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,.55), transparent 40%)`, mixBlendMode: 'overlay' }} />
              <div className="relative flex h-full flex-col items-center justify-center gap-2 text-center">
                <div className="font-display text-7xl leading-none text-yellow-300 drop-shadow-[0_4px_0_rgba(0,0,0,.4)]">38</div>
                <div className="font-display text-2xl tracking-[0.25em] text-white">PACKDRAFT</div>
                <div className="rounded-full bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                  {finale ? "Captain's Finale" : `Matchday Pack #${packNumber}`}
                </div>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="h-2 w-6 rounded-full bg-white/25" />
                  ))}
                </div>
              </div>
              {stage === 'tell' && (
                <div
                  className="absolute inset-x-0 top-0 h-2"
                  style={{ background: top === 'PRIME_ICON' ? '#fde047' : top === 'RISING_WORLD' ? '#c4b5fd' : top === 'CULT_VETERAN' ? '#60a5fa' : '#fff', boxShadow: '0 0 40px 18px currentColor' }}
                />
              )}
            </div>
            {/* tear strip: tall invisible hit zone with a visible perforation line and a grab handle */}
            <div
              onPointerDown={onStripDown}
              onPointerMove={onStripMove}
              onPointerUp={onStripUp}
              onPointerCancel={onStripUp}
              onLostPointerCapture={onStripUp}
              className={`absolute -left-4 -right-4 top-[14px] z-20 h-[56px] touch-none select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              title="Drag the handle across to tear"
              aria-label="Tear strip: drag from left to right to open the pack"
            >
              <div className="perforation absolute left-4 right-4 top-1/2 h-[14px] -translate-y-1/2 rounded-full bg-black/25">
                <div className="h-full rounded-full bg-gradient-to-r from-yellow-200 via-white to-yellow-200 shadow-[0_0_14px_rgba(255,255,255,.9)]" style={{ width: `${tearProgress * 100}%` }} />
              </div>
              {stage === 'sealed' && tearProgress < 0.05 && !isDragging && (
                <div className="pointer-events-none absolute left-16 right-6 top-1/2 flex -translate-y-1/2 items-center justify-center gap-1 text-[11px] font-black uppercase tracking-widest text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.9)]">
                  Slide to tear
                  <span className="flex">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                        ›
                      </span>
                    ))}
                  </span>
                </div>
              )}
              {stage === 'sealed' && (
                <div
                  className={`pointer-events-none absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-yellow-200 to-amber-500 text-black shadow-[0_0_18px_rgba(250,204,21,.9)] ${tearProgress === 0 && !isDragging ? 'animate-pulse' : ''}`}
                  style={{ left: `calc(16px + (100% - 32px) * ${tearProgress})` }}
                >
                  <Scissors className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>
          {stage === 'sealed' && (
            <div className="mt-5 flex flex-col items-center gap-2">
              <div className="text-xs font-semibold text-white/60">Grab the ✂ handle and slide it right, or</div>
              <button
                onClick={rip}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 px-8 py-3 font-display text-2xl tracking-wider text-black shadow-lg shadow-amber-500/30 transition hover:scale-105 active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" /> RIP OPEN PACK
                </span>
                <span className="absolute inset-0 -translate-x-full bg-white/50 transition group-hover:translate-x-full" style={{ transitionDuration: '700ms' }} />
              </button>
            </div>
          )}
        </div>
      )}

      {showCards && (
        <div className="flex w-full flex-1 flex-col items-center">
          <div className="flex w-full flex-wrap items-start justify-center gap-2 sm:gap-3">
            {cards.map((card, i) => {
              const isFlipped = flipped.has(i);
              const isPrimeHold = card.tier === 'PRIME_ICON' && !isFlipped && TIER_RANK[top] === 3;
              return (
                <div
                  key={card.id}
                  className="animate-pop"
                  style={{ animationDelay: `${i * 70}ms`, perspective: 1000 }}
                  onClick={() => {
                    if (isFlipped || stage !== 'fanned') return;
                    if (isPrimeHold) return revealPrime(i);
                    sfx.flip();
                    setFlipped((s) => new Set(s).add(i));
                  }}
                >
                  <div
                    className="relative transition-transform duration-700"
                    style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
                  >
                    <div style={{ backfaceVisibility: 'hidden', pointerEvents: isFlipped ? 'auto' : 'none' }}>
                      <PlayerCardUI
                        card={card}
                        size="md"
                        showStats
                        selected={selectedId === card.id}
                        dimmed={!!selectedId && selectedId !== card.id}
                        // Pickable as soon as it is face-up; no need to wait for the rest of the pack.
                        onClick={
                          isFlipped
                            ? () => {
                                sfx.select();
                                onSelect(card);
                              }
                            : undefined
                        }
                      />
                    </div>
                    <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', pointerEvents: isFlipped ? 'none' : 'auto' }}>
                      <CardBack size="md" glow={isPrimeHold} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {stage === 'revealed' && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <span className="text-sm font-semibold text-white/70">{selectedId ? 'Now tap a slot on the pitch (or Auto-Place).' : 'Tap a card to draft it.'}</span>
              {rerollAvailable && (
                <button
                  onClick={() => {
                    sfx.click();
                    onReroll();
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-400/50 bg-sky-500/15 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-sky-200 transition hover:bg-sky-500/30"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Scout Reroll (1 left)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

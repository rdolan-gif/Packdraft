import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { RefreshCw, Scissors } from 'lucide-react';
import type { PlayerCard, Tier } from '../types/game';
import { eraColour } from '../data/eraColours';
import { Flag } from './Flag';
import { ClubIcon } from './ClubIcon';
import { highestTier, TOTAL_PACKS, tierRates } from '../engine/packGenerator';
import { sfx } from '../engine/soundEffects';
import { burstAt, goldConfetti, rainbowConfetti, shakeScreen } from '../engine/fx';
import { Crest } from './Crest';
import { CardBack, PlayerCardUI } from './PlayerCardUI';
import { ComicTell } from './ComicTell';

/** Comic-book rarity tells (flat, outlined, a sound-effect word) instead of the old glowing flashes. */
export const COMIC_FX = true;

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
  /** Override the heading (e.g. the January transfer pack). */
  title?: string;
  subtitle?: string;
  /** Text on the foil pack's label. */
  packLabel?: string;
  /** Wrapper design: Matchday (default), Final Whistle (last pack), Daily Draft, January Window. */
  wrapper?: 'daily';
  /** Called when the pack is ripped (its cards go into the sticker book). */
  onRip?: () => void;
  /** Cards never pulled before get a NEW STICKER ribbon. */
  newIds?: Set<string>;
}

const FLASH: Record<Tier, { color: string; max: number }> = {
  STANDARD: { color: '#ffffff', max: 0.7 },
  ELITE: { color: '', max: 0.85 }, // coloured by the best card's era label (see flashColour)
  RISING_WORLD: { color: 'radial-gradient(circle, #fffbeb 0%, #facc15 35%, #b45309 70%, #451a03 100%)', max: 0.9 },
  PRIME_ICON: { color: 'radial-gradient(circle, #ffffff 0%, #ffffff 30%, #e0f2fe 55%, #94a3b8 100%)', max: 1 },
  SECRET_DEV: { color: 'radial-gradient(circle, #ffffff 0%, rgba(255,255,255,.85) 14%, rgba(0,0,0,0) 42%), conic-gradient(from 0deg, #f472b6, #fbbf24, #22d3ee, #a78bfa, #f472b6)', max: 1 },
};
/** Prime and the secret dev cards both get the full walkout. */
const walkoutTier = (t: Tier) => t === 'PRIME_ICON' || t === 'SECRET_DEV';
const RAINBOW = ['#f472b6', '#fbbf24', '#22d3ee', '#a78bfa', '#ffffff'];

/** Flash fill: Elite pulls glow in the best card's era-label colour. */
const FW_GAP = 600; // between the comic bursts
const FW_TOTAL = 2 * FW_GAP + 1300; // last burst lands, then a beat to read them
// Crimped ends of the Prime Icon pack: the same pearl holo as the packet.
const PEARL_CRIMP =
  'repeating-linear-gradient(90deg, rgba(20,24,58,.22) 0 3px, transparent 3px 7px), linear-gradient(115deg, #ffd6e8, #d4f1ff 25%, #fff8d1 45%, #e1d7ff 65%, #c9fff0 85%, #ffd9c2)';
const TILE_Y = 0.15; // tiles sit this far down the screen

function flashColour(tier: Tier, best: PlayerCard | undefined) {
  if (tier !== 'ELITE' || !best) return FLASH[tier].color;
  const e = eraColour(best.era);
  return `radial-gradient(circle, ${e.border} 0%, ${e.mid} 45%, ${e.dark} 100%)`;
}

/** Gold explosion with a ring of the card's era-label colour inside it. */
function goldFlash(accent: string) {
  return `radial-gradient(circle, #fffbeb 0%, #facc15 28%, ${accent} 44%, #facc15 54%, #b45309 75%, #451a03 100%)`;
}

function raysFor(tier: Tier, accent?: string) {
  const prime = walkoutTier(tier);
  const n = prime ? 18 : 10;
  const step = 360 / n;
  const stops: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * step;
    const c = prime ? `hsla(${(i * 40) % 360},100%,75%,.85)` : i % 2 ? 'rgba(250,204,21,.85)' : accent ?? 'rgba(255,247,194,.85)';
    stops.push(`transparent ${a}deg`, `${c} ${a + 1}deg`, `${c} ${a + 2.2}deg`, `transparent ${a + 3.4}deg`);
  }
  return `conic-gradient(from 0deg at 50% 50%, ${stops.join(', ')}, transparent 360deg)`;
}

export function PackOpener({ packNumber, cards, packKey, selectedId, onSelect, rerollAvailable, onReroll, onRevealed, title, subtitle, packLabel, onRip, newIds, wrapper }: Props) {
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
  // The card the reveal is built around: a secret dev card beats everything, then the highest OVR.
  const best = useMemo(() => [...cards].sort((a, b) => Number(b.tier === 'SECRET_DEV') - Number(a.tier === 'SECRET_DEV') || b.ovr - a.ovr)[0], [cards]);
  const secret = top === 'SECRET_DEV';
  const bestEra = best ? eraColour(best.era) : eraColour('SQUAD');
  // 86+ pulls: three fireworks, left to right, each bursting into a tile (position, club icon, flag).
  const [tiles, setTiles] = useState(0);
  const fireworksFor = !!best && (best.ovr >= 86 || best.tier === 'SECRET_DEV');
  const launchFireworks = (start: number) => {
    const xs = [0.2, 0.5, 0.8];
    const colors = best!.tier === 'SECRET_DEV' ? RAINBOW : best!.tier === 'PRIME_ICON' ? ['#ffffff', '#e0f2fe', '#f9a8d4', '#fde68a'] : ['#facc15', '#fde68a', bestEra.mid, bestEra.light];
    xs.forEach((x, i) => {
      // Each one explodes onto the screen like a comic-book POW!, no rocket.
      later(start + i * FW_GAP, () => {
        setTiles(i + 1);
        sfx.fireworkPop();
        shakeScreen('micro');
        if (!COMIC_FX) burstAt(window.innerWidth * x, window.innerHeight * TILE_Y, colors, 30);
      });
    });
  };
  const finale = packNumber >= TOTAL_PACKS;
  // The cards are dealt before the pack is shown, so a Prime Icon or secret rare pack comes in the
  // walkout wrapper from the start: pearl holo, shaking, "Something's shaking...".
  const flareShake = walkoutTier(top) && stage === 'sealed';
  const flarePack = walkoutTier(top);
  // The wrapper: Matchday red, Final Whistle gold, Daily Draft blue, January Window navy.
  const look = finale
    ? { foil: 'foil-finale', crest: 'ink' as const, name: ['FINAL', 'WHISTLE'], title: '#fff6e0', small: '#14183a', chipBg: '#e62e2d', chipText: '#fff' }
    : wrapper === 'daily'
      ? { foil: 'foil-daily', crest: 'full' as const, name: ['DAILY', 'DRAFT'], title: '#ffd400', small: '#fff6e0', chipBg: '#14183a', chipText: '#fff6e0' }
      : packLabel
        ? { foil: 'foil-window', crest: 'full' as const, name: ['TRANSFER', 'WINDOW'], title: '#ffd400', small: '#fff6e0', chipBg: '#ffd400', chipText: '#14183a' }
        : { foil: '', crest: 'solid' as const, name: ['MATCHDAY'], title: '#ffffff', small: '#fff6e0', chipBg: '#14183a', chipText: '#ffd400' };

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
    setTiles(0);
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
    if (COMIC_FX) return;
    if (secret) rainbowConfetti();
    else goldConfetti(0.9);
  };

  // Flip order: weakest first, best card last. Prime icons hold back for a dramatic beat.
  const flipOrder = useMemo(() => cards.map((c, i) => ({ c, i })).sort((a, b) => a.c.ovr - b.c.ovr).map((x) => x.i), [cards]);

  // Only the single best card is held back for the walkout beat (a secret dev card always goes last).
  const heldIdx = walkoutTier(top) ? (secret ? cards.findIndex((c) => c.tier === 'SECRET_DEV') : flipOrder[flipOrder.length - 1]) : -1;

  const startReveal = (baseDelay: number) => {
    const primeIdx = heldIdx;
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
      // Safety net: every card ends face-up, whatever was clicked during the reveal.
      setFlipped(new Set(cards.map((_, i) => i)));
      setStage('revealed');
      onRevealed?.();
    });
  };

  const rip = () => {
    if (stage !== 'sealed') return;
    onRip?.();
    sfx.unlock();
    sfx.rip();
    const rect = packRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + 30 : window.innerHeight / 3;
    if (!COMIC_FX) burstAt(cx, cy, ['#e5e7eb', '#a7f3d0', '#ffffff'], 30);
    setTearProgress(1);

    if (walkoutTier(top)) {
      // THE WALKOUT FLARE (the pack was already wrapped in pearl holo, shaking, before the rip)
      walkout(cx, cy);
      return;
    }
    normalReveal(cx, cy);
  };

  const walkout = (cx: number, cy: number) => {
    {
      setStage('dimming');
      sfx.heartbeat();
      later(350, () => {
        setStage('tell');
        setFlash({ key: Date.now(), tier: top });
        later(1700, () => setFlash(null));
        sfx.stinger(top);
        shakeScreen('heavy');
        if (!COMIC_FX) {
          if (secret) rainbowConfetti();
          else goldConfetti(0.7);
        }
        if (!COMIC_FX) burstAt(cx, cy + 120, secret ? RAINBOW : ['#ffffff', '#e0f2fe', '#f472b6', '#22d3ee', '#fde68a'], 60);
      });
      // BOOM settles, then the three fireworks, then the cards fan out.
      launchFireworks(350 + 900);
      later(350 + 900 + FW_TOTAL, () => {
        setStage('fanned');
        sfx.slide();
        startReveal(500);
      });
    }
  };

  const normalReveal = (cx: number, cy: number) => {
    setStage('tell');
    setFlash({ key: Date.now(), tier: top });
    later(1400, () => setFlash(null));
    sfx.stinger(top);
    if (top === 'RISING_WORLD') {
      shakeScreen('micro');
      if (!COMIC_FX) burstAt(cx, cy + 100, ['#facc15', '#fde68a', bestEra.mid, bestEra.light], 70);
    } else if (top === 'ELITE') {
      if (!COMIC_FX) burstAt(cx, cy + 100, [bestEra.light, '#e5e7eb', bestEra.mid], 45);
    }
    if (fireworksFor) launchFireworks(500);
    later(fireworksFor ? 500 + FW_TOTAL : 1400, () => {
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
    if (dragging.current || e.pointerType !== 'mouse') return;
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
      {stage === 'dimming' && <div className="pointer-events-none fixed inset-0 z-[80] bg-ink/95 transition-opacity" />}
      {flash && COMIC_FX && (
        <div key={flash.key} className="pointer-events-none fixed inset-0 z-[81]">
          <ComicTell tier={flash.tier} best={best} />
        </div>
      )}
      {flash && !COMIC_FX && (
        <div key={flash.key} className="pointer-events-none fixed inset-0 z-[81]">
          <div
            className="absolute inset-0 animate-flash"
            // Rays are painted into the same layer as the flash: one full-screen layer, not two.
            style={{ background: flash.tier === 'RISING_WORLD' || walkoutTier(flash.tier) ? `${raysFor(flash.tier, flash.tier === 'RISING_WORLD' ? bestEra.mid : undefined)}, ${flash.tier === 'RISING_WORLD' ? goldFlash(bestEra.mid) : FLASH[flash.tier].color}` : flashColour(flash.tier, best), ['--flash-max' as string]: FLASH[flash.tier].max, animationDuration: walkoutTier(flash.tier) ? '1.6s' : flash.tier === 'STANDARD' ? '0.6s' : '1.1s' }}
          />
          {/* Shockwave: drawn at full size and shrunk, so it animates by scaling DOWN (never up). */}
          {(flash.tier === 'RISING_WORLD' || walkoutTier(flash.tier)) && (
            <div
              className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] rounded-full"
              style={{
                background: `radial-gradient(circle, transparent 62%, ${flash.tier === 'SECRET_DEV' ? '#f0abfc' : flash.tier === 'PRIME_ICON' ? 'rgba(255,255,255,.95)' : bestEra.light} 66%, transparent 71%)`,
                animation: `shock ${walkoutTier(flash.tier) ? 1.2 : 1}s ease-out forwards`,
              }}
            />
          )}
          {walkoutTier(flash.tier) && (
            <>
              <div className="absolute left-0 right-0 top-[45%] h-4 animate-flash" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent)', animationDuration: '1.6s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                {flash.tier === 'SECRET_DEV' ? (
                  <div className="animate-pop text-center font-display text-6xl leading-none sm:text-8xl" style={{ background: 'linear-gradient(90deg, #f472b6, #fbbf24, #22d3ee, #a78bfa)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 0 14px rgba(244,114,182,.7))' }}>
                    SECRET RARE
                  </div>
                ) : (
                  <div className="animate-pop font-display text-6xl text-white sm:text-8xl" style={{ textShadow: '0 0 18px rgba(186,230,253,.95), 0 0 4px rgba(15,23,42,.7)' }}>
                    BOOM!
                  </div>
                )}
              </div>
            </>
          )}
          {flash.tier === 'ELITE' && (
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="particle animate-rise"
                  style={{ left: `${30 + ((i * 41) % 40)}%`, bottom: `${30 + ((i * 17) % 20)}%`, width: 4, height: 4, background: i % 2 ? bestEra.border : '#e5e7eb', boxShadow: `0 0 8px ${bestEra.mid}`, animationDelay: `${(i % 6) * 0.08}s` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {fireworksFor && best && (stage === 'tell' || stage === 'dimming') && tiles > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[83]" aria-live="polite">
          {[0, 1, 2].map((i) => {
            const left = `${[20, 50, 80][i]}%`;
            return (
              <div key={i} className="absolute" style={{ left, top: `${TILE_Y * 100}%` }}>
                {tiles > i && (
                  <div className="absolute -translate-x-1/2 -translate-y-1/2">
                    <div className="comic-pop" style={{ ['--tilt' as string]: `${[-8, 5, -4][i]}deg` }}>
                    {/* speed lines behind the burst */}
                    <div className="comic-lines pointer-events-none absolute left-1/2 top-1/2 h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2" />
                    {i < 2 ? (
                      // POW! starburst for the position, then the club icon in a starburst
                      <div className="relative h-[112px] w-[112px] sm:h-[132px] sm:w-[132px]">
                        <div className="burst-clip absolute inset-0 translate-x-[6px] translate-y-[6px] bg-ink" />
                        <div className="burst-clip absolute inset-0 flex flex-col items-center justify-center" style={{ background: i === 0 ? '#ffd400' : '#fff6e0' }}>
                          {i === 0 ? (
                            <>
                              <span className="font-chunky text-sm leading-none text-album-red">POW!</span>
                              <span className="font-display text-5xl leading-none text-ink sm:text-6xl">{best.tier === 'SECRET_DEV' ? 'ANY' : best.positions[0]}</span>
                            </>
                          ) : (
                            <ClubIcon code={best.club} size={84} bare />
                          )}
                        </div>
                      </div>
                    ) : (
                      // the whole flag as a waving pennant
                      <div className="pennant-wave relative flex items-start" style={{ filter: 'drop-shadow(5px 0 0 #14183a)' }}>
                        <span className="relative z-10 h-[132px] w-[7px] rounded-full border-2 border-ink bg-album-cream" />
                        <div className="pennant relative -ml-0.5 mt-1 h-[92px] w-[138px] bg-ink">
                          <div className="pennant absolute left-[3px] top-[5px] h-[82px] w-[124px] overflow-hidden">
                            <Flag nation={best.nation} width={124} className="block" />
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* header */}
      <div className="mb-3 flex w-full items-center justify-between gap-2">
        <div>
          <div className="font-display text-5xl leading-[0.9] sm:text-[64px]" style={{ color: '#ffd400', WebkitTextStroke: '3px #14183a', paintOrder: 'stroke fill', textShadow: '5px 5px 0 #14183a' }}>
            {title ?? (finale ? 'LAST PACK!' : `PACK ${packNumber}!`)}
          </div>
          {subtitle ? (
            <div className="text-xs font-bold uppercase tracking-widest text-sky-300">{subtitle}</div>
          ) : finale ? (
            <div className="text-xs font-black uppercase tracking-widest text-yellow-300">★ Captain's Finale · guaranteed 86+ · double Prime odds</div>
          ) : packNumber >= 9 ? (
            <div className="text-xs font-bold uppercase tracking-widest text-flare-300">Anti-softlock: 2+ cards fit your empty slots</div>
          ) : packNumber >= 6 ? (
            <div className="text-xs font-bold uppercase tracking-widest text-flare-300/80">Pity boost: empty positions ×2.5 more likely</div>
          ) : (
            <div className="text-xs font-bold uppercase tracking-widest text-white/50">5 cards · draft 1</div>
          )}
        </div>
        <div className="hidden rounded-xl border-[3px] border-ink bg-album-cream px-3 py-2 text-right text-[13px] font-black leading-[1.5] text-ink sm:block">
          <div>Prime {rates.PRIME_ICON}%</div>
          <div>World Class {rates.RISING_WORLD}%</div>
          <div>Elite {rates.ELITE}%</div>
          <div>Squad {rates.STANDARD}%</div>
        </div>
      </div>

      {!showCards && (
        <div data-shake-zone className={`relative flex flex-1 flex-col items-center justify-center ${stage === 'tell' && top === 'ELITE' ? 'animate-pop' : ''}`}>
          {/* The foil pack */}
          <div
            ref={packRef}
            data-pack
            onPointerMove={onPackMove}
            onPointerLeave={() => setTilt({ rx: 0, ry: 0, gx: 50, gy: 30 })}
            className="relative h-[300px] w-[210px] transition-transform duration-100 sm:h-[340px] sm:w-[236px]"
            style={{ transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transformStyle: 'preserve-3d' }}
          >
            {/* 81–85 pulls: name the card type above the pack, in its colour (smaller than BOOM!) */}
            {!COMIC_FX && stage === 'tell' && top === 'ELITE' && best && (
              <div className="pointer-events-none absolute -top-16 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap">
                <div
                  className="animate-pop font-display text-4xl leading-none tracking-wider sm:text-5xl"
                  style={{ color: bestEra.border, textShadow: `0 0 14px ${bestEra.mid}, 0 0 4px #000, 0 2px 0 ${bestEra.dark}` }}
                >
                  {best.era}
                </div>
              </div>
            )}
            {stage === 'sealed' && (
              <div className="burst-clip pointer-events-none absolute -right-12 top-12 z-30 flex h-[92px] w-[92px] rotate-[14deg] items-center justify-center bg-album-cream text-center font-chunky text-[15px] leading-none text-ink">
                TEAR
                <br />
                HERE!
              </div>
            )}
            {/* top flap: the crimped tear strip (tears away) */}
            <div
              className="pack-crimp absolute inset-x-0 top-0 h-[44px] rounded-t-md border-[3px] border-b-0 border-ink transition-all duration-500"
              style={{
                backgroundColor: finale ? '#14183a' : '#ffd400',
                ...(flarePack ? { background: PEARL_CRIMP } : {}),
                transform: stage !== 'sealed' ? 'translate(60px,-80px) rotate(28deg)' : 'none',
                opacity: stage !== 'sealed' ? 0 : 1,
                clipPath: `polygon(0 0, 100% 0, 100% 100%, ${tearProgress * 100}% 100%, ${tearProgress * 100}% 70%, 0 70%)`,
              }}
            />
            {/* body: the foil packet */}
            <div
              className={`foil ${flarePack ? `foil-pearl ${flareShake ? 'pack-rumble' : ''}` : look.foil} absolute inset-x-0 bottom-0 top-[40px] overflow-hidden rounded-b-md border-[3px] border-t-[3px] border-dashed border-ink shadow-[8px_8px_0_#0b0e24] ${stage === 'tell' ? 'brightness-150' : ''}`}
              style={{ borderTopStyle: 'dashed', borderLeftStyle: 'solid', borderRightStyle: 'solid', borderBottomStyle: 'solid' }}
            >
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,.55), transparent 40%)`, mixBlendMode: 'overlay' }} />
              <div className="relative flex h-full flex-col items-center justify-center gap-1.5 pb-4 text-center">
                <div className="font-display text-lg tracking-[0.15em]" style={{ color: flarePack ? '#14183a' : look.small }}>
                  PACKDRAFT
                </div>
                <Crest size={92} variant={look.crest} />
                <div className="font-display text-[42px] leading-[0.85]" style={{ color: look.title, WebkitTextStroke: '3px #14183a', paintOrder: 'stroke fill', textShadow: '3px 3px 0 #14183a' }}>
                  {(flarePack ? ["SOMETHING'S", 'SHAKING...'] : look.name).map((l) => (
                    <div key={l}>{l}</div>
                  ))}
                </div>
                <div className="mt-1 rounded-md border-2 border-ink px-3 pb-0.5 pt-1 font-chunky text-[13px]" style={{ background: flarePack ? '#14183a' : look.chipBg, color: flarePack ? '#fff6e0' : look.chipText }}>
                  {flarePack ? 'HOLD ON TIGHT' : packLabel ?? (finale ? 'LAST PACK!' : wrapper === 'daily' ? `PACK ${packNumber} · SAME FOR EVERYONE` : `PACK ${packNumber} OF ${TOTAL_PACKS}`)}
                </div>
                <div className="mt-0.5 font-chunky text-[11px]" style={{ color: flarePack ? '#14183a' : look.small }}>
                  5 STICKERS INSIDE
                </div>
              </div>
              <div className="pack-crimp absolute inset-x-0 bottom-0 h-4 border-t-[3px] border-ink" style={flarePack ? { background: PEARL_CRIMP } : { backgroundColor: finale ? '#14183a' : '#ffd400' }} />
              {stage === 'tell' && (
                <div
                  className="absolute inset-x-0 top-0 h-2"
                  style={{ background: top === 'SECRET_DEV' ? '#f0abfc' : top === 'PRIME_ICON' ? '#ffffff' : top === 'RISING_WORLD' ? '#facc15' : top === 'ELITE' ? bestEra.mid : '#fff', boxShadow: '0 0 40px 18px currentColor' }}
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
              <div className="perforation absolute left-4 right-4 top-1/2 h-[14px] -translate-y-1/2 rounded-full bg-ink-950/50">
                <div className="h-full rounded-full border-r-[3px] border-dashed border-ink bg-album-cream" style={{ width: `${tearProgress * 100}%` }} />
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
                  className={`pointer-events-none absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-ink bg-album-red text-white shadow-[3px_3px_0_#14183a] ${tearProgress === 0 && !isDragging ? 'animate-pulse' : ''}`}
                  style={{ left: `calc(16px + (100% - 32px) * ${tearProgress})` }}
                >
                  <Scissors className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>
          {stage === 'sealed' && (
            <div className="mt-5 flex flex-col items-center gap-2">
              
              <button
                onClick={rip}
                className="group relative overflow-hidden btn-cut bg-flare-500 px-10 py-3 text-[32px] text-ink transition hover:scale-105"
                style={{ borderWidth: 5, boxShadow: '0 8px 0 #14183a', borderRadius: 16 }}
              >
                <span className="relative z-10 flex items-center gap-2">RIP IT OPEN!</span>
                <span className="absolute inset-0 -translate-x-full bg-white/50 transition group-hover:translate-x-full" style={{ transitionDuration: '700ms' }} />
              </button>
              <div className="mt-1 text-sm font-bold text-album-cream">or grab the yellow strip and drag it across</div>
            </div>
          )}
        </div>
      )}

      {showCards && (
        <div data-shake-zone className="flex w-full flex-1 flex-col items-center">
          <div className="flex w-full flex-wrap items-start justify-center gap-2 sm:gap-3">
            {cards.map((card, i) => {
              const isFlipped = flipped.has(i);
              const isPrimeHold = i === heldIdx && !isFlipped;
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
                    {isFlipped && newIds?.has(card.id) && (
                      <span className="burst-clip pointer-events-none absolute -right-4 -top-4 z-30 flex h-[52px] w-[52px] animate-pop items-center justify-center bg-album-red font-chunky text-[13px] text-white" style={{ backfaceVisibility: 'hidden' }}>
                        NEW!
                      </span>
                    )}
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

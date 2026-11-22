// Comic-book rarity tells for the pack opener: flat colour, navy outlines, one sound-effect word per pull,
// sized by rarity. Squad: a quick RIP!. Elite: the label slams in on a burst. Gold: spinning flat gold rays
// and WHAM!. Prime: a white panel flash, pearl rays and KA-BOOM!. Secret rare: the same with a glitchy
// misprint and SECRET RARE!
import type { CSSProperties } from 'react';
import type { PlayerCard, Tier } from '../types/game';
import { eraColour } from '../data/eraColours';

const INK = '#14183a';
const BURST =
  'polygon(50% 0, 61% 18%, 82% 10%, 80% 32%, 100% 40%, 85% 56%, 96% 76%, 74% 78%, 68% 100%, 50% 88%, 32% 100%, 26% 78%, 4% 76%, 15% 56%, 0 40%, 20% 32%, 18% 10%, 39% 18%)';
const STAR = 'polygon(50% 0, 62% 36%, 100% 38%, 70% 60%, 80% 100%, 50% 76%, 20% 100%, 30% 60%, 0 38%, 38% 36%)';

function Word({ text, size, fill, tilt = -6, delay = 0, glitch }: { text: string; size: number; fill: string; tilt?: number; delay?: number; glitch?: boolean }) {
  const style: CSSProperties = {
    fontSize: size,
    color: fill,
    WebkitTextStroke: `${Math.max(3, size / 16)}px ${INK}`,
    paintOrder: 'stroke fill',
    textShadow: `${Math.max(4, size / 12)}px ${Math.max(4, size / 12)}px 0 ${INK}`,
    ['--tilt' as string]: `${tilt}deg`,
    animationDelay: `${delay}ms`,
  };
  return (
    <div className={`comic-word relative whitespace-nowrap font-display leading-none ${glitch ? 'comic-glitch' : ''}`} style={style} data-text={text}>
      {text}
    </div>
  );
}

/** Flat foil stars flying out from the middle. */
function Stars({ colours, count = 14 }: { colours: string[]; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + (i % 2) * 0.2;
        const d = 34 + (i % 3) * 9; // vmin
        return (
          <span
            key={i}
            className="comic-star absolute left-1/2 top-1/2"
            style={
              {
                width: 18 + (i % 3) * 8,
                height: 18 + (i % 3) * 8,
                background: colours[i % colours.length],
                clipPath: STAR,
                ['--dx' as string]: `${Math.cos(a) * d}vmin`,
                ['--dy' as string]: `${Math.sin(a) * d}vmin`,
                ['--spin' as string]: `${(i % 2 ? 1 : -1) * (120 + i * 20)}deg`,
                animationDelay: `${(i % 4) * 40}ms`,
                filter: `drop-shadow(2px 2px 0 ${INK})`,
              } as CSSProperties
            }
          />
        );
      })}
    </>
  );
}

/** Flat sunburst rays with hard edges, spinning slowly. */
function Rays({ a, b, size = 160 }: { a: string; b: string; size?: number }) {
  return (
    <div
      className="comic-rays absolute left-1/2 top-1/2"
      style={{ width: `${size}vmax`, height: `${size}vmax`, background: `repeating-conic-gradient(from 0deg, ${a} 0 9deg, ${b} 9deg 18deg)` }}
    />
  );
}

export function ComicTell({ tier, best }: { tier: Tier; best?: PlayerCard }) {
  const era = best ? eraColour(best.era) : eraColour('SQUAD');

  if (tier === 'STANDARD')
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Word text="RIP!" size={72} fill="#fff6e0" tilt={-10} />
      </div>
    );

  if (tier === 'ELITE')
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="comic-halftone absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] rounded-full" style={{ ['--dot' as string]: era.mid }} />
        <div className="comic-word relative" style={{ ['--tilt' as string]: '-5deg' }}>
          <div className="absolute inset-[-34px_-44px]" style={{ background: INK, clipPath: BURST, transform: 'translate(7px, 7px)' }} />
          <div className="absolute inset-[-34px_-44px]" style={{ background: era.mid, clipPath: BURST }} />
          <div className="relative px-4 font-display text-6xl leading-none sm:text-7xl" style={{ color: '#fff6e0', WebkitTextStroke: `4px ${INK}`, paintOrder: 'stroke fill' }}>
            {best?.era ?? 'ELITE'}!
          </div>
        </div>
      </div>
    );

  if (tier === 'RISING_WORLD')
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div className="comic-fade absolute inset-0">
          <Rays a="#ffd400" b="#f3b415" />
        </div>
        <Stars colours={['#ffd400', '#fff3c4', '#d9a93c', '#fff6e0']} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Word text="WHAM!" size={128} fill="#ffd400" tilt={-8} />
        </div>
      </div>
    );

  const secret = tier === 'SECRET_DEV';
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="comic-panel-flash absolute inset-0 bg-white" />
      <div className="comic-fade absolute inset-0" style={{ animationDelay: '120ms' }}>
        {secret ? <Rays a="#14183a" b="#2a1f5a" /> : <Rays a="#ffe6f0" b="#d4f1ff" />}
        <div className="comic-halftone-full absolute inset-0" />
        {secret && <div className="absolute inset-0 opacity-60" style={{ background: 'linear-gradient(90deg, #ff4d6d, #ffb703, #f7f052, #3ddc97, #3aa0ff, #a46bff)', mixBlendMode: 'screen' }} />}
      </div>
      <Stars colours={secret ? ['#ff4d6d', '#ffb703', '#3ddc97', '#3aa0ff', '#a46bff'] : ['#ffd400', '#fff6e0', '#e1d7ff', '#c9fff0', '#e62e2d']} count={18} />
      <div className="absolute inset-0 flex items-center justify-center">
        <Word text={secret ? 'SECRET RARE!' : 'KA-BOOM!'} size={secret ? 104 : 140} fill={secret ? '#fff6e0' : '#ffd400'} tilt={-7} delay={120} glitch={secret} />
      </div>
    </div>
  );
}

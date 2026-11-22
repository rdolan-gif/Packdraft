import { Lock } from 'lucide-react';
import { FORMATIONS, FORMATION_IDS, positionGroup } from '../data/formations';
import type { FormationId } from '../types/game';
import { sfx } from '../engine/soundEffects';

const DOT: Record<string, string> = { GK: '#facc15', DEF: '#38bdf8', MID: '#34d399', FWD: '#f43f5e' };

function MiniPitch({ id, size = 92 }: { id: FormationId; size?: number }) {
  const f = FORMATIONS[id];
  return (
    <svg viewBox="0 0 100 125" width={size} height={size * 1.25} className="rounded-md">
      <rect width="100" height="125" fill="#14532d" />
      <g stroke="rgba(255,255,255,.35)" fill="none" strokeWidth="1">
        <rect x="3" y="3" width="94" height="119" />
        <line x1="3" y1="62.5" x2="97" y2="62.5" />
        <circle cx="50" cy="62.5" r="9" />
      </g>
      {f.slots.map((s) => (
        <circle key={s.id} cx={s.x} cy={s.y * 1.25} r="5.5" fill={DOT[positionGroup(s.label)]} stroke="#000" strokeWidth="1" />
      ))}
    </svg>
  );
}

interface Props {
  current: FormationId;
  onChange: (id: FormationId) => void;
  preferred?: FormationId[];
  variant?: 'full' | 'inline';
  locked?: boolean;
}

export function FormationPicker({ current, onChange, preferred = [], variant = 'full', locked }: Props) {
  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {locked && (
          <span className="flex items-center gap-1 rounded-[10px] border-[3px] border-ink bg-white px-3 pb-0.5 pt-1.5 font-chunky text-sm text-ink shadow-[3px_3px_0_#14183a]">
            <Lock className="-mt-1 h-3.5 w-3.5" /> {current} LOCKED
          </span>
        )}
        {!locked &&
          FORMATION_IDS.map((id) => (
            <button
              key={id}
              onClick={() => {
                sfx.click();
                onChange(id);
              }}
              className={`rounded-[8px] border-2 border-ink px-2 py-1 text-[11px] font-black text-ink transition ${
                id === current ? 'bg-flare-500 shadow-[2px_2px_0_#14183a]' : 'bg-white hover:bg-album-cream'
              }`}
            >
              {id}
              {preferred.includes(id) && <span className="ml-1 text-album-red">★</span>}
            </button>
          ))}
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {FORMATION_IDS.map((id) => {
        const f = FORMATIONS[id];
        const active = id === current;
        return (
          <button
            key={id}
            onClick={() => {
              sfx.select();
              onChange(id);
            }}
            onMouseEnter={() => sfx.hover()}
            className={`group relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition hover:-translate-y-1 ${
              active ? 'border-flare-400 bg-flare-400/10 shadow-lg shadow-flare-500/20' : 'border-white/10 bg-black/30 hover:border-white/30'
            }`}
          >
            {preferred.includes(id) && (
              <span className="absolute right-2 top-2 rounded-full bg-yellow-300 px-1.5 text-[9px] font-black uppercase text-black">Manager ★</span>
            )}
            <MiniPitch id={id} />
            <div className="font-display text-2xl leading-none text-white">{id}</div>
            <div className="text-[11px] font-bold text-flare-300">{f.name}</div>
            <div className="text-[11px] leading-snug text-white/55">{f.description}</div>
          </button>
        );
      })}
    </div>
  );
}

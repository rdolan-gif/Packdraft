import { useEffect, useState } from 'react';
import { Gauge, RotateCcw, Sparkles, Trophy, Volume2, VolumeX } from 'lucide-react';
import { isMuted, onMuteChange, setMuted, sfx } from '../engine/soundEffects';
import { isLite, onLiteChange, setLite } from '../engine/perf';
import { TOTAL_PACKS } from '../engine/packGenerator';

interface Props {
  phase: string;
  packNumber: number;
  picksMade: number;
  vaultCount: number;
  onOpenVault: () => void;
  onNewRun: () => void;
}

export function Header({ phase, packNumber, picksMade, vaultCount, onOpenVault, onNewRun }: Props) {
  const [muted, setM] = useState(isMuted());
  const [armed, setArmed] = useState(false);
  const [lite, setL] = useState(isLite());
  useEffect(() => onLiteChange(setL), []);
  // Leaving a run in progress needs a second tap (logo or reset button).
  const safeToLeave = phase === 'title' || phase === 'review';
  const requestNewRun = () => {
    if (safeToLeave || armed) {
      setArmed(false);
      onNewRun();
    } else {
      sfx.error();
      setArmed(true);
    }
  };
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  useEffect(() => {
    const off = onMuteChange(setM);
    return () => {
      off();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <button onClick={requestNewRun} className="flex items-center gap-2" aria-label="PackDraft 38 home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-300 to-amber-600 font-display text-xl text-black shadow-lg shadow-amber-500/30">38</span>
          <span className="hidden font-display text-2xl leading-none tracking-wider text-white sm:block">
            PACK<span className="text-emerald-400">DRAFT</span> 38
          </span>
        </button>

        {phase === 'draft' && (
          <div className="ml-2 flex flex-1 items-center gap-2">
            <div className="hidden text-[10px] font-black uppercase tracking-widest text-white/50 md:block">Draft</div>
            <div className="flex flex-1 gap-1">
              {Array.from({ length: TOTAL_PACKS }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    i < picksMade ? 'bg-emerald-400' : i === packNumber - 1 ? 'animate-pulse bg-yellow-300' : 'bg-white/15'
                  } ${i === TOTAL_PACKS - 1 ? 'ring-1 ring-yellow-300/60' : ''}`}
                />
              ))}
            </div>
            <span className="font-display text-lg text-white/80">{picksMade}/11</span>
          </div>
        )}
        {phase !== 'draft' && <div className="flex-1" />}

        <button
          onClick={() => {
            sfx.click();
            onOpenVault();
          }}
          className="relative flex items-center gap-1.5 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-yellow-200 transition hover:bg-yellow-400/20"
        >
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Trophy Vault</span>
          {vaultCount > 0 && <span className="rounded-full bg-yellow-400 px-1.5 text-[10px] text-black">{vaultCount}</span>}
        </button>
        <button
          onClick={() => {
            setLite(!lite);
            sfx.click();
          }}
          className={`flex items-center gap-1 rounded-lg border p-2 text-xs font-black uppercase transition ${lite ? 'border-sky-400/50 bg-sky-500/15 text-sky-200' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}
          aria-label={lite ? 'Lite effects on: tap for full effects' : 'Full effects on: tap for lite effects'}
          aria-pressed={lite}
          title={lite ? 'Lite effects (smoother on some phones)' : 'Full effects'}
        >
          {lite ? <Gauge className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          <span className="hidden md:inline">{lite ? 'Lite FX' : 'Full FX'}</span>
        </button>
        <button
          onClick={() => {
            setMuted(!muted);
            if (muted) window.setTimeout(() => sfx.click(), 30);
          }}
          className="rounded-lg border border-white/15 bg-white/5 p-2 text-white/80 transition hover:bg-white/10"
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        {phase !== 'title' && (
          <button
            onClick={requestNewRun}
            className={`flex items-center gap-1 rounded-lg border p-2 transition ${armed ? 'border-rose-400 bg-rose-500/20 text-rose-200' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}
            aria-label={armed ? 'Tap again to abandon this run' : 'New run'}
            title="New run"
          >
            <RotateCcw className="h-4 w-4" />
            {armed && <span className="text-[10px] font-black uppercase">Tap again to abandon</span>}
          </button>
        )}
      </div>
    </header>
  );
}

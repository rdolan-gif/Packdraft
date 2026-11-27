import { useEffect, useState } from 'react';
import { Award, BookOpen, Gauge, RotateCcw, Sparkles, Trophy, Volume2, VolumeX } from 'lucide-react';
import { isMuted, onMuteChange, setMuted, sfx } from '../engine/soundEffects';
import { isLite, onLiteChange, setLite } from '../engine/perf';
import { TOTAL_PACKS } from '../engine/packGenerator';
import { Crest, Wordmark } from './Crest';

interface Props {
  phase: string;
  packNumber: number;
  picksMade: number;
  vaultCount: number;
  onOpenVault: () => void;
  onOpenBook: () => void;
  onOpenCabinet: () => void;
  trophyCount: number;
  /** Set during a Daily Draft. */
  dailyNumber: number | null;
  onNewRun: () => void;
}

export function Header({ phase, packNumber, picksMade, vaultCount, onOpenVault, onOpenBook, onOpenCabinet, trophyCount, dailyNumber, onNewRun }: Props) {
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
    <header className="sticky top-0 z-50 border-b-4 border-flare-500 bg-ink">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <button onClick={requestNewRun} className="flex items-center gap-2" aria-label="PackDraft 38 home">
          <Crest size={34} variant="full" />
          <Wordmark className="hidden text-2xl sm:inline-flex" />
        </button>
        {dailyNumber !== null && phase !== 'title' && (
          <span className="rounded-full border-2 border-album-cream bg-album-blue px-2 pb-0 pt-0.5 font-chunky text-[11px] text-white">DAILY #{dailyNumber}</span>
        )}

        {phase === 'draft' && (
          <div className="ml-1 flex min-w-0 flex-1 items-center gap-2 sm:ml-2">
            <div className="hidden text-[10px] font-black uppercase tracking-widest text-white/50 md:block">Draft</div>
            <div className="flex min-w-0 flex-1 gap-[3px] sm:gap-1">
              {Array.from({ length: TOTAL_PACKS }).map((_, i) => (
                <span
                  key={i}
                  className={`h-4 max-w-[22px] flex-1 rounded-[3px] transition-all ${
                    i < picksMade ? 'border-2 border-album-cream bg-flare-500' : i === packNumber - 1 ? 'animate-pulse border-2 border-album-cream bg-album-red' : 'border-2 border-dashed border-white/35'
                  }`}
                />
              ))}
            </div>
            <span className="font-display text-xl text-album-cream">{picksMade}/11</span>
          </div>
        )}
        {phase !== 'draft' && <div className="flex-1" />}

        <button
          onClick={() => {
            sfx.click();
            onOpenBook();
          }}
          className="hdr-btn flex"
          aria-label="Sticker book"
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Stickers</span>
        </button>
        <button
          onClick={() => {
            sfx.click();
            onOpenCabinet();
          }}
          className={`hdr-btn ${phase === 'title' ? 'flex' : 'hidden sm:flex'}`}
          aria-label="Trophy cabinet"
        >
          <Award className="h-4 w-4" />
          <span className="hidden lg:inline">Trophies</span>
          <span className="rounded-full bg-album-red px-1.5 text-[11px] text-white">{trophyCount}</span>
        </button>
        <button
          onClick={() => {
            sfx.click();
            onOpenVault();
          }}
          className={`hdr-btn relative ${phase === 'title' ? 'flex' : 'hidden sm:flex'}`}
        >
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Trophy Vault</span>
          {vaultCount > 0 && <span className="rounded-full bg-album-red px-1.5 text-[11px] text-white">{vaultCount}</span>}
        </button>
        <button
          onClick={() => {
            setLite(!lite);
            sfx.click();
          }}
          className={`hdr-btn hdr-icon flex ${lite ? '!bg-album-blue !text-white' : ''}`}
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
          className="hdr-btn hdr-icon flex"
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        {phase !== 'title' && (
          <button
            onClick={requestNewRun}
            className={`hdr-btn hdr-icon flex ${armed ? '!bg-album-red !text-white' : ''}`}
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

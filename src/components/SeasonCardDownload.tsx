import { useState } from 'react';
import { Download, ImageIcon, Loader2, Share2, X } from 'lucide-react';
import { sfx } from '../engine/soundEffects';
import { drawSeasonCard, seasonCardFileName, type SeasonCardData } from './seasonCardImage';

/** "Download season card" button: draws the PNG, shows a preview, then saves or shares it. */
export function SeasonCardDownload(props: SeasonCardData) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileName = seasonCardFileName(props.teamName);

  const make = async () => {
    setBusy(true);
    setError(null);
    sfx.click();
    try {
      const canvas = await drawSeasonCard(props);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('no image');
      setPreview({ url: canvas.toDataURL('image/png'), blob });
      sfx.select();
    } catch {
      setError("Couldn't draw the card on this browser. Try again, or take a screenshot instead.");
    } finally {
      setBusy(false);
    }
  };

  const file = preview ? new File([preview.blob], fileName, { type: 'image/png' }) : null;
  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

  const download = () => {
    if (!preview) return;
    const url = URL.createObjectURL(preview.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    sfx.select();
  };

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: 'PackDraft 38 season card' });
    } catch {
      /* cancelled */
    }
  };

  return (
    <>
      <button
        onClick={make}
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-sky-300/70 bg-sky-400/15 px-4 py-2.5 font-display text-xl tracking-wider text-sky-100 transition hover:bg-sky-400/25 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />} {busy ? 'DRAWING YOUR CARD…' : 'DOWNLOAD SEASON CARD'}
      </button>
      {error && <div className="text-center text-xs text-rose-300">{error}</div>}

      {preview && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/85 p-3" onClick={() => setPreview(null)} role="dialog" aria-label="Season card preview">
          <div className="relative flex max-h-full w-full max-w-md animate-pop flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} className="absolute -right-1 -top-1 z-10 rounded-full bg-black/80 p-2 text-white hover:bg-black" aria-label="Close preview">
              <X className="h-5 w-5" />
            </button>
            <img src={preview.url} alt="Your season card" className="max-h-[72vh] w-full rounded-2xl object-contain shadow-2xl" />
            <div className="flex gap-2">
              <button onClick={download} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 font-display text-xl tracking-wider text-black hover:bg-sky-300">
                <Download className="h-5 w-5" /> SAVE IMAGE
              </button>
              {canShare && (
                <button onClick={share} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-display text-xl tracking-wider text-black hover:bg-emerald-300">
                  <Share2 className="h-5 w-5" /> SHARE
                </button>
              )}
            </div>
            <div className="text-center text-xs text-white/50">On a phone you can also press and hold the image to save it.</div>
          </div>
        </div>
      )}
    </>
  );
}

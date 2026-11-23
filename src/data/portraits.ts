const FILES = import.meta.glob('../assets/portraits/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const BY_ID = Object.fromEntries(Object.entries(FILES).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -5), url]));
export const portraitUrl = (cardId: string) => BY_ID[cardId];
export const portraitCount = Object.keys(BY_ID).length;

// Keep a reference to each warmed image so the browser holds it decoded and the reveal paints at once.
const warm = new Map<string, HTMLImageElement>();
function warmUrl(url: string) {
  if (warm.has(url)) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  warm.set(url, img);
  img.decode?.().catch(() => {});
}

export function preloadPortraits(cardIds: string[]) {
  cardIds.forEach((id) => {
    const url = BY_ID[id];
    if (url) warmUrl(url);
  });
}

/** Quietly fetch every portrait in the background, a few at a time, so packs never wait on the network. */
export function preloadAllPortraits() {
  const queue = Object.values(BY_ID).filter((u) => !warm.has(u));
  const idle = (cb: () => void) =>
    'requestIdleCallback' in window ? (window as Window & { requestIdleCallback: (f: () => void) => void }).requestIdleCallback(cb) : setTimeout(cb, 50);
  const step = () => {
    queue.splice(0, 6).forEach(warmUrl);
    if (queue.length) idle(step);
  };
  idle(step);
}

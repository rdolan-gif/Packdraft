// Hand-drawn player portraits (Google Flow), one file per card: src/assets/portraits/<card id>.webp.
// Cards without one fall back to the vector caricature. Add more with design/flow/tools/cut_grid.py.
const FILES = import.meta.glob('../assets/portraits/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const BY_ID: Record<string, string> = Object.fromEntries(Object.entries(FILES).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -5), url]));

export const portraitUrl = (cardId: string): string | undefined => BY_ID[cardId];
export const portraitCount = Object.keys(BY_ID).length;

/** Start downloading these cards' portraits now (e.g. when a pack is dealt), so they're ready on reveal. */
export function preloadPortraits(cardIds: string[]) {
  cardIds.forEach((id) => {
    const url = BY_ID[id];
    if (url) new Image().src = url;
  });
}

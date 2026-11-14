// The sticker book: every card you've ever pulled, saved in this browser.
// - "pulled": the card appeared in a pack you opened (that's what fills the book)
// - "drafted": you picked it into your XI (earns a gold star on the sticker)
// - "totw": Team of the Week honours (a separate bonus page, not part of completion)

const KEY = 'pd38_stickers_v1';

export interface StickerBook {
  pulled: Record<string, string>; // card id -> first pulled (ISO date)
  drafted: Record<string, number>; // card id -> times drafted
  totw: Record<string, { count: number; first: string }>; // card id -> Team of the Week honours
}

const EMPTY: StickerBook = { pulled: {}, drafted: {}, totw: {} };

export function loadBook(): StickerBook {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, pulled: {}, drafted: {}, totw: {} };
    const b = JSON.parse(raw);
    return { pulled: b.pulled ?? {}, drafted: b.drafted ?? {}, totw: b.totw ?? {} };
  } catch {
    return { pulled: {}, drafted: {}, totw: {} };
  }
}

function save(b: StickerBook) {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* storage unavailable: the book lasts for this visit only */
  }
}

/** Stick in every card from an opened pack. Returns the ids that were new. */
export function recordPulled(ids: string[]): string[] {
  const b = loadBook();
  const now = new Date().toISOString();
  const fresh = ids.filter((id) => !b.pulled[id]);
  fresh.forEach((id) => (b.pulled[id] = now));
  if (fresh.length) save(b);
  return fresh;
}

export function recordDrafted(id: string) {
  const b = loadBook();
  b.pulled[id] ??= new Date().toISOString();
  b.drafted[id] = (b.drafted[id] ?? 0) + 1;
  save(b);
}

export function recordTotw(ids: string[]) {
  if (!ids.length) return;
  const b = loadBook();
  const now = new Date().toISOString();
  ids.forEach((id) => {
    const cur = b.totw[id];
    b.totw[id] = { count: (cur?.count ?? 0) + 1, first: cur?.first ?? now };
  });
  save(b);
}

export function isPulled(id: string) {
  return !!loadBook().pulled[id];
}

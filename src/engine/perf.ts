// "Lite effects": skips the GPU-heavy visuals (colour-dodge shimmer, frosted glass,
// pulsing glows, screen shake) that some Android GPUs struggle with.
// On by default on Android and for reduced-motion users; the header toggle overrides it.

const KEY = 'pd38_lite_fx';
const listeners = new Set<(on: boolean) => void>();

function defaultLite(): boolean {
  if (typeof navigator === 'undefined') return false;
  const android = /Android/i.test(navigator.userAgent);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return android || !!reduced;
}

function read(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    /* storage unavailable */
  }
  return defaultLite();
}

let lite = read();
apply();

function apply() {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('lite', lite);
}

export function isLite() {
  return lite;
}

export function setLite(on: boolean) {
  lite = on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
  apply();
  listeners.forEach((l) => l(on));
}

export function onLiteChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

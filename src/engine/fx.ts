import confetti from 'canvas-confetti';
import { isLite } from './perf';

/**
 * Shake the panel the player is looking at (marked with data-shake-zone).
 * Shaking the whole page forced the browser to redraw everything each frame,
 * which stalled some Android GPUs.
 */
export function shakeScreen(kind: 'micro' | 'heavy') {
  if (isLite()) return;
  const zones = Array.from(document.querySelectorAll<HTMLElement>('[data-shake-zone]'));
  const el = zones.find((z) => z.offsetParent !== null);
  if (!el) return;
  const cls = kind === 'heavy' ? 'animate-bigshake' : 'animate-shake';
  el.classList.remove('animate-bigshake', 'animate-shake');
  void el.offsetWidth; // restart animation
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), 750);
}

const scale = (n: number) => Math.max(1, Math.round(n * (isLite() ? 0.35 : 1)));
const base = { zIndex: 9999, disableForReducedMotion: true } as const;

export function goldConfetti(intensity = 1) {
  const colors = ['#facc15', '#fde68a', '#f59e0b', '#ffffff', '#fbbf24'];
  confetti({ ...base, particleCount: scale(120 * intensity), spread: 100, startVelocity: 45, origin: { y: 0.55 }, colors, scalar: 1.1 });
  if (isLite()) return;
  window.setTimeout(() => {
    confetti({ ...base, particleCount: scale(60 * intensity), angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
    confetti({ ...base, particleCount: scale(60 * intensity), angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
  }, 250);
}

export function rainbowConfetti() {
  const colors = ['#facc15', '#22d3ee', '#a855f7', '#f43f5e', '#10b981', '#ffffff'];
  if (isLite()) {
    confetti({ ...base, particleCount: 60, spread: 120, origin: { y: 0.6 }, colors });
    return;
  }
  const end = Date.now() + 1800;
  (function frame() {
    confetti({ ...base, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors });
    confetti({ ...base, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function burstAt(x: number, y: number, colors: string[], count = 40) {
  confetti({
    ...base,
    particleCount: scale(count),
    spread: 360,
    startVelocity: 25,
    gravity: 0.6,
    ticks: 120,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    colors,
    scalar: 0.8,
  });
}

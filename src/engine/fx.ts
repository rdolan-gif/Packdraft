import confetti from 'canvas-confetti';

/** Screen shake on the app shell. */
export function shakeScreen(kind: 'micro' | 'heavy') {
  const el = document.getElementById('app-shell');
  if (!el) return;
  const cls = kind === 'heavy' ? 'animate-bigshake' : 'animate-shake';
  el.classList.remove('animate-bigshake', 'animate-shake');
  void el.offsetWidth; // restart animation
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), kind === 'heavy' ? 750 : 750);
}

export function goldConfetti(intensity = 1) {
  const colors = ['#facc15', '#fde68a', '#f59e0b', '#ffffff', '#fbbf24'];
  confetti({ particleCount: Math.round(120 * intensity), spread: 100, startVelocity: 45, origin: { y: 0.55 }, colors, scalar: 1.1, zIndex: 9999 });
  window.setTimeout(
    () => {
      confetti({ particleCount: Math.round(60 * intensity), angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, zIndex: 9999 });
      confetti({ particleCount: Math.round(60 * intensity), angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, zIndex: 9999 });
    },
    250,
  );
}

export function rainbowConfetti() {
  const end = Date.now() + 1800;
  const colors = ['#facc15', '#22d3ee', '#a855f7', '#f43f5e', '#10b981', '#ffffff'];
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors, zIndex: 9999 });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors, zIndex: 9999 });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function burstAt(x: number, y: number, colors: string[], count = 40) {
  confetti({
    particleCount: count,
    spread: 360,
    startVelocity: 25,
    gravity: 0.6,
    ticks: 120,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    colors,
    scalar: 0.8,
    zIndex: 9999,
  });
}

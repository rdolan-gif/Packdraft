/** @type {import('tailwindcss').Config} */
export default {
  // hover: styles only on devices that can really hover, so taps on phones don't leave things 'stuck' enlarged.
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Tier classes are built as `tier-${card.tier}`, so list them for the components layer.
  safelist: ['tier-STANDARD', 'tier-ELITE', 'tier-RISING_WORLD', 'tier-PRIME_ICON', 'holo', 'aura'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        pitch: { 900: '#05110b', 800: '#0a1f14', 700: '#0f2e1d' },
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translate(0,0)' },
          '20%': { transform: 'translate(-4px,2px)' },
          '40%': { transform: 'translate(4px,-2px)' },
          '60%': { transform: 'translate(-3px,-3px)' },
          '80%': { transform: 'translate(3px,3px)' },
        },
        bigshake: {
          '0%,100%': { transform: 'translate(0,0) rotate(0)' },
          '10%': { transform: 'translate(-12px,6px) rotate(-1deg)' },
          '30%': { transform: 'translate(12px,-8px) rotate(1deg)' },
          '50%': { transform: 'translate(-10px,-6px) rotate(-0.5deg)' },
          '70%': { transform: 'translate(8px,8px) rotate(0.5deg)' },
          '90%': { transform: 'translate(-4px,2px)' },
        },
        flash: { '0%': { opacity: 'var(--flash-max, 0.7)' }, '100%': { opacity: '0' } },
        holo: { '0%': { backgroundPosition: '0% 50%' }, '100%': { backgroundPosition: '200% 50%' } },
        aura: { '0%,100%': { boxShadow: '0 0 18px 4px rgba(250,204,21,.55)' }, '50%': { boxShadow: '0 0 38px 12px rgba(250,204,21,.9)' } },
        vibrate: { '0%,100%': { transform: 'translate(0,0)' }, '25%': { transform: 'translate(-1.5px,1px)' }, '75%': { transform: 'translate(1.5px,-1px)' } },
        stamp: { '0%': { transform: 'scale(3) rotate(-25deg)', opacity: '0' }, '60%': { transform: 'scale(.9) rotate(-12deg)', opacity: '1' }, '100%': { transform: 'scale(1) rotate(-12deg)', opacity: '1' } },
        rise: { '0%': { transform: 'translateY(0)', opacity: '1' }, '100%': { transform: 'translateY(-120px)', opacity: '0' } },
        sweep: { '0%': { transform: 'translateX(-150%) skewX(-20deg)' }, '100%': { transform: 'translateX(250%) skewX(-20deg)' } },
        spinslow: { to: { transform: 'rotate(360deg)' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '70%': { transform: 'scale(1.08)', opacity: '1' }, '100%': { transform: 'scale(1)' } },
        ticker: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        shake: 'shake .35s linear 2',
        bigshake: 'bigshake .7s cubic-bezier(.36,.07,.19,.97) 1',
        flash: 'flash .9s ease-out forwards',
        holo: 'holo 4s linear infinite',
        aura: 'aura 1.6s ease-in-out infinite',
        vibrate: 'vibrate .12s linear infinite',
        stamp: 'stamp .55s cubic-bezier(.2,1.4,.4,1) forwards',
        rise: 'rise 1.4s ease-out forwards',
        sweep: 'sweep 2.6s ease-in-out infinite',
        spinslow: 'spinslow 12s linear infinite',
        pop: 'pop .45s cubic-bezier(.2,1.4,.4,1) both',
        ticker: 'ticker 40s linear infinite',
      },
    },
  },
  plugins: [],
};

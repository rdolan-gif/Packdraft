import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface Props {
  /** Touch tap, or a mouse click when `mouseAction` is 'tap'. */
  onTap?: () => void;
  /** Touch long-press, or a mouse click when `mouseAction` is 'hold'. */
  onHold?: () => void;
  /** What a mouse click does. Mice can't comfortably long-press, so a click usually means "inspect". */
  mouseAction?: 'tap' | 'hold';
  holdMs?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  ariaLabel?: string;
  /** Show the filling ring while a touch hold is in progress. */
  showHoldRing?: boolean;
}

/**
 * One element, three gestures: touch tap, touch long-press, mouse click.
 * Keyboard Enter/Space behaves like a mouse click.
 */
export function Pressable({ onTap, onHold, mouseAction = 'hold', holdMs = 450, className = '', style, children, ariaLabel, showHoldRing = true }: Props) {
  const [pressing, setPressing] = useState(false);
  const timer = useRef<number | null>(null);
  const held = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const lastPointer = useRef<string>('mouse');
  const touchHandled = useRef(false);

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setPressing(false);
  };
  useEffect(() => clear, []);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} select-none [-webkit-touch-callout:none] ${className}`}
      style={style}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
        if (e.pointerType === 'mouse') return;
        held.current = false;
        touchHandled.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        if (onHold) {
          setPressing(true);
          timer.current = window.setTimeout(() => {
            held.current = true;
            setPressing(false);
            navigator.vibrate?.(15);
            onHold();
          }, holdMs);
        }
      }}
      onPointerMove={(e) => {
        if (!start.current || e.pointerType === 'mouse') return;
        if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) {
          clear();
          start.current = null; // it's a scroll, not a press
        }
      }}
      onPointerUp={(e) => {
        if (e.pointerType === 'mouse') return;
        const wasPress = !!start.current;
        clear();
        start.current = null;
        touchHandled.current = true;
        if (wasPress && !held.current) onTap?.();
      }}
      onPointerCancel={() => {
        clear();
        start.current = null;
      }}
      onContextMenu={(e) => {
        if (lastPointer.current !== 'mouse') e.preventDefault();
      }}
      onClick={() => {
        // Touch already handled in pointerup; this click is the browser's echo of it.
        if (touchHandled.current) {
          touchHandled.current = false;
          return;
        }
        if (mouseAction === 'hold') (onHold ?? onTap)?.();
        else (onTap ?? onHold)?.();
      }}
    >
      {children}
      {pressing && showHoldRing && (
        <span className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="h-12 w-12 drop-shadow-[0_0_6px_rgba(0,0,0,.8)]">
            <circle cx="20" cy="20" r="16" fill="rgba(0,0,0,.45)" stroke="rgba(255,255,255,.25)" strokeWidth="4" />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="#facc15"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="100.5"
              strokeDashoffset="100.5"
              transform="rotate(-90 20 20)"
              style={{ animation: `holdfill ${holdMs}ms linear forwards` }}
            />
          </svg>
        </span>
      )}
    </button>
  );
}

/** True on devices with a precise pointer (mouse/trackpad). */
export function useFinePointer() {
  const [fine, setFine] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    if (!mq) return;
    const on = () => setFine(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return fine;
}

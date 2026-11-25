/**
 * useCountUp — animates a number from 0 to `target` over `duration` ms.
 *
 * Returns the current display value (integer).
 *
 * Respects prefers-reduced-motion: when reduced motion is active the hook
 * immediately returns the final value with no animation.
 *
 * Usage:
 *   const displayed = useCountUp(target, { duration: 1200, started: inView });
 *
 * Props:
 *   target   {number}  Final value.
 *   duration {number}  Animation length in ms (default 1400).
 *   started  {boolean} Start trigger — set to true when element enters view.
 *   decimals {number}  Decimal places to show (default 0).
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion.js';

export function useCountUp(target, { duration = 1400, started = false, decimals = 0 } = {}) {
  const reduced    = useReducedMotion();
  const [value, setValue] = useState(0);
  const rafRef     = useRef(null);
  const startRef   = useRef(null);

  useEffect(() => {
    if (!started) return;

    // With reduced motion — jump straight to the target.
    if (reduced) {
      setValue(target);
      return;
    }

    // Easing function: ease-out cubic (fast start, slow end).
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const current = ease(progress) * target;
      setValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);  // ensure we land exactly on the target
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [target, started, duration, decimals, reduced]);

  // If target changes (e.g. late data load), reset.
  useEffect(() => {
    if (!started) setValue(0);
  }, [target, started]);

  return value;
}

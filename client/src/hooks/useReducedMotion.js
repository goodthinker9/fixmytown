/**
 * Returns true when the user has requested reduced motion via the OS or
 * browser "prefers-reduced-motion: reduce" media query.
 *
 * We read it ourselves (not via framer-motion's built-in) so every part of
 * the app — including vanilla CSS transitions we control — can react to it.
 *
 * Usage:
 *   const reduced = useReducedMotion();
 *   const variants = reduced ? noMotionVariants : motionVariants;
 */
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    // Safe SSR guard: matchMedia may not exist.
    if (typeof window === 'undefined') return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(QUERY);
    const handler = (e) => setReduced(e.matches);
    // `addEventListener` on MediaQueryList is the modern API.
    // Safari 13 uses the deprecated `addListener`; we support both.
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } else {
      mql.addListener(handler);
      return () => mql.removeListener(handler);
    }
  }, []);

  return reduced;
}

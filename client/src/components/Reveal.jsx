/**
 * <Reveal> — reusable scroll-triggered fade+slide-up animation.
 *
 * Uses framer-motion's whileInView so the animation fires once when the
 * element enters the viewport, never on page load.
 *
 * Props:
 *   delay   {number}  Optional stagger offset in seconds (default 0).
 *   y       {number}  Distance to slide up in px (default 24).
 *   as      {string}  HTML tag to render (default "div").
 *   className {string}
 *
 * Respects prefers-reduced-motion: when reduced motion is active the
 * component skips the visual transform and just fades in with no movement,
 * shortening duration to 0.15 s.
 *
 * Example:
 *   <Reveal delay={0.1}><StatsCard /></Reveal>
 */
import { motion } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion.js';

export default function Reveal({
  children,
  delay = 0,
  y = 24,
  as: Tag = 'div',
  className = '',
  ...rest
}) {
  const reduced = useReducedMotion();

  const MotionTag = motion[Tag] ?? motion.div;

  const variants = {
    hidden: { opacity: 0, y: reduced ? 0 : y },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduced ? 0.15 : 0.5,
        delay: reduced ? 0 : delay,
        ease: [0.25, 0.46, 0.45, 0.94],  // cubic-bezier "ease-out-quart"
      },
    },
  };

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={variants}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

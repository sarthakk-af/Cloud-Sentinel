import { useEffect, useRef } from 'react';

/**
 * RippleEffect — Creates a ripple expanding from the center of a container.
 * Triggered imperatively by calling the returned `trigger()` function.
 *
 * Usage:
 *   const ripple = useRipple();
 *   <div ref={ripple.ref}> ... </div>
 *   <button onClick={ripple.trigger}>Drop</button>
 */

export function useRipple() {
  const containerRef = useRef(null);
  const rippleRef = useRef(null);

  const trigger = () => {
    const el = containerRef.current;
    if (!el) return;

    // Remove old ripple
    if (rippleRef.current) {
      rippleRef.current.remove();
    }

    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('div');
    ripple.className = 'ripple-wave';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${rect.width / 2 - size / 2}px`;
    ripple.style.top = `${rect.height / 2 - size / 2}px`;

    el.appendChild(ripple);
    rippleRef.current = ripple;

    // Clean up after animation
    setTimeout(() => {
      ripple.remove();
      rippleRef.current = null;
    }, 800);
  };

  return { ref: containerRef, trigger };
}

/**
 * RippleOverlay — Full-screen impact ripple for dramatic file drops.
 * Self-destructs after animation completes.
 */
export function ScreenRipple({ active, onComplete }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      onComplete?.();
    }, 700);
    return () => clearTimeout(timer);
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <div className="screen-ripple" ref={ref}>
      <div className="screen-ripple-ring" />
      <div className="screen-ripple-ring ring-2" />
    </div>
  );
}

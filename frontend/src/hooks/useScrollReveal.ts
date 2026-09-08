import { useEffect } from 'react';

/**
 * Fades and lifts each `<section>` into place as it scrolls into view.
 *
 * The hiding class is added by this effect rather than sitting in the markup, so if the effect never
 * runs — or the browser has no IntersectionObserver — the page renders as plain visible content instead
 * of a blank screen. Sections already on screen at mount are observed too and reveal immediately, which
 * is what makes the first paint animate rather than pop.
 */
export function useScrollReveal() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>('section'));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          // One-way: re-hiding on scroll-up reads as a glitch, not an effect.
          observer.unobserve(entry.target);
        }
      },
      // A little margin so a section is already settled by the time it is properly in view.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    for (const el of targets) {
      el.classList.add('sb-reveal');
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);
}

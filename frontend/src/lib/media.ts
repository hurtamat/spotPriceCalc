// Must match the 900px media queries in the stylesheets and the copy in public/warm.js.
export const MOBILE_QUERY = '(max-width: 900px)';

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

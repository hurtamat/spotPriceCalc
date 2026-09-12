// The SpotSteer mark: an open dial with a single marker sitting in the gap.
// Geometry and both colours are copied verbatim from public/spotsteer-mark.svg
// (ring #1B7EA6 r34 stroke 14 dash "150 64", dot #E8952B r13 at 71,23) so the
// inline version and the asset can never drift apart.
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      className="sb-brand-mark"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="SpotSteer"
    >
      <circle
        cx="50"
        cy="50"
        r="34"
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="14"
        strokeDasharray="150 64"
        strokeLinecap="round"
      />
      <circle cx="71" cy="23" r="13" fill="var(--color-warm)" />
    </svg>
  );
}

// The full lockup, rebuilt in HTML so the wordmark renders in the real Space
// Grotesk webfont. The 700/400 weight split is the logo's own.
export function BrandWord({ size = 21 }: { size?: number }) {
  return (
    <span className="sb-brand" style={{ fontSize: size }}>
      <BrandMark size={size * 1.6} />
      <span>
        <span className="sb-brand-word-a">Spot</span>
        <span className="sb-brand-word-b">Steer</span>
      </span>
    </span>
  );
}

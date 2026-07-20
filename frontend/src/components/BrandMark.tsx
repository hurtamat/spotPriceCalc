// The lightning-bolt logo mark used in the nav and footer.
export function BrandMark({ size = 32, iconSize = 16 }: { size?: number; iconSize?: number }) {
  return (
    <span
      className="sb-brand-mark"
      style={{ width: size, height: size, borderRadius: size < 30 ? 8 : 10 }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
    </span>
  );
}

export function BrandWord({ size = 19 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        fontFamily: 'var(--font-heading)',
        fontWeight: 800,
        fontSize: size,
      }}
    >
      <BrandMark size={size < 19 ? 26 : 32} iconSize={size < 19 ? 13 : 16} />
      Spot<span className="sb-accent">Buddy</span>
    </span>
  );
}

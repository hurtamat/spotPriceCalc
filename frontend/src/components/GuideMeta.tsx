// The strip under both setup-guide headlines, so /shelly and /home-assistant
// open the same way. The first item carries the clock.
type Props = { items: string[] };

export function GuideMeta({ items }: Props) {
  return (
    <div className="sb-guide-meta">
      {items.map((item, i) => (
        <span key={item} className="sb-guide-meta-item">
          {i === 0 && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </svg>
          )}
          {item}
        </span>
      ))}
    </div>
  );
}

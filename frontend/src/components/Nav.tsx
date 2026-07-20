import { BrandMark } from './BrandMark';

const LINKS = [
  { href: '#prices', label: 'Prices' },
  { href: '#how', label: 'How it works' },
  { href: '#devices', label: 'Devices' },
  { href: '#faq', label: 'FAQ' },
];

export function Nav() {
  return (
    <nav className="sb-nav">
      <span className="sb-brand">
        <BrandMark />
        Spot<span className="sb-accent">Buddy</span>
      </span>
      <div className="sb-nav-links">
        {LINKS.map((l) => (
          <a key={l.href} className="sb-link" href={l.href}>
            {l.label}
          </a>
        ))}
        {/* Waitlist wiring comes later. */}
        <button className="sb-btn sb-primary" style={{ padding: '10px 20px', fontSize: 14 }}>
          Join waitlist
        </button>
      </div>
    </nav>
  );
}

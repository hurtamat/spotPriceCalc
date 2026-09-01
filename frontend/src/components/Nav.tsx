import { BrandMark } from './BrandMark';

// Root-relative, not bare fragments: the nav also renders on /home-assistant and /shelly,
// where a bare "#prices" only rewrites the hash and lands on nothing.
const LINKS = [
  { href: '/#prices', label: 'Prices' },
  { href: '/#how', label: 'How it works' },
  { href: '/#devices', label: 'Devices' },
  { href: '/#faq', label: 'FAQ' },
];

export function Nav() {
  return (
    <nav className="sb-nav">
      <a className="sb-brand" href="/">
        <BrandMark />
        Spot<span className="sb-accent">Buddy</span>
      </a>
      <div className="sb-nav-links">
        {LINKS.map((l) => (
          <a key={l.href} className="sb-link" href={l.href}>
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

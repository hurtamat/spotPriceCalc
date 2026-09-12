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
      {/* The bar is fixed and spans the viewport; this wrapper keeps its contents on
          the same 1160px grid as the rest of the page. */}
      <div className="sb-nav-inner">
        <a className="sb-brand" href="/">
          <BrandMark size={34} />
          <span>
            <span className="sb-brand-word-a">Spot</span>
            <span className="sb-brand-word-b">Steer</span>
          </span>
        </a>
        <div className="sb-nav-links">
          {LINKS.map((l) => (
            <a key={l.href} className="sb-link" href={l.href}>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

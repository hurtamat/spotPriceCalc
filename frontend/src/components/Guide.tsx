import type { ReactNode } from 'react';
import { Accordion } from './Accordion';
import { GuideMeta } from './GuideMeta';
import { ArrowLeft, ArrowRight } from './icons';

type HeroProps = {
  logo: string;
  logoAlt: string;
  badge?: string;
  title: string;
  lede: ReactNode;
  meta: string[];
};

export function GuideHero({ logo, logoAlt, badge, title, lede, meta }: HeroProps) {
  return (
    <section className="sb-guide-hero">
      <a className="sb-backlink" href="/#devices">
        <ArrowLeft size={14} />
        Back to supported systems
      </a>
      <div className="sb-guide-brandrow">
        <img className="sb-guide-logo" src={logo} alt={logoAlt} />
        {badge && <span className="sb-guide-pill">{badge}</span>}
      </div>
      <h1 className="sb-display sb-guide-h1">{title}</h1>
      <p className="sb-lede sb-guide-lede">{lede}</p>
      <GuideMeta items={meta} />
    </section>
  );
}

export function GuideTroubleshooting({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <section id="troubleshooting" className="sb-guide-section">
      <h2 className="sb-h2 sb-guide-h2">Troubleshooting</h2>
      <Accordion items={items} variant="guide" />
    </section>
  );
}

type NextLink = { href: string; kicker: string; title: string; body: string };

export function GuideNext({ links }: { links: NextLink[] }) {
  return (
    <section className="sb-guide-section">
      <div className="sb-guide-close">
        {links.map((l) => (
          <a key={l.href} className="sb-card sb-guide-close-card" href={l.href}>
            <span className="sb-guide-close-kicker">{l.kicker}</span>
            <span className="sb-guide-close-title">
              {l.title} <ArrowRight size={17} />
            </span>
            <span className="sb-guide-close-body">{l.body}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
